"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Aura from "@/components/Aura";
import { ensureProfile, getLastMentalState, type MentalState } from "@/lib/store";
import { getCaregiverProfile } from "@/lib/care";

export default function HomePage() {
  const [username, setUsername] = useState("CAREGIVER");
  const [state, setState] = useState<MentalState>("restless");
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const profile = ensureProfile();
      const caregiver = getCaregiverProfile();
      setUsername(caregiver?.displayName || profile.username);
      setState(getLastMentalState());
      const h = new Date().getHours();
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="ip-home-page">
      <Navbar />
      <div className="ip-home-stage">
        <div className="ip-home-shell">
          <section
            className="ip-home-hero"
            aria-label="Your current check in visual"
            style={{ animation: "fadeUp 0.5s ease-out forwards", opacity: 0 }}
          >
            <p className="ip-home-greeting">
              {greeting}, {username}
            </p>
            <h1 className="ip-home-title">How are you, really?</h1>
            <div className="ip-home-aura">
              <Aura state={state} />
            </div>
            <Link href="/talk" className="ip-home-talk-link">
              Start talking
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
