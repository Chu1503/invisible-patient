"use client";
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import { analyzeConversation } from "@/lib/analysis";
import { saveCheckin, saveLastMentalState, generateId, getTodayDate, type Message } from "@/lib/store";

const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  content: "I'm here whenever you're ready. How are you doing today?",
  timestamp: Date.now(),
};

function sanitize(text: string): string {
  return text
    .replace(/—/g, ",")
    .replace(/–/g, ",")
    .trim();
}

const ZBI_LABELS = ["Never", "Rarely", "Sometimes", "Frequently", "Nearly Always"];

function parseZbiTag(content: string): { clean: string; qIndex: number | null } {
  const match = content.match(/\[ZBI_Q(\d+)\]/);
  if (!match) return { clean: sanitize(content), qIndex: null };
  return {
    clean: sanitize(content.replace(/\[ZBI_Q\d+\]/, "").trim()),
    qIndex: parseInt(match[1]) - 1,
  };
}

export default function TalkPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(generateId);
  const [showCrisis, setShowCrisis] = useState(false);
  const [zbiAnswers, setZbiAnswers] = useState<number[]>([]);
  const [pendingZbiQ, setPendingZbiQ] = useState<number>(-1);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingZbiQ]);

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    if (pendingZbiQ >= 0 && selectedRating === null) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: text,
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

    await callApiAndStream(newMessages, updatedZbiAnswers);
  }

  async function sendMessageWithRating(rating: number, currentMessages: Message[], currentZbiAnswers: number[]) {
    if (loading) return;

    const text = ZBI_LABELS[rating];
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const newMessages = [...currentMessages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const updatedZbiAnswers = [...currentZbiAnswers, rating];
    setZbiAnswers(updatedZbiAnswers);
    setPendingZbiQ(-1);
    setSelectedRating(null);

    await callApiAndStream(newMessages, updatedZbiAnswers);
  }

  async function callApiAndStream(newMessages: Message[], updatedZbiAnswers: number[]) {
    const analysis = analyzeConversation(newMessages, updatedZbiAnswers);
    saveLastMentalState(analysis.mentalState);
    if (analysis.riskLevel === "crisis") setShowCrisis(true);

    saveCheckin({
      id: sessionId,
      date: getTodayDate(),
      timestamp: Date.now(),
      messages: newMessages,
      zbiAnswers: updatedZbiAnswers,
      mentalState: analysis.mentalState,
      zbiEstimate: analysis.zbiEstimate,
      emotions: analysis.emotions,
      riskLevel: analysis.riskLevel,
    });

    const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: apiMessages,
        context: {
          zbiAnswers: updatedZbiAnswers,
          riskLevel: analysis.riskLevel,
          dominantThemes: analysis.dominantThemes,
        },
      }),
    });

    if (!res.body) { setLoading(false); return; }

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
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: sanitize(full) } : m))
      );
    }

    setLoading(false);

    const { qIndex } = parseZbiTag(full);
    if (qIndex !== null && qIndex === updatedZbiAnswers.length) {
      setPendingZbiQ(qIndex);
      setSelectedRating(null);
    }

    const finalMessages = [...newMessages, { ...assistantMsg, content: sanitize(full) }];
    saveCheckin({
      id: sessionId,
      date: getTodayDate(),
      timestamp: Date.now(),
      messages: finalMessages,
      zbiAnswers: updatedZbiAnswers,
      mentalState: analysis.mentalState,
      zbiEstimate: analysis.zbiEstimate,
      emotions: analysis.emotions,
      riskLevel: analysis.riskLevel,
    });
  }

  function handleRatingSelect(val: number) {
    setSelectedRating(val);
    // Pass current state directly to avoid stale closure issues
    sendMessageWithRating(val, messages, zbiAnswers);
  }

  return (
    <main className="min-h-screen bg-[#090d15] flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-20 pb-36 px-4">
        <p className="text-center text-xs tracking-[0.2em] text-[#A09890] uppercase py-4">
          Safe Space — Everything shared is private
        </p>

        <div className="flex-1 flex flex-col gap-4 py-4">
          {messages.map((msg) => {
            const { clean, qIndex } = parseZbiTag(msg.content);
            const isActiveZbiMsg = qIndex !== null && qIndex === pendingZbiQ && msg.role === "assistant";

            return (
              <div key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}
                style={{ animation: "fadeUp 0.3s ease-out forwards" }}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-[#B2AC88]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-3 h-3 rounded-full bg-[#B2AC88]/60" />
                  </div>
                )}
                <div className="flex flex-col gap-3 max-w-sm">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#163054] text-[#F5F0E8]"
                      : "bg-[#0D2137] text-[#D4CEBD] border border-white/5"
                  }`}>
                    {clean || (
                      msg.role === "assistant" && (
                        <span className="inline-flex gap-1">
                          <span className="w-1 h-1 bg-[#B2AC88] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-1 bg-[#B2AC88] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-1 bg-[#B2AC88] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      )
                    )}
                  </div>

                  {isActiveZbiMsg && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-[#A09890] pl-1">
                        Choose how often you feel this way:
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {ZBI_LABELS.map((label, val) => (
                          <button key={val}
                            onClick={() => handleRatingSelect(val)}
                            disabled={loading}
                            className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs transition-all duration-200 border flex-1 min-w-[52px] ${
                              selectedRating === val
                                ? "bg-[#B2AC88]/25 border-[#B2AC88]/60 text-[#F5F0E8]"
                                : "border-white/10 text-[#A09890] hover:border-white/25 hover:text-[#D4CEBD]"
                            }`}>
                            <span className="text-base font-light" style={{ fontFamily: "var(--font-display)" }}>{val}</span>
                            <span className="text-[10px] mt-0.5 text-center leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {zbiAnswers.length > 0 && (
        <div className="fixed top-16 left-0 right-0 h-0.5 bg-white/5">
          <div
            className="h-full bg-[#B2AC88]/50 transition-all duration-500"
            style={{ width: `${(zbiAnswers.length / 12) * 100}%` }}
          />
        </div>
      )}

      {showCrisis && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4">
          <div className="bg-[#1A0D0D] border border-[#8B5A5A]/40 rounded-2xl p-4 text-sm">
            <p className="text-[#D4CEBD] mb-3">You don't have to carry this alone.</p>
            <a href="tel:18884436933"
              className="block text-center py-2 px-4 rounded-lg bg-[#8B5A5A]/20 text-[#D4CEBD] hover:bg-[#8B5A5A]/30 transition-all text-xs">
              Caregiver Helpline: 1-888-443-6933
            </a>
            <button onClick={() => setShowCrisis(false)} className="w-full text-xs text-[#A09890] hover:text-[#D4CEBD] transition-colors mt-2">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-[#090d15] via-[#090d15] to-transparent">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {pendingZbiQ >= 0 && (
            <p className="text-xs text-center text-[#A09890]">
              Select a rating above to continue
            </p>
          )}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (pendingZbiQ < 0) sendMessage();
                }
              }}
              placeholder="Share what's on your mind..."
              disabled={pendingZbiQ >= 0}
              className="flex-1 bg-[#0D2137] border border-white/10 rounded-2xl px-5 py-3.5 text-[#F5F0E8] placeholder-[#A09890] text-sm outline-none focus:border-[#B2AC88]/40 transition-all disabled:opacity-40"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || pendingZbiQ >= 0 || !input.trim()}
              className="w-12 h-12 rounded-2xl bg-[#B2AC88]/20 hover:bg-[#B2AC88]/30 disabled:opacity-40 transition-all flex items-center justify-center text-[#B2AC88]">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}