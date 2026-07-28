"use client";

import { clearAccountCache } from "./cloud-sync";
import { createClient } from "./supabase/client";
import { getSupabaseConfig } from "./supabase/config";

const SIGN_OUT_TIMEOUT_MS = 5000;

function clearSupabaseAuthCookies(): void {
  if (typeof document === "undefined") return;

  try {
    const { url } = getSupabaseConfig();
    const projectRef = new URL(url).hostname.split(".")[0];
    const authCookiePrefix = `sb-${projectRef}-auth-token`;

    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (!name?.startsWith(authCookiePrefix)) return;

      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
    });
  } catch {
    // The account cache and redirect still provide a safe local sign out.
  }
}

export async function signOutCurrentDevice(): Promise<void> {
  clearAccountCache();

  try {
    await Promise.race([
      createClient().auth.signOut({ scope: "local" }),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, SIGN_OUT_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // A network failure should never trap someone inside the signing out state.
  }

  clearSupabaseAuthCookies();
  window.location.replace("/auth");
}
