"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AuthMode = "sign-in" | "sign-up" | "reset";

export default function AuthForm({
  initialError = "",
  configurationMissing = false,
  nextPath = "/",
}: {
  initialError?: string;
  configurationMissing?: boolean;
  nextPath?: string;
}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [isError, setIsError] = useState(Boolean(initialError));

  const unavailable = configurationMissing || !isSupabaseConfigured();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable) return;

    setLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createClient();
    const redirectTarget = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      mode === "sign-up" ? "/setup" : nextPath
    )}`;

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });
      setLoading(false);
      if (error) {
        setIsError(true);
        setMessage(error.message);
        return;
      }
      setMessage("Check your email for a secure password-reset link.");
      return;
    }

    if (mode === "sign-up") {
      if (password.length < 10) {
        setLoading(false);
        setIsError(true);
        setMessage("Use at least 10 characters for your password.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectTarget },
      });
      setLoading(false);

      if (error) {
        setIsError(true);
        setMessage(error.message);
        return;
      }

      if (data.session) {
        window.location.assign("/setup");
        return;
      }

      setMessage(
        "Account created. Check your email to verify it, then finish your setup."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      setIsError(true);
      setMessage("We could not sign you in with those details.");
      return;
    }

    window.location.assign(nextPath);
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="ip-brand-mark" aria-hidden="true" />
        <span>The Invisible Patient</span>
      </div>

      <div className="auth-heading">
        <p>Private caregiver support</p>
        <h1>
          {mode === "sign-up"
            ? "Create your account"
            : mode === "reset"
              ? "Reset your password"
              : "Welcome back"}
        </h1>
        <span>
          {mode === "sign-up"
            ? "Your care information stays connected to your account."
            : mode === "reset"
              ? "We will email you a secure reset link."
              : "Continue to your private caregiver workspace."}
        </span>
      </div>

      {unavailable && (
        <div className="auth-notice is-error">
          Supabase has not been connected yet. Add the two public Supabase
          environment variables to run account authentication.
        </div>
      )}

      {message && (
        <div className={`auth-notice ${isError ? "is-error" : ""}`}>
          {message}
        </div>
      )}

      <form onSubmit={submit} className="auth-form">
        <label>
          <span>Email address</span>
          <div className="auth-input-wrap">
            <Mail size={16} aria-hidden="true" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={unavailable || loading}
            />
          </div>
        </label>

        {mode !== "reset" && (
          <label>
            <span>Password</span>
            <div className="auth-input-wrap">
              <LockKeyhole size={16} aria-hidden="true" />
              <input
                type="password"
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
                required
                minLength={mode === "sign-up" ? 10 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "sign-up" ? "At least 10 characters" : "Your password"
                }
                disabled={unavailable || loading}
              />
            </div>
          </label>
        )}

        <button
          type="submit"
          className="auth-submit"
          disabled={unavailable || loading}
        >
          {loading
            ? "Please wait..."
            : mode === "sign-up"
              ? "Create account"
              : mode === "reset"
                ? "Send reset link"
                : "Sign in"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div className="auth-actions">
        {mode === "sign-in" && (
          <button type="button" onClick={() => setMode("reset")}>
            Forgot password?
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-up" ? "sign-in" : "sign-up");
            setMessage("");
            setIsError(false);
          }}
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>

      <p className="auth-privacy">
        Account sessions use secure cookies. Your private records are isolated
        from every other account at the database level.
      </p>
    </div>
  );
}
