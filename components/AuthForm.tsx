"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import {
  getPasswordError,
  isValidEmailAddress,
} from "@/lib/form-validation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AuthMode = "sign-in" | "sign-up" | "reset";

export default function AuthForm({
  initialError = "",
  configurationMissing = false,
}: {
  initialError?: string;
  configurationMissing?: boolean;
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

    if (!isValidEmailAddress(email)) {
      setIsError(true);
      setMessage("Enter a valid email address, such as name@example.com.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createClient();
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
      const passwordError = getPasswordError(password);
      if (passwordError) {
        setLoading(false);
        setIsError(true);
        setMessage(passwordError);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup`,
        },
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

    window.location.assign("/");
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="ip-brand-mark" aria-hidden="true" />
        <span>The Invisible Patient</span>
      </div>

      <div className="auth-heading">
        <h1>
          {mode === "sign-up"
            ? "Create your account"
            : mode === "reset"
              ? "Reset your password"
              : "Welcome back"}
        </h1>
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
        {mode === "sign-in" ? (
          <button type="button" onClick={() => setMode("reset")}>
            Forgot password?
          </button>
        ) : mode === "reset" ? (
          <button type="button" onClick={() => setMode("sign-in")}>
            Back to sign in
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-up" ? "sign-in" : "sign-up");
            setMessage("");
            setIsError(false);
          }}
        >
          {mode === "sign-up" ? "Sign in" : "Create an account"}
        </button>
      </div>
    </div>
  );
}
