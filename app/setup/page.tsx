"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { careId } from "@/lib/care";
import {
  CONDITION_OPTIONS,
  LIVING_SITUATIONS,
  buildCareNotes,
  getStagesForCondition,
  splitCareDetails,
} from "@/lib/profile-options";
import { createClient } from "@/lib/supabase/client";

const TOTAL_STEPS = 5;

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [condition, setCondition] = useState<string>(CONDITION_OPTIONS[0]);
  const [stage, setStage] = useState(
    getStagesForCondition(CONDITION_OPTIONS[0])[0]
  );
  const [livingSituation, setLivingSituation] = useState<string>(
    LIVING_SITUATIONS[0]
  );
  const [mobility, setMobility] = useState("");
  const [knownTriggers, setKnownTriggers] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const stages = useMemo(() => getStagesForCondition(condition), [condition]);

  const stepValid = [
    displayName.trim().length > 0,
    /^[0-9]{5}(-[0-9]{4})?$/.test(zipCode.trim()),
    clientCode.trim().length > 0,
    Boolean(condition && stage),
    Boolean(livingSituation),
  ][step];

  function goNext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stepValid) return;
    if (step < TOTAL_STEPS - 1) setStep((current) => current + 1);
    else void completeSetup();
  }

  async function completeSetup() {
    setSaving(true);
    setError("");

    const triggers = splitCareDetails(knownTriggers);
    const supabase = createClient();
    const { error: setupError } = await supabase.rpc("complete_onboarding", {
      p_recipient_id: careId("client"),
      p_display_name: displayName.trim(),
      p_zip_code: zipCode.trim(),
      p_client_code: clientCode.trim(),
      p_condition: condition,
      p_stage: stage,
      p_living_situation: livingSituation,
      p_mobility: mobility.trim(),
      p_known_triggers: triggers,
      p_care_notes: buildCareNotes(mobility, triggers),
    });

    if (setupError) {
      setSaving(false);
      setError(
        "We could not save your setup. Confirm that the database migration has been installed, then try again."
      );
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { onboarding_complete: true },
    });

    setSaving(false);
    if (metadataError) {
      setError("Your details were saved, but the account setup could not finish.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="setup-page">
      <div className="setup-shell">
        <header className="setup-header">
          <div className="auth-brand">
            <span className="ip-brand-mark" aria-hidden="true" />
            <span>The Invisible Patient</span>
          </div>
          <p>
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </header>

        <div className="setup-progress" aria-label="Setup progress">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={index <= step ? "is-active" : ""}
              aria-hidden="true"
            />
          ))}
        </div>

        <form onSubmit={goNext} className="setup-card">
          <div className="setup-copy">
            <p>{STEP_CONTENT[step].eyebrow}</p>
            <h1>{STEP_CONTENT[step].title}</h1>
            <span>{STEP_CONTENT[step].description}</span>
          </div>

          <div className="setup-fields">
            {step === 0 && (
              <SetupField label="Your name" hint="Required">
                <input
                  autoFocus
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Alex"
                />
              </SetupField>
            )}

            {step === 1 && (
              <SetupField label="ZIP code" hint="Required">
                <input
                  autoFocus
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={10}
                  pattern="[0-9]{5}(-[0-9]{4})?"
                  value={zipCode}
                  onChange={(event) =>
                    setZipCode(event.target.value.replace(/[^0-9-]/g, ""))
                  }
                  placeholder="60601"
                />
              </SetupField>
            )}

            {step === 2 && (
              <SetupField label="Client ID or name" hint="Required">
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={clientCode}
                  onChange={(event) => setClientCode(event.target.value)}
                  placeholder="Mr. K or Client 01"
                />
              </SetupField>
            )}

            {step === 3 && (
              <>
                <SetupField label="Condition" hint="Required">
                  <select
                    value={condition}
                    onChange={(event) => {
                      const nextCondition = event.target.value;
                      setCondition(nextCondition);
                      setStage(getStagesForCondition(nextCondition)[0]);
                    }}
                  >
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </SetupField>
                <SetupField label="Current stage" hint="Required">
                  <select
                    value={stage}
                    onChange={(event) => setStage(event.target.value)}
                  >
                    {stages.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </SetupField>
              </>
            )}

            {step === 4 && (
              <>
                <SetupField label="Living situation" hint="Required">
                  <select
                    value={livingSituation}
                    onChange={(event) => setLivingSituation(event.target.value)}
                  >
                    {LIVING_SITUATIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </SetupField>
                <SetupField label="Mobility" hint="Optional">
                  <input
                    value={mobility}
                    onChange={(event) => setMobility(event.target.value)}
                    placeholder="Uses a walker; needs help on stairs"
                  />
                </SetupField>
                <SetupField label="Known triggers" hint="Optional">
                  <textarea
                    rows={3}
                    value={knownTriggers}
                    onChange={(event) => setKnownTriggers(event.target.value)}
                    placeholder="Evening noise, unfamiliar staff"
                  />
                </SetupField>
              </>
            )}
          </div>

          {error && <div className="auth-notice is-error">{error}</div>}

          <div className="setup-actions">
            {step > 0 ? (
              <button
                type="button"
                className="setup-back"
                onClick={() => setStep((current) => current - 1)}
                disabled={saving}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <div className="setup-security">
                <ShieldCheck size={15} />
                Private to your account
              </div>
            )}

            <button
              type="submit"
              className="setup-next"
              disabled={!stepValid || saving}
            >
              {saving
                ? "Saving..."
                : step === TOTAL_STEPS - 1
                  ? "Finish setup"
                  : "Next"}
              {!saving &&
                (step === TOTAL_STEPS - 1 ? (
                  <Check size={16} />
                ) : (
                  <ArrowRight size={16} />
                ))}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function SetupField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="setup-field">
      <span>
        {label}
        <small>{hint}</small>
      </span>
      {children}
    </label>
  );
}

const STEP_CONTENT = [
  {
    eyebrow: "Let’s start with you",
    title: "What should we call you?",
    description: "This is how the companion will address you.",
  },
  {
    eyebrow: "Your local area",
    title: "What is your ZIP code?",
    description:
      "We use this only to make support and resource suggestions more relevant.",
  },
  {
    eyebrow: "Care recipient",
    title: "Who are you caring for?",
    description:
      "Use a first name, initials, or an internal client ID. Avoid a full legal name.",
  },
  {
    eyebrow: "Care context",
    title: "What condition are they living with?",
    description: "The stage options adjust to the condition you select.",
  },
  {
    eyebrow: "A little more context",
    title: "What would be useful to remember?",
    description:
      "These details help the companion respond with more relevant care support.",
  },
];
