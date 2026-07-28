"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Database, RefreshCw } from "lucide-react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import {
  clearAccountCache,
  hydrateAccountData,
} from "@/lib/cloud-sync";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function doesNotNeedHydration(pathname: string): boolean {
  return pathname.startsWith("/auth") || pathname === "/setup";
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

  const hydrate = useCallback(async () => {
    if (doesNotNeedHydration(pathname) || !isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    setReady(false);
    setError("");
    try {
      const result = await hydrateAccountData();
      if (!result.hasProfile) {
        router.replace("/setup");
        return;
      }
      setReady(true);
    } catch {
      setError(
        "Your private records could not be loaded. Check the database setup and try again."
      );
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
          <Database size={24} />
          <h1>We could not load your workspace</h1>
          <p>{error}</p>
          <button type="button" onClick={() => void hydrate()}>
            <RefreshCw size={15} />
            Try again
          </button>
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
