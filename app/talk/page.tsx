"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic } from "lucide-react";
import Navbar from "@/components/Navbar";
import { analyzeConversation } from "@/lib/analysis";
import {
  saveCheckin,
  saveLastMentalState,
  generateId,
  getTodayDate,
  type Message,
} from "@/lib/store";
import { useRouter } from "next/navigation";
import {
  getActiveCareRecipient,
  getCareEvents,
  getCaregiverProfile,
  saveWorkflowResult,
  type CareRecipient,
  type CareWorkflowResult,
  type CaregiverProfile,
} from "@/lib/care";
import { buildCareWorkflow } from "@/lib/care-workflows";
import { logDevelopmentTiming, perfStart } from "@/lib/performance";

function sanitize(text: string): string {
  return text.replace(/\s*[\u2013\u2014]\s*/g, ", ").trim();
}

const ZBI_LABELS = ["Never", "Rarely", "Sometimes", "Frequently", "Nearly Always"];

function parseZbiTag(content: string): { clean: string; qIndex: number | null } {
  const match = content.match(/\[ZBI_Q(\d+)\]/);
  if (!match) return { clean: sanitize(content), qIndex: null };

  return {
    clean: sanitize(content.replace(/\[ZBI_Q\d+\]/, "").trim()),
    qIndex: parseInt(match[1], 10) - 1,
  };
}

export default function TalkPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "I'm here whenever you're ready. How are you doing today?",
      timestamp: 0,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => generateId());
  const [crisisTriggered, setCrisisTriggered] = useState(false);
  const [zbiAnswers, setZbiAnswers] = useState<number[]>([]);
  const [pendingZbiQ, setPendingZbiQ] = useState<number>(-1);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [caregiver, setCaregiver] = useState<CaregiverProfile | null>(null);
  const [recipient, setRecipient] = useState<CareRecipient | null>(null);
  const [requestError, setRequestError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCaregiver(getCaregiverProfile());
      setRecipient(getActiveCareRecipient());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (messages.length === 1 && pendingZbiQ < 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingZbiQ]);

  const canSend =
    pendingZbiQ >= 0
      ? selectedRating !== null && input.trim().length > 0
      : input.trim().length > 0;

  async function callApiAndStream(
    newMessages: Message[],
    updatedZbiAnswers: number[],
    caregiverText: string
  ) {
    const analysis = analyzeConversation(newMessages, updatedZbiAnswers);
    setRequestError("");

    saveLastMentalState(analysis.mentalState);

    if (analysis.riskLevel === "crisis") {
      setCrisisTriggered(true);
    }

    saveCheckin({
      id: sessionId,
      date: getTodayDate(),
      timestamp: Date.now(),
      messages: newMessages,
      zbiAnswers: updatedZbiAnswers,
      mentalState: analysis.mentalState,
      zbiEstimate: analysis.zbiEstimate,
      resonanceScore: analysis.resonanceScore,
      emotions: analysis.emotions,
      riskLevel: analysis.riskLevel,
    });

    let workflow: CareWorkflowResult | null = null;
    const workflowStartedAt = perfStart();
    try {
      workflow = buildCareWorkflow({
        message: caregiverText,
        recipient,
        recentEvents: getCareEvents().slice(0, 20),
        zipCode: caregiver?.zipCode,
        caregiverName: caregiver?.displayName,
      });
      if (workflow) saveWorkflowResult(workflow);
    } catch {
      workflow = null;
    }
    logDevelopmentTiming("talk.workflow", workflowStartedAt);

    const chatStartedAt = perfStart();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        context: {
          zbiAnswers: updatedZbiAnswers,
          riskLevel: analysis.riskLevel,
          dominantThemes: analysis.dominantThemes,
          caregiver,
          recipient,
          workflow,
        },
      }),
    });

    if (!res.ok || !res.body) {
      setLoading(false);
      setRequestError(
        "The companion could not respond. Your care note and next steps were still saved."
      );
      return;
    }
    logDevelopmentTiming("talk.chat-response", chatStartedAt);

    const assistantMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMsg]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let receivedFirstChunk = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!receivedFirstChunk) {
        receivedFirstChunk = true;
        logDevelopmentTiming("talk.first-token", chatStartedAt);
      }

      full += decoder.decode(value, { stream: true });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: sanitize(full) } : m
        )
      );
    }

    setLoading(false);
    logDevelopmentTiming("talk.stream-complete", chatStartedAt);

    const { qIndex } = parseZbiTag(full);

    if (qIndex !== null && qIndex === updatedZbiAnswers.length) {
      setPendingZbiQ(qIndex);
      setSelectedRating(null);
    }

    const finalMessages = [
      ...newMessages,
      { ...assistantMsg, content: sanitize(full) },
    ];

    saveCheckin({
      id: sessionId,
      date: getTodayDate(),
      timestamp: Date.now(),
      messages: finalMessages,
      zbiAnswers: updatedZbiAnswers,
      mentalState: analysis.mentalState,
      zbiEstimate: analysis.zbiEstimate,
      resonanceScore: analysis.resonanceScore,
      emotions: analysis.emotions,
      riskLevel: analysis.riskLevel,
    });
  }

  async function sendMessage() {
    if (!canSend || loading) return;

    const text = input.trim();

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content:
        pendingZbiQ >= 0
          ? `[Rating: ${selectedRating} - ${ZBI_LABELS[selectedRating!]}] ${text}`
          : text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    let updatedZbiAnswers = [...zbiAnswers];

    if (pendingZbiQ >= 0 && selectedRating !== null) {
      updatedZbiAnswers = [...zbiAnswers, selectedRating];
      setZbiAnswers(updatedZbiAnswers);
      setPendingZbiQ(-1);
      setSelectedRating(null);
    }

    try {
      await callApiAndStream(newMessages, updatedZbiAnswers, text);
    } catch {
      setLoading(false);
      setRequestError(
        "The companion could not respond. Please check your connection and try again."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#090d15] flex flex-col">
      <Navbar />

      <div className="talk-progress">
        {zbiAnswers.length < 12 ? (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i < zbiAnswers.length ? 8 : 6,
                  height: i < zbiAnswers.length ? 8 : 6,
                  backgroundColor:
                    i < zbiAnswers.length ? "#F2D461" : "rgba(0,29,33,0.28)",
                }}
              />
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-[#B2AC88] tracking-widest uppercase">
            Complete
          </span>
        )}
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 pb-44 pt-28 max-[700px]:pt-20">
        <div className="flex-1 flex flex-col gap-4 py-4">
          {messages.map((msg) => {
            const { clean, qIndex } = parseZbiTag(msg.content);
            const isActiveZbiMsg =
              qIndex !== null && qIndex === pendingZbiQ && msg.role === "assistant";

            const displayContent =
              msg.role === "user"
                ? clean.replace(/^\[Rating: \d+ - [^\]]+\]\s*/, "")
                : clean;

            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                  } gap-3`}
                style={{ animation: "fadeUp 0.3s ease-out forwards" }}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-[#B2AC88]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-3 h-3 rounded-full bg-[#B2AC88]/60" />
                  </div>
                )}

                <div
                  className={`flex flex-col gap-3 ${msg.role === "user" ? "items-end" : "items-start"
                    } max-w-sm`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-[#1C3A5E] text-[#E8E4D8] rounded-tr-sm"
                      : "bg-[#111827] text-[#D4CEBD] border border-[#B2AC88]/10 rounded-tl-sm"
                      }`}
                  >
                    {displayContent ||
                      (msg.role === "assistant" && (
                        <span className="inline-flex gap-1 py-0.5">
                          <span
                            className="w-1.5 h-1.5 bg-[#B2AC88] rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-[#B2AC88] rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-[#B2AC88] rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </span>
                      ))}
                  </div>

                  {isActiveZbiMsg && (
                    <div className="flex flex-col gap-2 w-full">
                      <p className="text-xs text-[#A09890]">
                        How often do you feel this way?
                      </p>

                      <div className="flex gap-1.5">
                        {ZBI_LABELS.map((label, val) => (
                          <button
                            key={val}
                            onClick={() => setSelectedRating(val)}
                            disabled={loading}
                            className={`zbi-rating flex flex-1 flex-col items-center px-2 py-2 text-xs ${
                              selectedRating === val ? "is-selected" : ""
                            }`}
                          >
                            <span
                              className="text-base font-light"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {val}
                            </span>
                            <span className="text-[9px] mt-0.5 text-center leading-tight">
                              {label}
                            </span>
                          </button>
                        ))}
                      </div>

                      {selectedRating !== null && (
                        <p className="text-xs text-[#B2AC88]/60">
                          Selected: <strong>{ZBI_LABELS[selectedRating]}</strong>.
                          {" "}Now share a few words below, then send.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}


          {requestError && (
            <p className="ml-11 rounded-xl border border-[#8B5A5A]/30 bg-[#8B5A5A]/10 px-3 py-2 text-xs text-[#D4CEBD]">
              {requestError}
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {crisisTriggered && (
        <div className="crisis-banner fixed left-0 right-0 z-50 px-4">
          <div className="max-w-4xl mx-auto bg-[#1A0D0D] border border-[#8B5A5A]/50 rounded-2xl p-4">
            <p className="text-[#F5F0E8] text-xs font-medium mb-3">
              If you or someone is in immediate danger, please reach out now:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:988"
                className="flex justify-between items-center py-2 px-3 rounded-xl bg-[#8B5A5A]/20 hover:bg-[#8B5A5A]/30 transition-all"
              >
                <span className="text-[#D4CEBD] text-xs">Crisis Lifeline</span>
                <span className="text-[#B2AC88] text-xs font-medium">988</span>
              </a>

              <a
                href="sms:741741"
                className="flex justify-between items-center py-2 px-3 rounded-xl bg-[#8B5A5A]/20 hover:bg-[#8B5A5A]/30 transition-all"
              >
                <span className="text-[#D4CEBD] text-xs">Crisis Text</span>
                <span className="text-[#B2AC88] text-xs font-medium">741741</span>
              </a>

              <a
                href="tel:18552273640"
                className="flex justify-between items-center py-2 px-3 rounded-xl bg-[#8B5A5A]/20 hover:bg-[#8B5A5A]/30 transition-all"
              >
                <span className="text-[#D4CEBD] text-xs">Caregiver Crisis</span>
                <span className="text-[#B2AC88] text-xs font-medium">
                  1-855-227-3640
                </span>
              </a>

              <a
                href="tel:911"
                className="flex justify-between items-center py-2 px-3 rounded-xl bg-[#8B5A5A]/20 hover:bg-[#8B5A5A]/30 transition-all"
              >
                <span className="text-[#D4CEBD] text-xs">Emergency</span>
                <span className="text-[#B2AC88] text-xs font-medium">911</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="talk-composer">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {pendingZbiQ >= 0 && (
            <p className="text-xs text-center text-[#A09890]">
              {selectedRating === null
                ? "Select a rating above, then share your thoughts"
                : "Add a few words, then press send"}
            </p>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              maxLength={6000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                pendingZbiQ >= 0 && selectedRating === null
                    ? "Select a rating first..."
                    : "Share what's on your mind..."
              }
              disabled={loading || (pendingZbiQ >= 0 && selectedRating === null)}
              className="flex-1 bg-[#111827] border border-white/10 rounded-2xl px-5 py-3.5 text-[#F5F0E8] placeholder-[#A09890] text-sm outline-none focus:border-[#B2AC88]/40 transition-all disabled:opacity-40"
            />

            <button
              onClick={() => router.push("/talk/voice")}
              className="talk-record-button"
              type="button"
              aria-label="Open two minute voice check in"
            >
              <Mic size={17} />
            </button>

            <button
              onClick={sendMessage}
              disabled={!canSend || loading}
              className="talk-send-button"
              type="button"
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
