"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

const DISMISS_KEY = "ip-pwa-install-dismissed";
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1_000;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function recentlyDismissed(): boolean {
  const dismissedAt = Number.parseInt(
    window.localStorage.getItem(DISMISS_KEY) ?? "0",
    10
  );
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const visible = Boolean(installEvent || showIosHelp);

  useEffect(() => {
    if (
      window.Capacitor?.isNativePlatform?.() ||
      navigator.userAgent.includes("Invizy/") ||
      navigator.userAgent.includes("InvisiblePatient/")
    ) {
      return;
    }

    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        }).catch(() => undefined);
      };
      window.addEventListener("load", register, { once: true });
      if (document.readyState === "complete") register();
    }

    if (
      isStandalone() ||
      recentlyDismissed()
    ) {
      return;
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setShowIosHelp(false);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const iosTimer = isIos
      ? window.setTimeout(() => setShowIosHelp(true), 1_500)
      : null;

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (iosTimer !== null) window.clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setInstallEvent(null);
    setShowIosHelp(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <aside className="pwa-install-card" aria-label="Install Invizy">
      <button
        type="button"
        className="pwa-install-close"
        onClick={dismiss}
        aria-label="Dismiss install option"
      >
        <X size={16} />
      </button>
      <div className="pwa-install-icon" aria-hidden="true">
        {showIosHelp ? <Share size={20} /> : <Download size={20} />}
      </div>
      <div className="pwa-install-copy">
        <strong>Keep Invizy on your phone</strong>
        <span>
          {showIosHelp
            ? "Tap Share in Safari, then Add to Home Screen."
            : "Install the app for quicker, full screen access."}
        </span>
      </div>
      {showIosHelp ? (
        <button type="button" className="pwa-install-action" onClick={dismiss}>
          Got it
        </button>
      ) : (
        <button type="button" className="pwa-install-action" onClick={install}>
          Install
        </button>
      )}
    </aside>
  );
}
