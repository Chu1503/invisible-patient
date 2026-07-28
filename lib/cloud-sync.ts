"use client";

import type {
  ActionPlan,
  CareEvent,
  CareRecipient,
  CareTask,
  CaregiverProfile,
  CareWorkflowResult,
  FollowUp,
} from "./care";
import type { CheckinEntry, MentalState, Message } from "./store";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";

const ACCOUNT_KEYS = [
  "ip_profile",
  "ip_checkins",
  "ip_last_state",
  "ip_caregiver_profile",
  "ip_care_recipients",
  "ip_active_recipient",
  "ip_care_events",
  "ip_action_plans",
  "ip_care_tasks",
  "ip_follow_ups",
  "ip_latest_workflow",
  "ip_cache_user_id",
];

function iso(timestamp?: number): string | null {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function timestamp(value: unknown): number {
  return typeof value === "string" ? new Date(value).getTime() : Date.now();
}

async function userId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createClient().auth.getClaims();
  return data?.claims.sub ?? null;
}

async function safelyWrite(
  work: (currentUserId: string) => PromiseLike<{ error: unknown }>
): Promise<void> {
  try {
    const currentUserId = await userId();
    if (!currentUserId) return;
    const { error } = await work(currentUserId);
    if (error) throw error;
  } catch {
    // The local cache keeps the UI responsive. The next save or hydration retries.
  }
}

export function clearAccountCache(): void {
  if (typeof window === "undefined") return;
  ACCOUNT_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function syncCaregiverProfile(profile: CaregiverProfile): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("profiles")
      .upsert(
        {
          user_id: currentUserId,
          display_name: profile.displayName,
          zip_code: profile.zipCode,
          role: profile.role,
          employer: profile.employer,
          shift: profile.shift,
          experience: profile.experience,
          communication_preference: profile.communicationPreference,
          support_contact: profile.supportContact,
          onboarding_completed: true,
        },
        { onConflict: "user_id" }
      )
  );
}

export function syncCareRecipient(
  recipient: CareRecipient,
  isActive: boolean
): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("care_recipients")
      .upsert(
        {
          id: recipient.id,
          user_id: currentUserId,
          client_code: recipient.clientCode,
          condition: recipient.condition,
          stage: recipient.stage,
          living_situation: recipient.livingSituation,
          mobility: recipient.mobility,
          known_triggers: recipient.knownTriggers,
          care_notes: recipient.careNotes,
          is_active: isActive,
          created_at: iso(recipient.createdAt),
        },
        { onConflict: "id" }
      )
  );
}

export function syncActiveCareRecipient(recipientId: string): void {
  void safelyWrite(async (currentUserId) => {
    const supabase = createClient();
    const cleared = await supabase
      .from("care_recipients")
      .update({ is_active: false })
      .eq("user_id", currentUserId)
      .eq("is_active", true);
    if (cleared.error) return cleared;
    return supabase
      .from("care_recipients")
      .update({ is_active: true })
      .eq("user_id", currentUserId)
      .eq("id", recipientId);
  });
}

export function syncCheckin(entry: CheckinEntry): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("checkins")
      .upsert(
        {
          user_id: currentUserId,
          session_id: entry.id,
          checkin_date: entry.date,
          occurred_at: iso(entry.timestamp),
          mental_state: entry.mentalState,
          zbi_estimate: Math.round(entry.zbiEstimate),
          zbi_answers: entry.zbiAnswers,
          resonance_score: Math.round(entry.resonanceScore),
          emotions: entry.emotions,
          risk_level: entry.riskLevel,
          messages: entry.messages,
        },
        { onConflict: "user_id,session_id" }
      )
  );
}

export function syncLastMentalState(state: MentalState): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("profiles")
      .update({ last_mental_state: state })
      .eq("user_id", currentUserId)
  );
}

export function syncCareEvent(event: CareEvent): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("care_events")
      .upsert(
        {
          user_id: currentUserId,
          id: event.id,
          recipient_id: event.recipientId,
          issue: event.issue,
          summary: event.summary,
          risk: event.risk,
          trigger: event.trigger ?? null,
          outcome: event.outcome ?? null,
          status: event.status,
          occurred_at: iso(event.timestamp),
        },
        { onConflict: "user_id,id" }
      )
  );
}

export function syncCareEventOutcome(
  eventId: string,
  outcome: string
): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("care_events")
      .update({ outcome: outcome.trim(), status: "resolved" })
      .eq("user_id", currentUserId)
      .eq("id", eventId)
  );
}

export function syncActionPlan(plan: ActionPlan): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("action_plans")
      .upsert(
        {
          user_id: currentUserId,
          id: plan.id,
          event_id: plan.eventId,
          title: plan.title,
          steps: plan.steps,
          source_title: plan.sourceTitle,
          source_url: plan.sourceUrl,
          reviewed_at: plan.reviewedAt,
          created_at: iso(plan.createdAt),
        },
        { onConflict: "user_id,id" }
      )
  );
}

export function syncCareTask(task: CareTask): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("care_tasks")
      .upsert(
        {
          user_id: currentUserId,
          id: task.id,
          recipient_id: task.recipientId,
          event_id: task.eventId ?? null,
          title: task.title,
          owner_name: task.owner,
          due_at: iso(task.dueAt),
          completed: task.completed,
          created_at: iso(task.createdAt),
        },
        { onConflict: "user_id,id" }
      )
  );
}

export function syncCareTaskCompletion(
  taskId: string,
  completed: boolean
): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("care_tasks")
      .update({ completed })
      .eq("user_id", currentUserId)
      .eq("id", taskId)
  );
}

export function syncFollowUp(followUp: FollowUp): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("follow_ups")
      .upsert(
        {
          user_id: currentUserId,
          id: followUp.id,
          recipient_id: followUp.recipientId,
          event_id: followUp.eventId,
          prompt: followUp.prompt,
          due_at: iso(followUp.dueAt),
          completed: followUp.completed,
          created_at: iso(followUp.createdAt),
        },
        { onConflict: "user_id,id" }
      )
  );
}

export function syncFollowUpCompletion(
  followUpId: string,
  completed: boolean
): void {
  void safelyWrite((currentUserId) =>
    createClient()
      .from("follow_ups")
      .update({ completed })
      .eq("user_id", currentUserId)
      .eq("id", followUpId)
  );
}

export function syncWorkflowResult(
  workflow: CareWorkflowResult,
  includeFollowUp: boolean
): void {
  void safelyWrite(async (currentUserId) => {
    const supabase = createClient();
    const eventResult = await supabase.from("care_events").upsert(
      {
        user_id: currentUserId,
        id: workflow.event.id,
        recipient_id: workflow.event.recipientId,
        issue: workflow.event.issue,
        summary: workflow.event.summary,
        risk: workflow.event.risk,
        trigger: workflow.event.trigger ?? null,
        outcome: workflow.event.outcome ?? null,
        status: workflow.event.status,
        occurred_at: iso(workflow.event.timestamp),
      },
      { onConflict: "user_id,id" }
    );
    if (eventResult.error) return eventResult;

    const planResult = await supabase.from("action_plans").upsert(
      {
        user_id: currentUserId,
        id: workflow.actionPlan.id,
        event_id: workflow.actionPlan.eventId,
        title: workflow.actionPlan.title,
        steps: workflow.actionPlan.steps,
        source_title: workflow.actionPlan.sourceTitle,
        source_url: workflow.actionPlan.sourceUrl,
        reviewed_at: workflow.actionPlan.reviewedAt,
        created_at: iso(workflow.actionPlan.createdAt),
      },
      { onConflict: "user_id,id" }
    );
    if (planResult.error) return planResult;

    for (const task of workflow.tasks) {
      const taskResult = await supabase.from("care_tasks").upsert(
        {
          user_id: currentUserId,
          id: task.id,
          recipient_id: task.recipientId,
          event_id: task.eventId ?? null,
          title: task.title,
          owner_name: task.owner,
          due_at: iso(task.dueAt),
          completed: task.completed,
          created_at: iso(task.createdAt),
        },
        { onConflict: "user_id,id" }
      );
      if (taskResult.error) return taskResult;
    }

    if (includeFollowUp) {
      return supabase.from("follow_ups").upsert(
        {
          user_id: currentUserId,
          id: workflow.followUp.id,
          recipient_id: workflow.followUp.recipientId,
          event_id: workflow.followUp.eventId,
          prompt: workflow.followUp.prompt,
          due_at: iso(workflow.followUp.dueAt),
          completed: workflow.followUp.completed,
          created_at: iso(workflow.followUp.createdAt),
        },
        { onConflict: "user_id,id" }
      );
    }

    return { error: null };
  });
}

type CloudRow = Record<string, unknown>;

function messages(value: unknown): Message[] {
  return Array.isArray(value) ? (value as Message[]) : [];
}

export async function hydrateAccountData(): Promise<{
  hasProfile: boolean;
}> {
  if (!isSupabaseConfigured()) return { hasProfile: false };

  const supabase = createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims.sub;
  if (!currentUserId) throw new Error("Authentication required");

  const [
    profileResult,
    recipientsResult,
    checkinsResult,
    eventsResult,
    plansResult,
    tasksResult,
    followUpsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle(),
    supabase.from("care_recipients").select("*").order("created_at"),
    supabase.from("checkins").select("*").order("occurred_at"),
    supabase.from("care_events").select("*").order("occurred_at", {
      ascending: false,
    }),
    supabase.from("action_plans").select("*").order("created_at", {
      ascending: false,
    }),
    supabase.from("care_tasks").select("*").order("created_at", {
      ascending: false,
    }),
    supabase.from("follow_ups").select("*").order("created_at", {
      ascending: false,
    }),
  ]);

  const firstError = [
    profileResult.error,
    recipientsResult.error,
    checkinsResult.error,
    eventsResult.error,
    plansResult.error,
    tasksResult.error,
    followUpsResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  clearAccountCache();
  localStorage.setItem("ip_cache_user_id", currentUserId);

  const profileRow = profileResult.data as CloudRow | null;
  if (profileRow) {
    const profile: CaregiverProfile = {
      id: currentUserId,
      displayName: String(profileRow.display_name ?? ""),
      role: String(profileRow.role ?? "Caregiver"),
      employer: String(profileRow.employer ?? ""),
      shift: String(profileRow.shift ?? ""),
      experience: String(profileRow.experience ?? ""),
      communicationPreference:
        (profileRow.communication_preference as CaregiverProfile["communicationPreference"]) ??
        "balanced",
      zipCode: String(profileRow.zip_code ?? ""),
      supportContact: String(profileRow.support_contact ?? ""),
      createdAt: timestamp(profileRow.created_at),
      updatedAt: timestamp(profileRow.updated_at),
    };
    localStorage.setItem("ip_caregiver_profile", JSON.stringify(profile));
    localStorage.setItem(
      "ip_profile",
      JSON.stringify({ username: profile.displayName, createdAt: profile.createdAt })
    );
    localStorage.setItem(
      "ip_last_state",
      String(profileRow.last_mental_state ?? "restless")
    );
  }

  const recipientRows = (recipientsResult.data ?? []) as CloudRow[];
  const recipients: CareRecipient[] = recipientRows.map((row) => ({
    id: String(row.id),
    clientCode: String(row.client_code ?? ""),
    condition: String(row.condition ?? ""),
    stage: String(row.stage ?? ""),
    livingSituation: String(row.living_situation ?? ""),
    mobility: String(row.mobility ?? ""),
    knownTriggers: Array.isArray(row.known_triggers)
      ? (row.known_triggers as string[])
      : [],
    careNotes: String(row.care_notes ?? ""),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  }));
  localStorage.setItem("ip_care_recipients", JSON.stringify(recipients));
  const activeRecipient = recipientRows.find((row) => row.is_active === true);
  if (activeRecipient) {
    localStorage.setItem("ip_active_recipient", String(activeRecipient.id));
  }

  const checkins: CheckinEntry[] = (
    (checkinsResult.data ?? []) as CloudRow[]
  ).map((row) => ({
    id: String(row.session_id),
    date: String(row.checkin_date),
    timestamp: timestamp(row.occurred_at),
    mentalState: row.mental_state as CheckinEntry["mentalState"],
    zbiEstimate: Number(row.zbi_estimate ?? 0),
    zbiAnswers: Array.isArray(row.zbi_answers)
      ? (row.zbi_answers as number[])
      : [],
    resonanceScore: Number(row.resonance_score ?? 50),
    emotions: Array.isArray(row.emotions) ? (row.emotions as string[]) : [],
    riskLevel: row.risk_level as CheckinEntry["riskLevel"],
    messages: messages(row.messages),
  }));
  localStorage.setItem("ip_checkins", JSON.stringify(checkins));

  const events: CareEvent[] = ((eventsResult.data ?? []) as CloudRow[]).map(
    (row) => ({
      id: String(row.id),
      recipientId: String(row.recipient_id),
      issue: row.issue as CareEvent["issue"],
      summary: String(row.summary ?? ""),
      risk: row.risk as CareEvent["risk"],
      trigger: row.trigger ? String(row.trigger) : undefined,
      outcome: row.outcome ? String(row.outcome) : undefined,
      status: row.status as CareEvent["status"],
      timestamp: timestamp(row.occurred_at),
    })
  );
  localStorage.setItem("ip_care_events", JSON.stringify(events));

  const plans: ActionPlan[] = ((plansResult.data ?? []) as CloudRow[]).map(
    (row) => ({
      id: String(row.id),
      eventId: String(row.event_id),
      title: String(row.title ?? ""),
      steps: Array.isArray(row.steps) ? (row.steps as string[]) : [],
      sourceTitle: String(row.source_title ?? ""),
      sourceUrl: String(row.source_url ?? ""),
      reviewedAt: String(row.reviewed_at ?? ""),
      createdAt: timestamp(row.created_at),
    })
  );
  localStorage.setItem("ip_action_plans", JSON.stringify(plans));

  const tasks: CareTask[] = ((tasksResult.data ?? []) as CloudRow[]).map(
    (row) => ({
      id: String(row.id),
      recipientId: String(row.recipient_id),
      eventId: row.event_id ? String(row.event_id) : undefined,
      title: String(row.title ?? ""),
      owner: String(row.owner_name ?? "Caregiver"),
      dueAt: row.due_at ? timestamp(row.due_at) : undefined,
      completed: row.completed === true,
      createdAt: timestamp(row.created_at),
    })
  );
  localStorage.setItem("ip_care_tasks", JSON.stringify(tasks));

  const followUps: FollowUp[] = (
    (followUpsResult.data ?? []) as CloudRow[]
  ).map((row) => ({
    id: String(row.id),
    recipientId: String(row.recipient_id),
    eventId: String(row.event_id),
    prompt: String(row.prompt ?? ""),
    dueAt: timestamp(row.due_at),
    completed: row.completed === true,
    createdAt: timestamp(row.created_at),
  }));
  localStorage.setItem("ip_follow_ups", JSON.stringify(followUps));

  window.dispatchEvent(new Event("ip-account-data-ready"));
  return { hasProfile: Boolean(profileRow) };
}
