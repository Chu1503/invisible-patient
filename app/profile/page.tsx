"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Clock3,
  ListChecks,
  LogOut,
  MapPin,
  Pencil,
  Save,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  completeCareTask,
  completeFollowUp,
  getActiveCareRecipient,
  getCareTasks,
  getCaregiverProfile,
  getFollowUps,
  saveCareRecipient,
  saveCaregiverProfile,
  setActiveCareRecipientId,
  type CareRecipient,
  type CareTask,
  type CaregiverProfile,
  type FollowUp,
} from "@/lib/care";
import {
  CONDITION_OPTIONS,
  LIVING_SITUATIONS,
  getStagesForCondition,
} from "@/lib/profile-options";
import { signOutCurrentDevice } from "@/lib/sign-out";

type ProfileDraft = Pick<CaregiverProfile, "displayName" | "zipCode">;
type RecipientDraft = Pick<
  CareRecipient,
  | "clientCode"
  | "condition"
  | "stage"
  | "livingSituation"
  | "careNotes"
>;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0A111D] px-3 py-2.5 text-sm text-[#F5F0E8] outline-none placeholder:text-[#A09890]/50 focus:border-[#B2AC88]/40";
const labelClass =
  "mb-1.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#A09890]";

const emptyProfile: ProfileDraft = {
  displayName: "",
  zipCode: "",
};

const emptyRecipient: RecipientDraft = {
  clientCode: "",
  condition: CONDITION_OPTIONS[0],
  stage: getStagesForCondition(CONDITION_OPTIONS[0])[0],
  livingSituation: LIVING_SITUATIONS[0],
  careNotes: "",
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [activeRecipient, setActiveRecipient] =
    useState<CareRecipient | null>(null);
  const [careTasks, setCareTasks] = useState<CareTask[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [profileDraft, setProfileDraft] =
    useState<ProfileDraft>(emptyProfile);
  const [recipientDraft, setRecipientDraft] =
    useState<RecipientDraft>(emptyRecipient);
  const [signingOut, setSigningOut] = useState(false);
  const [saveError, setSaveError] = useState("");

  const stages = useMemo(
    () => getStagesForCondition(recipientDraft.condition),
    [recipientDraft.condition]
  );

  function refresh() {
    const storedProfile = getCaregiverProfile();
    const storedActive = getActiveCareRecipient();

    setProfile(storedProfile);
    setActiveRecipient(storedActive);
    setCareTasks(getCareTasks());
    setFollowUps(getFollowUps());

    setProfileDraft(
      storedProfile
        ? {
            displayName: storedProfile.displayName,
            zipCode: storedProfile.zipCode,
          }
        : emptyProfile
    );

    setRecipientDraft(
      storedActive
        ? {
            clientCode: storedActive.clientCode,
            condition: storedActive.condition,
            stage: storedActive.stage,
            livingSituation: storedActive.livingSituation,
            careNotes: storedActive.careNotes,
          }
        : emptyRecipient
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      refresh();
      setEditingProfile(!getCaregiverProfile());
      setEditingRecipient(!getActiveCareRecipient());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaveError("");
    if (!/^[0-9]{5}(-[0-9]{4})?$/.test(profileDraft.zipCode.trim())) {
      setSaveError("Enter a valid 5-digit ZIP code.");
      return;
    }

    const existing = profile ?? {
      id: "",
      role: "Caregiver",
      employer: "",
      shift: "",
      experience: "",
      communicationPreference: "balanced" as const,
      supportContact: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveCaregiverProfile({
      ...existing,
      displayName: profileDraft.displayName.trim(),
      zipCode: profileDraft.zipCode.trim(),
    });
    setEditingProfile(false);
    refresh();
  }

  function submitRecipient(event: React.FormEvent) {
    event.preventDefault();
    setSaveError("");

    const existing = activeRecipient ?? {
      id: "",
      mobility: "",
      knownTriggers: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = saveCareRecipient({
      ...(activeRecipient
        ? { id: activeRecipient.id, createdAt: activeRecipient.createdAt }
        : {}),
      clientCode: recipientDraft.clientCode.trim(),
      condition: recipientDraft.condition,
      stage: recipientDraft.stage,
      livingSituation: recipientDraft.livingSituation,
      mobility: existing.mobility,
      knownTriggers: existing.knownTriggers,
      careNotes: recipientDraft.careNotes.trim(),
    });
    setActiveCareRecipientId(saved.id);
    setEditingRecipient(false);
    refresh();
  }

  async function signOut() {
    setSigningOut(true);
    await signOutCurrentDevice();
  }

  if (!mounted) {
    return <main className="min-h-screen bg-[#090d15]" />;
  }

  const pendingFollowUps = followUps.filter(
    (followUp) =>
      !followUp.completed &&
      (!activeRecipient || followUp.recipientId === activeRecipient.id)
  );
  const nextCareTasks = careTasks
    .filter(
      (task) =>
        !task.completed &&
        (!activeRecipient || task.recipientId === activeRecipient.id)
    )
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))
    .slice(0, 3);
  const profileName =
    profile?.displayName || profileDraft.displayName || "Your profile";
  const clientInitial =
    activeRecipient?.clientCode.trim().charAt(0).toUpperCase() || "C";

  return (
    <main className="min-h-screen bg-[#090d15] px-4 pb-16 pt-24">
      <Navbar />
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-[#F5F0E8]">
            Profile
          </h1>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="ip-secondary-button min-h-10 px-4 disabled:opacity-50"
          >
            <LogOut size={14} />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

        {saveError && (
          <p className="mb-4 rounded-xl border border-[#8B5A5A]/30 bg-[#8B5A5A]/10 px-4 py-3 text-xs text-[#D4CEBD]">
            {saveError}
          </p>
        )}

        <div className="ip-connected-list">
          <section className="profile-tasks-card">
            <div className="profile-section-header">
              <h2>Care tasks</h2>
              <Link href="/tasks" className="profile-tasks-manage">
                Manage
                <ChevronRight size={14} />
              </Link>
            </div>

            {nextCareTasks.length ? (
              <div className="profile-tasks-list">
                {nextCareTasks.map((task) => (
                  <div className="profile-task-item" key={task.id}>
                    <button
                      type="button"
                      onClick={() => {
                        completeCareTask(task.id);
                        refresh();
                      }}
                      aria-label={`Mark ${task.title} complete`}
                    >
                      <Check size={14} />
                    </button>
                    <div>
                      <p>{task.title}</p>
                      <span>{profileTaskDueLabel(task.dueAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-tasks-empty">
                <ListChecks size={18} />
                <p>No care tasks yet.</p>
              </div>
            )}
          </section>

          <section className="profile-identity-card">
            <div className="profile-identity-main">
              <div className="profile-avatar" aria-hidden="true">
                <Image
                  src="/invisible-patient-logo.png"
                  alt=""
                  width={256}
                  height={256}
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2>{profileName}</h2>
                <p>
                  <MapPin size={14} />
                  {profile?.zipCode ||
                    profileDraft.zipCode ||
                    "ZIP code not provided"}
                </p>
              </div>
              {profile && !editingProfile && (
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="profile-edit-button"
                  aria-label="Edit your profile"
                >
                  <Pencil size={15} />
                  Edit
                </button>
              )}
            </div>

            {editingProfile && (
              <form
                onSubmit={submitProfile}
                className="profile-edit-form grid gap-3 sm:grid-cols-2"
              >
                <Field
                  label="Name"
                  required
                  value={profileDraft.displayName}
                  onChange={(value) =>
                    setProfileDraft({ ...profileDraft, displayName: value })
                  }
                  placeholder="Alex"
                />
                <Field
                  label="ZIP code"
                  required
                  inputMode="numeric"
                  value={profileDraft.zipCode}
                  onChange={(value) =>
                    setProfileDraft({
                      ...profileDraft,
                      zipCode: value.replace(/[^0-9-]/g, ""),
                    })
                  }
                  placeholder="60601"
                />
                <button
                  type="submit"
                  className="profile-save-button sm:col-span-2"
                >
                  <Save size={14} />
                  Save profile
                </button>
              </form>
            )}
          </section>

          <section className="profile-client-card">
            <div className="profile-section-header">
              <h2>Client Profile</h2>
              {activeRecipient && !editingRecipient && (
                <button
                  type="button"
                  onClick={() => setEditingRecipient(true)}
                  className="profile-edit-button"
                  aria-label="Edit client"
                >
                  <Pencil size={15} />
                  Edit
                </button>
              )}
            </div>

            {editingRecipient ? (
              <form onSubmit={submitRecipient} className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Client ID or name"
                  required
                  value={recipientDraft.clientCode}
                  onChange={(value) =>
                    setRecipientDraft({ ...recipientDraft, clientCode: value })
                  }
                  placeholder="Mr. K or Client 01"
                />
                <label>
                  <span className={labelClass}>Condition</span>
                  <select
                    className={inputClass}
                    value={recipientDraft.condition}
                    onChange={(event) => {
                      const condition = event.target.value;
                      setRecipientDraft({
                        ...recipientDraft,
                        condition,
                        stage: getStagesForCondition(condition)[0],
                      });
                    }}
                  >
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Stage</span>
                  <select
                    className={inputClass}
                    value={recipientDraft.stage}
                    onChange={(event) =>
                      setRecipientDraft({
                        ...recipientDraft,
                        stage: event.target.value,
                      })
                    }
                  >
                    {stages.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Living situation</span>
                  <select
                    className={inputClass}
                    value={recipientDraft.livingSituation}
                    onChange={(event) =>
                      setRecipientDraft({
                        ...recipientDraft,
                        livingSituation: event.target.value,
                      })
                    }
                  >
                    {LIVING_SITUATIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className={labelClass}>Care notes</span>
                  <textarea
                    className={`${inputClass} min-h-28 resize-y`}
                    value={recipientDraft.careNotes}
                    onChange={(event) =>
                      setRecipientDraft({
                        ...recipientDraft,
                        careNotes: event.target.value,
                      })
                    }
                    placeholder="Anything useful to remember, such as mobility needs, known triggers, communication preferences, or other care context."
                    maxLength={5000}
                  />
                </label>
                <button
                  type="submit"
                  className="profile-save-button sm:col-span-2"
                >
                  <Save size={14} />
                  Save client profile
                </button>
              </form>
            ) : activeRecipient ? (
              <div>
                <div className="profile-client-summary">
                  <div className="profile-client-avatar" aria-hidden="true">
                    {clientInitial}
                  </div>
                  <div className="min-w-0">
                    <h3>{activeRecipient.clientCode}</h3>
                    <p>{activeRecipient.condition}</p>
                    <span>
                      {activeRecipient.stage}, {activeRecipient.livingSituation}
                    </span>
                  </div>
                </div>

                <div className="profile-info-grid profile-info-grid-simple">
                  <Info
                    label="Care notes"
                    value={activeRecipient.careNotes || "Nothing added yet"}
                  />
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-[#A09890]">
                Add a client profile to begin.
              </p>
            )}
          </section>

          <section id="revisit" className="profile-followups-card">
            <div className="profile-section-header">
              <h2>Revisit</h2>
              {pendingFollowUps.length > 0 && (
                <span className="profile-followups-count">
                  {pendingFollowUps.length}
                </span>
              )}
            </div>

            {pendingFollowUps.length ? (
              <div className="profile-followups-list">
                {pendingFollowUps.map((followUp) => (
                  <div className="profile-followup-item" key={followUp.id}>
                    <span className="profile-followup-icon" aria-hidden="true">
                      <Clock3 size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p>{followUp.prompt}</p>
                      <span>{new Date(followUp.dueAt).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        completeFollowUp(followUp.id);
                        refresh();
                      }}
                      className="profile-followup-done"
                    >
                      <Check size={14} />
                      Done
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-followups-empty">
                Nothing needs another check right now.
              </p>
            )}
          </section>
        </div>

        <nav className="profile-legal-links" aria-label="Legal">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms and Conditions</Link>
        </nav>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="profile-info-item">
      <p>{label}</p>
      <span className="whitespace-pre-line">{value || "Not provided"}</span>
    </div>
  );
}

function profileTaskDueLabel(dueAt?: number): string {
  if (!dueAt) return "No due time";
  const due = new Date(dueAt);
  const now = new Date();
  const time = due.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  ) {
    return `${dueAt < Date.now() ? "Overdue" : "Today"} · ${time}`;
  }

  return `${due.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} · ${time}`;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}
