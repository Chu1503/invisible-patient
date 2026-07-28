"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 10) {
      setMessage("Use at least 10 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.assign("/");
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="ip-brand-mark" aria-hidden="true" />
          <span>The Invisible Patient</span>
        </div>
        <div className="auth-heading">
          <p>Account security</p>
          <h1>Choose a new password</h1>
          <span>Use a password you do not use on another service.</span>
        </div>
        {message && <div className="auth-notice is-error">{message}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>New password</span>
            <div className="auth-input-wrap">
              <LockKeyhole size={16} />
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 10 characters"
              />
            </div>
          </label>
          <label>
            <span>Confirm new password</span>
            <div className="auth-input-wrap">
              <LockKeyhole size={16} />
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
              />
            </div>
          </label>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Saving..." : "Save new password"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </main>
  );
}
