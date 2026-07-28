"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import ResonanceBattery from "@/components/ResonanceBattery";
import ResonanceChart from "@/components/ResonanceChart";
import {
  getLast7DaysCheckins,
  getLatestCheckin,
  getLatestZbiCheckin,
  type CheckinEntry,
} from "@/lib/store";

export default function InsightsPage() {
  const [latest, setLatest] = useState<CheckinEntry | null>(null);
  const [latestZbi, setLatestZbi] = useState<CheckinEntry | null>(null);
  const [week, setWeek] = useState<CheckinEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLatest(getLatestCheckin());
      setLatestZbi(getLatestZbiCheckin());
      setWeek(getLast7DaysCheckins());
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#090d15] px-4 pb-12 pt-24">
      <Navbar />
      <div className="mx-auto max-w-4xl">
        <div
          className="mb-8"
          style={{ animation: "fadeUp 0.6s ease-out forwards", opacity: 0 }}
        >
          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="text-4xl font-semibold tracking-tight text-[#F5F0E8]"
          >
            The Quiet Picture
          </h1>
        </div>

        {latest ? (
          <div className="flex flex-col gap-4">
            <div className="ip-connected-pair">
              <div className="ip-panel rounded-2xl border border-[#B2AC88]/10 bg-[#111827] p-6">
                <p className="mb-3 text-xs uppercase tracking-widest text-[#A09890]">
                  ZBI Caregiver Strain Check In
                </p>
                <p
                  style={{ fontFamily: "var(--font-display)", color: "#F2D461" }}
                  className="mb-2 text-5xl font-light"
                >
                  {Math.round((latestZbi ?? latest).zbiEstimate)}
                  <span className="text-xl text-[#A09890]">/48</span>
                </p>
                <p className="mb-4 text-xs text-[#A09890]">
                  {((latestZbi ?? latest).zbiAnswers ?? []).length < 12
                    ? `Based on ${((latestZbi ?? latest).zbiAnswers ?? []).length} of 12 questions`
                    : "All 12 questions answered"}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${((latestZbi ?? latest).zbiEstimate / 48) * 100}%`,
                      backgroundColor:
                        (latestZbi ?? latest).zbiEstimate >= 36
                          ? "#C99724"
                          : (latestZbi ?? latest).zbiEstimate >= 24
                            ? "#DDBB43"
                            : "#F2D461",
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[#A09890]/60">
                  <span>Lower strain</span>
                  <span>Higher strain</span>
                </div>
              </div>

              <div className="ip-panel flex flex-col items-center rounded-2xl border border-[#B2AC88]/10 bg-[#111827] p-6">
                <p className="mb-4 self-start text-xs uppercase tracking-widest text-[#A09890]">
                  Resonance Score
                </p>
                <ResonanceBattery value={latest.resonanceScore ?? 50} />
              </div>
            </div>

            <div className="ip-panel rounded-2xl border border-[#B2AC88]/10 bg-[#111827] p-6">
              <p className="mb-4 text-xs uppercase tracking-widest text-[#A09890]">
                Resonance (Last 7 Days)
              </p>
              <ResonanceChart checkins={week} />
            </div>

            <div className="ip-panel flex items-start gap-4 rounded-2xl border border-[#B2AC88]/10 bg-[#111827] p-5">
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B2AC88]/10">
                <Shield size={18} className="text-[#B2AC88]" />
              </div>
              {latest.riskLevel === "crisis" ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-[#F5F0E8]">
                    Please Reach Out Now
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <a href="tel:988" className="text-xs text-[#B2AC88] hover:underline">
                      988, Suicide & Crisis Lifeline (24/7)
                    </a>
                    <a
                      href="sms:741741"
                      className="text-xs text-[#B2AC88] hover:underline"
                    >
                      Text HOME to 741741, Crisis Text Line
                    </a>
                    <a href="tel:911" className="text-xs text-[#B2AC88] hover:underline">
                      911, Emergency Services
                    </a>
                  </div>
                </div>
              ) : latest.riskLevel === "high" ? (
                <div>
                  <p className="mb-1 text-sm font-medium text-[#F5F0E8]">
                    Increased Strain
                  </p>
                  <p className="text-xs text-[#A09890]">
                    Your answers suggest increased strain; would you like to review
                    your support options in the Care workspace?
                  </p>
                </div>
              ) : latest.riskLevel === "moderate" ? (
                <div>
                  <p className="mb-1 text-sm font-medium text-[#F5F0E8]">
                    Some Strain
                  </p>
                  <p className="text-xs text-[#A09890]">
                    Keep checking in. Patterns become clearer over time.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-sm font-medium text-[#F5F0E8]">
                    You&apos;re Holding Steady
                  </p>
                  <p className="text-xs text-[#A09890]">
                    No immediate crisis signal. Keep checking in; your words matter.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : loaded ? (
          <div className="py-20 text-center text-[#A09890]">
            <p className="mb-2">No check ins yet.</p>
            <a href="/talk" className="text-sm text-[#B2AC88] hover:underline">
              Start your first conversation
            </a>
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-[#A09890]">
            Loading your insights...
          </div>
        )}
      </div>
    </main>
  );
}
