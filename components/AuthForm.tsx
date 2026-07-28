"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
    >
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.584-5.037-3.711H.956v2.332A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.963 10.709A5.41 5.41 0 0 1 3.681 9c0-.593.102-1.169.282-1.709V4.959H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.041l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.959l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthForm({
  initialError = "",
  configurationMissing = false,
}: {
  initialError?: string;
  configurationMissing?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialError);
  const submissionInFlight = useRef(false);

  const unavailable = configurationMissing || !isSupabaseConfigured();

  async function continueWithGoogle() {
    if (unavailable || submissionInFlight.current) return;

    submissionInFlight.current = true;
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        setMessage("Google sign-in could not start. Please try again.");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setMessage(
        "We could not reach the account service. Check your connection and try again."
      );
    } finally {
      setLoading(false);
      submissionInFlight.current = false;
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="ip-brand-mark" aria-hidden="true" />
        <span>The Invisible Patient</span>
      </div>

      <div className="auth-heading">
        <h1>Welcome</h1>
      </div>

      {unavailable && (
        <div className="auth-notice is-error">
          Supabase has not been connected yet. Add the two public Supabase
          environment variables to run account authentication.
        </div>
      )}

      {message && (
        <div
          className="auth-notice is-error"
          role="alert"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      <button
        type="button"
        className="auth-submit auth-google-submit"
        onClick={() => void continueWithGoogle()}
        disabled={unavailable || loading}
      >
        {!loading && <GoogleMark />}
        {loading ? "Connecting..." : "Continue with Google"}
      </button>
    </div>
  );
}
