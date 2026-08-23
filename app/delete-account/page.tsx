"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { clearAccountCache } from "@/lib/cloud-sync";
import { createClient } from "@/lib/supabase/client";

const CONFIRMATION = "DELETE";

export default function DeleteAccountPage() {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirmed = confirmation.trim() === CONFIRMATION;

  async function deleteAccount() {
    if (!confirmed || deleting) return;

    setDeleting(true);
    setError("");
    const supabase = createClient();

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Please sign in again before deleting your account.");
      }

      const { error: deletionError } = await supabase.rpc(
        "delete_own_account"
      );
      if (deletionError) throw deletionError;

      clearAccountCache();
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // The account is already gone, so local cleanup and redirect are enough.
      }
      window.location.replace("/auth?deleted=1");
    } catch (deletionError) {
      const message =
        deletionError instanceof Error ? deletionError.message : "";
      setError(
        message.includes("delete_own_account") || message.includes("schema cache")
          ? "Account deletion is not available yet. Apply the latest Supabase migration and try again."
          : message || "Your account could not be deleted. Please try again."
      );
      setDeleting(false);
    }
  }

  return (
    <main className="delete-account-page">
      <Navbar />
      <div className="delete-account-shell">
        <Link href="/profile" className="delete-account-back">
          <ArrowLeft size={15} />
          Back to Profile
        </Link>

        <section className="delete-account-card">
          <span className="delete-account-icon" aria-hidden="true">
            <ShieldAlert size={22} />
          </span>
          <h1>Delete your account</h1>
          <p>
            This permanently deletes your Invizy account and cannot
            be undone.
          </p>

          <ul className="delete-account-list">
            <li>Your caregiver and client profiles</li>
            <li>Your check-ins, conversations, and Resonance history</li>
            <li>Your care events, plans, tasks, and follow-ups</li>
            <li>Your Circle posts, replies, and likes</li>
          </ul>

          <label className="delete-account-confirmation">
            <span>
              Type <strong>{CONFIRMATION}</strong> to confirm
            </span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              maxLength={CONFIRMATION.length}
              disabled={deleting}
              aria-describedby={error ? "delete-account-error" : undefined}
            />
          </label>

          {error && (
            <p id="delete-account-error" className="delete-account-error" role="alert">
              {error}
            </p>
          )}

          <div className="delete-account-actions">
            <Link href="/profile" className="delete-account-cancel">
              Keep my account
            </Link>
            <button
              type="button"
              className="delete-account-submit"
              disabled={!confirmed || deleting}
              onClick={() => void deleteAccount()}
            >
              {deleting ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
              {deleting ? "Deleting account" : "Delete account permanently"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
