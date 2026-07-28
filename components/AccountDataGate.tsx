"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CloudOff, LogOut, RefreshCw } from "lucide-react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import {
  AccountAuthenticationRequiredError,
  clearAccountCache,
  hydrateAccountData,
} from "@/lib/cloud-sync";
import { signOutCurrentDevice } from "@/lib/sign-out";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const HYDRATION_RETRY_DELAYS = [250, 700];

function doesNotNeedHydration(pathname: string): boolean {
  return (
    pathname.startsWith("/auth") ||
    pathname === "/setup" ||
    pathname === "/privacy" ||
    pathname === "/terms"
  );
}

export default function AccountDataGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(doesNotNeedHydration(pathname));
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const hydrated = useRef(false);
  const hydrating = useRef(false);

  const hydrate = useCallback(async () => {
    if (doesNotNeedHydration(pathname) || !isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    if (hydrated.current) {
      setReady(true);
      return;
    }
    if (hydrating.current) return;

    hydrating.current = true;
    setReady(false);
    setError("");
    for (let attempt = 0; attempt <= HYDRATION_RETRY_DELAYS.length; attempt += 1) {
      try {
        const result = await hydrateAccountData();
        if (!result.hasProfile) {
          hydrating.current = false;
          router.replace("/setup");
          return;
        }
        hydrated.current = true;
        hydrating.current = false;
        setReady(true);
        return;
      } catch (hydrationError) {
        if (hydrationError instanceof AccountAuthenticationRequiredError) {
          clearAccountCache();
          hydrating.current = false;
          router.replace("/auth");
          return;
        }

        const retryDelay = HYDRATION_RETRY_DELAYS[attempt];
        if (retryDelay) {
          await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
          continue;
        }

        setError(
          "We could not open your account just now. Your information is still safe."
        );
        hydrating.current = false;
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void hydrate(), 0);
    return () => window.clearTimeout(timer);
  }, [hydrate]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        hydrated.current = false;
        hydrating.current = false;
        clearAccountCache();
        router.replace("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (error) {
    return (
      <main className="data-gate-page">
        <div className="data-gate-card">
          <CloudOff size={24} />
          <h1>Let&apos;s try that again</h1>
          <p>{error}</p>
          <div className="data-gate-actions">
            <button type="button" onClick={() => void hydrate()}>
              <RefreshCw size={15} />
              Try again
            </button>
            <button
              className="data-gate-secondary"
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOutCurrentDevice();
              }}
            >
              <LogOut size={15} />
              {signingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="data-gate-page">
        <div className="data-gate-loading" aria-label="Loading your workspace">
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  }

  return children;
}
