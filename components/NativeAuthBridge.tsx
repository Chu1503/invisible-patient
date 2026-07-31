"use client";

import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { INPUT_LIMITS, sanitizePlainText } from "@/lib/input";
import { isNativeAuthCallback } from "@/lib/native-auth";
import { createClient } from "@/lib/supabase/client";

function authErrorUrl(message: string): string {
  const params = new URLSearchParams({ error: message });
  return `/auth?${params.toString()}`;
}

export default function NativeAuthBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let handlingCallback = false;

    async function handleCallback(event: URLOpenListenerEvent) {
      if (
        !active ||
        handlingCallback ||
        !isNativeAuthCallback(event.url)
      ) {
        return;
      }

      handlingCallback = true;
      await Browser.close().catch(() => undefined);

      const callbackUrl = new URL(event.url);
      const providerError = callbackUrl.searchParams.get("error_description");
      const code = callbackUrl.searchParams.get("code");

      if (providerError || !code) {
        window.location.replace(
          authErrorUrl(
            sanitizePlainText(
              providerError || "This sign in link is invalid or expired.",
              INPUT_LIMITS.profileFieldChars
            )
          )
        );
        return;
      }

      const { error } = await createClient().auth.exchangeCodeForSession(code);
      if (!active) return;

      if (error) {
        window.location.replace(
          authErrorUrl("We could not verify that sign in. Please try again.")
        );
        return;
      }

      window.location.replace("/");
    }

    let removeListener: (() => Promise<void>) | undefined;
    void App.addListener("appUrlOpen", handleCallback).then((listener) => {
      removeListener = () => listener.remove();
    });
    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleCallback({ url: launch.url });
    });

    return () => {
      active = false;
      void removeListener?.();
    };
  }, []);

  return null;
}
