"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clock3,
  LogOut,
  MapPin,
  Pencil,
  Save,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  completeFollowUp,
  getActiveCareRecipient,
  getCaregiverProfile,
  getFollowUps,
  saveCareRecipient,
  saveCaregiverProfile,
  setActiveCareRecipientId,
  type CareRecipient,
  type CaregiverProfile,
  type FollowUp,
} from "@/lib/care";

type ProfileDraft = Omit<CaregiverProfile, "id" | "createdAt" | "updatedAt">;
type RecipientDraft = Omit<CareRecipient, "id" | "createdAt" | "updatedAt">;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0A111D] px-3 py-2.5 text-sm text-[#F5F0E8] outline-none placeholder:text-[#A09890]/50 focus:border-[#B2AC88]/40";
const labelClass =
  "mb-1.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#A09890]";

const emptyProfile: ProfileDraft = {
  displayName: "",
  role: "Caregiver",
  employer: "",
  shift: "",
  experience: "",
  communicationPreference: "balanced",
  zipCode: "",
  supportContact: "",
};

const emptyRecipient: RecipientDraft = {
  clientCode: "",
  condition: "Alzheimer’s disease",
  stage: "Mid stage",
  livingSituation: "At home",
  routines: [],
  knownTriggers: [],
  mobility: "Independent with supervision",
  approvedInstructions: [],
};

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [activeRecipient, setActiveRecipient] = useState<CareRecipient | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile);
  const [recipientDraft, setRecipientDraft] =
    useState<RecipientDraft>(emptyRecipient);
  const [signOutNotice, setSignOutNotice] = useState(false);

  function refresh() {
    const storedProfile = getCaregiverProfile();
    const storedActive = getActiveCareRecipient();

    setProfile(storedProfile);
    setActiveRecipient(storedActive);
    setFollowUps(getFollowUps());

    setProfileDraft(
      storedProfile
        ? {
            displayName: storedProfile.displayName,
            role: storedProfile.role,
            employer: storedProfile.employer,
            shift: storedProfile.shift,
            experience: storedProfile.experience,
            communicationPreference: storedProfile.communicationPreference,
            zipCode: storedProfile.zipCode,
            supportContact: storedProfile.supportContact,
          }
        : emptyProfile
    );

    if (storedActive) {
      setRecipientDraft({
        clientCode: storedActive.clientCode,
        condition: storedActive.condition,
        stage: storedActive.stage,
        livingSituation: storedActive.livingSituation,
        routines: storedActive.routines,
        knownTriggers: storedActive.knownTriggers,
        mobility: storedActive.mobility,
        approvedInstructions: storedActive.approvedInstructions,
      });
    }
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
    saveCaregiverProfile(profileDraft);
    setEditingProfile(false);
    refresh();
  }

  function submitRecipient(event: React.FormEvent) {
    event.preventDefault();
    const saved = saveCareRecipient({
      ...(activeRecipient
        ? { id: activeRecipient.id, createdAt: activeRecipient.createdAt }
        : {}),
      ...recipientDraft,
    });
    setActiveCareRecipientId(saved.id);
    setEditingRecipient(false);
    refresh();
  }

  if (!mounted) {
    return <main className="min-h-screen bg-[#090d15]" />;
  }

  const pendingFollowUps = followUps.filter(
    (followUp) =>
      !followUp.completed &&
      (!activeRecipient || followUp.recipientId === activeRecipient.id)
  );
  const profileName =
    profile?.displayName || profileDraft.displayName || "Your profile";
  const profileInitial =
    profileName === "Your profile" ? "?" : profileName.trim().charAt(0).toUpperCase();
  const clientInitial =
    activeRecipient?.clientCode.trim().charAt(0).toUpperCase() || "C";

  return (
    <main className="min-h-screen bg-[#090d15] px-4 pb-16 pt-24">
      <Navbar />
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#F5F0E8]">
              Profile
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSignOutNotice(true)}
            className="ip-secondary-button min-h-10 px-4"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </header>

        {signOutNotice && (
          <p className="mb-4 rounded-xl border border-[#B2AC88]/15 bg-[#B2AC88]/5 px-4 py-3 text-xs text-[#D4CEBD]">
            Sign out will be available when accounts are added.
          </p>
        )}

        <div className="ip-connected-list">
          <section className="profile-identity-card">
            <div className="profile-identity-main">
              <div className="profile-avatar" aria-hidden="true">
                {profileInitial}
              </div>
              <div className="min-w-0 flex-1">
                <h2>{profileName}</h2>
                <p>
                  <MapPin size={14} />
                  {profile?.zipCode || profileDraft.zipCode || "ZIP code not provided"}
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
                <label>
                  <span className={labelClass}>Name</span>
                  <input
                    required
                    className={inputClass}
                    maxLength={120}
                    value={profileDraft.displayName}
                    onChange={(event) =>
                      setProfileDraft({
                        ...profileDraft,
                        displayName: event.target.value,
                      })
                    }
                    placeholder="Alex"
                  />
                </label>
                <label>
                  <span className={labelClass}>ZIP code</span>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    title="Enter a five digit ZIP code"
                    maxLength={5}
                    value={profileDraft.zipCode}
                    onChange={(event) =>
                      setProfileDraft({
                        ...profileDraft,
                        zipCode: event.target.value,
                      })
                    }
                    placeholder="60601"
                  />
                </label>
                <button
                  type="submit"
                  className="profile-save-button sm:col-span-2"
                >
                  <Save size={14} />
                  Save Profile
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
                    onChange={(event) =>
                      setRecipientDraft({
                        ...recipientDraft,
                        condition: event.target.value,
                      })
                    }
                  >
                    <option>Alzheimer’s disease</option>
                    <option>Vascular dementia</option>
                    <option>Lewy body dementia</option>
                    <option>Frontotemporal dementia</option>
                    <option>Parkinson’s disease dementia</option>
                    <option>Other dementia</option>
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
                    <option>Early stage</option>
                    <option>Mid stage</option>
                    <option>Late stage</option>
                    <option>Not documented</option>
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
                    <option>At home</option>
                    <option>Shared home</option>
                    <option>Assisted living</option>
                    <option>Memory care</option>
                    <option>Skilled nursing</option>
                  </select>
                </label>
                <Field
                  label="Mobility"
                  value={recipientDraft.mobility}
                  onChange={(value) =>
                    setRecipientDraft({ ...recipientDraft, mobility: value })
                  }
                />
                <Field
                  label="Routines"
                  value={recipientDraft.routines.join(", ")}
                  onChange={(value) =>
                    setRecipientDraft({
                      ...recipientDraft,
                      routines: splitList(value),
                    })
                  }
                  placeholder="Dinner at 6, evening walk"
                />
                <Field
                  label="Known triggers"
                  value={recipientDraft.knownTriggers.join(", ")}
                  onChange={(value) =>
                    setRecipientDraft({
                      ...recipientDraft,
                      knownTriggers: splitList(value),
                    })
                  }
                  placeholder="Evening noise, unfamiliar staff"
                />
                <Field
                  label="Approved instructions"
                  value={recipientDraft.approvedInstructions.join(", ")}
                  onChange={(value) =>
                    setRecipientDraft({
                      ...recipientDraft,
                      approvedInstructions: splitList(value),
                    })
                  }
                  placeholder="Follow the approved wandering protocol"
                />
                <button
                  type="submit"
                  className="profile-save-button sm:col-span-2"
                >
                  <Save size={14} />
                  Save Client Profile
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

                <div className="profile-info-grid">
                  <Info label="Mobility" value={activeRecipient.mobility} />
                  <Info
                    label="Routines"
                    value={activeRecipient.routines.join(", ") || "None recorded"}
                  />
                  <Info
                    label="Known triggers"
                    value={
                      activeRecipient.knownTriggers.join(", ") || "None recorded"
                    }
                  />
                  <Info
                    label="Approved instructions"
                    value={
                      activeRecipient.approvedInstructions.join(", ") ||
                      "None recorded"
                    }
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
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="profile-info-item">
      <p>{label}</p>
      <span>{value || "Not provided"}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        required={required}
        maxLength={600}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
