import {
  deleteCareTaskFromCloud,
  syncActionPlan,
  syncActiveCareRecipient,
  syncCareEvent,
  syncCareEventOutcome,
  syncCareRecipient,
  syncCareTask,
  syncCaregiverProfile,
  syncFollowUp,
  syncFollowUpCompletion,
  syncWorkflowResult,
} from "./cloud-sync";
import {
  INPUT_LIMITS,
  sanitizePlainText,
  sanitizeSingleLine,
  sanitizeTextList,
} from "./input";

export type CareIssue =
  | "wandering"
  | "agitation"
  | "fall"
  | "medication"
  | "emotional"
  | "general";

export type WorkflowRisk = "low" | "urgent" | "emergency";

export interface CaregiverProfile {
  id: string;
  displayName: string;
  role: string;
  employer: string;
  shift: string;
  experience: string;
  communicationPreference: "gentle" | "direct" | "balanced";
  zipCode: string;
  supportContact: string;
  createdAt: number;
  updatedAt: number;
}

export interface CareRecipient {
  id: string;
  clientCode: string;
  condition: string;
  stage: string;
  livingSituation: string;
  knownTriggers: string[];
  mobility: string;
  careNotes: string;
  createdAt: number;
  updatedAt: number;
}

export interface CareEvent {
  id: string;
  recipientId: string;
  issue: CareIssue;
  summary: string;
  risk: WorkflowRisk;
  trigger?: string;
  outcome?: string;
  status: "open" | "resolved";
  timestamp: number;
}

export interface ActionPlan {
  id: string;
  eventId: string;
  title: string;
  steps: string[];
  sourceTitle: string;
  sourceUrl: string;
  reviewedAt: string;
  createdAt: number;
}

export interface CareTask {
  id: string;
  recipientId: string;
  eventId?: string;
  title: string;
  details?: string;
  owner: string;
  dueAt?: number;
  recurrence?: "none" | "daily" | "weekly";
  reminderMinutes?: number | null;
  lastCompletedAt?: number;
  completed: boolean;
  createdAt: number;
}

export interface FollowUp {
  id: string;
  recipientId: string;
  eventId: string;
  prompt: string;
  dueAt: number;
  completed: boolean;
  createdAt: number;
}

export interface TrustedGuide {
  id: string;
  title: string;
  description: string;
  category: CareIssue | "self-care" | "communication";
  sourceTitle: string;
  sourceUrl: string;
  reviewedAt: string;
}

export interface CareResource {
  id: string;
  title: string;
  description: string;
  category:
    | "local-care"
    | "daily-needs"
    | "respite"
    | "caregiver-support"
    | "care-provider"
    | "crisis"
    | "training";
  locationLabel: string;
  url: string;
  phone?: string;
  verifiedBy: string;
  reviewedAt: string;
}

export interface CareWorkflowResult {
  id: string;
  issue: CareIssue;
  risk: WorkflowRisk;
  title: string;
  safetyQuestion?: string;
  immediateActions: string[];
  incidentNoteDraft: string;
  memoryNote?: string;
  event: CareEvent;
  actionPlan: ActionPlan;
  tasks: CareTask[];
  followUp: FollowUp;
  guide: TrustedGuide;
  resource?: CareResource;
}

const KEYS = {
  caregiver: "ip_caregiver_profile",
  recipients: "ip_care_recipients",
  activeRecipient: "ip_active_recipient",
  events: "ip_care_events",
  plans: "ip_action_plans",
  tasks: "ip_care_tasks",
  followUps: "ip_follow_ups",
  latestWorkflow: "ip_latest_workflow",
};

const COLLECTION_LIMITS = {
  recipients: 10,
  events: 200,
  plans: 200,
  tasks: 200,
  followUps: 100,
} as const;

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function careId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${suffix}`;
}

export function getCaregiverProfile(): CaregiverProfile | null {
  return readLocal<CaregiverProfile | null>(KEYS.caregiver, null);
}

export function saveCaregiverProfile(
  input: Omit<CaregiverProfile, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
  }
): CaregiverProfile {
  const existing = getCaregiverProfile();
  const now = Date.now();
  const communicationPreference = ["gentle", "direct", "balanced"].includes(
    input.communicationPreference
  )
    ? input.communicationPreference
    : "balanced";
  const profile: CaregiverProfile = {
    displayName: sanitizeSingleLine(
      input.displayName,
      INPUT_LIMITS.profileFieldChars
    ),
    role: sanitizeSingleLine(input.role, INPUT_LIMITS.profileFieldChars),
    employer: sanitizeSingleLine(input.employer, INPUT_LIMITS.profileFieldChars),
    shift: sanitizeSingleLine(input.shift, INPUT_LIMITS.profileFieldChars),
    experience: sanitizeSingleLine(
      input.experience,
      INPUT_LIMITS.profileFieldChars
    ),
    communicationPreference,
    zipCode: sanitizeSingleLine(input.zipCode, 12),
    supportContact: sanitizeSingleLine(
      input.supportContact,
      INPUT_LIMITS.profileFieldChars
    ),
    id: input.id ?? existing?.id ?? careId("caregiver"),
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeLocal(KEYS.caregiver, profile);
  syncCaregiverProfile(profile);
  return profile;
}

export function getCareRecipients(): CareRecipient[] {
  return readLocal<CareRecipient[]>(KEYS.recipients, []);
}

export function saveCareRecipient(
  input: Omit<CareRecipient, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
  }
): CareRecipient {
  const recipients = getCareRecipients();
  const existing = input.id
    ? recipients.find((recipient) => recipient.id === input.id)
    : undefined;
  const now = Date.now();
  const recipient: CareRecipient = {
    clientCode: sanitizeSingleLine(
      input.clientCode,
      INPUT_LIMITS.profileFieldChars
    ),
    condition: sanitizeSingleLine(
      input.condition,
      INPUT_LIMITS.profileFieldChars
    ),
    stage: sanitizeSingleLine(input.stage, 80),
    livingSituation: sanitizeSingleLine(
      input.livingSituation,
      INPUT_LIMITS.profileFieldChars
    ),
    knownTriggers: sanitizeTextList(input.knownTriggers),
    mobility: sanitizeSingleLine(
      input.mobility,
      INPUT_LIMITS.profileFieldChars
    ),
    careNotes: sanitizePlainText(input.careNotes, 2_000),
    id: input.id ?? careId("client"),
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };
  const updated = existing
    ? recipients.map((item) => (item.id === recipient.id ? recipient : item))
    : [...recipients, recipient];
  writeLocal(KEYS.recipients, updated.slice(-COLLECTION_LIMITS.recipients));
  syncCareRecipient(
    recipient,
    getActiveCareRecipientId() === recipient.id
  );
  if (!getActiveCareRecipientId()) setActiveCareRecipientId(recipient.id);
  return recipient;
}

export function getActiveCareRecipientId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.activeRecipient);
}

export function setActiveCareRecipientId(id: string): void {
  if (typeof window === "undefined") return;
  const safeId = sanitizeSingleLine(id, INPUT_LIMITS.profileFieldChars);
  localStorage.setItem(KEYS.activeRecipient, safeId);
  syncActiveCareRecipient(safeId);
}

export function getActiveCareRecipient(): CareRecipient | null {
  const recipients = getCareRecipients();
  const activeId = getActiveCareRecipientId();
  return recipients.find((recipient) => recipient.id === activeId) ?? recipients[0] ?? null;
}

export function getCareEvents(): CareEvent[] {
  return readLocal<CareEvent[]>(KEYS.events, []);
}

export function saveCareEvent(
  event: CareEvent,
  synchronize = true
): void {
  const events = getCareEvents();
  const existing = events.some((item) => item.id === event.id);
  const updated = existing
    ? events.map((item) => (item.id === event.id ? event : item))
    : [event, ...events];
  writeLocal(KEYS.events, updated.slice(0, COLLECTION_LIMITS.events));
  if (synchronize) syncCareEvent(event);
}

export function updateCareEventOutcome(eventId: string, outcome: string): void {
  const events = getCareEvents().map((event) =>
    event.id === eventId
      ? {
          ...event,
          outcome: sanitizePlainText(outcome, 500),
          status: "resolved" as const,
        }
      : event
  );
  writeLocal(KEYS.events, events);
  syncCareEventOutcome(eventId, outcome);
}

export function getActionPlans(): ActionPlan[] {
  return readLocal<ActionPlan[]>(KEYS.plans, []);
}

export function saveActionPlan(
  plan: ActionPlan,
  synchronize = true
): void {
  const plans = getActionPlans();
  if (plans.some((item) => item.id === plan.id)) return;
  writeLocal(KEYS.plans, [plan, ...plans].slice(0, COLLECTION_LIMITS.plans));
  if (synchronize) syncActionPlan(plan);
}

export function getCareTasks(): CareTask[] {
  return readLocal<CareTask[]>(KEYS.tasks, []);
}

function notifyCareTaskChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ip-care-tasks-changed"));
}

export function saveCareTask(
  task: CareTask,
  synchronize = true
): void {
  const tasks = getCareTasks();
  const existing = tasks.some((item) => item.id === task.id);
  const normalized: CareTask = {
    ...task,
    details: task.details ?? "",
    recurrence: task.recurrence ?? "none",
    reminderMinutes: task.reminderMinutes ?? null,
  };
  const updated = existing
    ? tasks.map((item) => (item.id === task.id ? normalized : item))
    : [normalized, ...tasks];
  writeLocal(KEYS.tasks, updated.slice(0, COLLECTION_LIMITS.tasks));
  if (synchronize) syncCareTask(normalized);
  notifyCareTaskChange();
}

function nextRecurringDue(
  dueAt: number,
  recurrence: "daily" | "weekly"
): number {
  const next = new Date(dueAt);
  const daysToAdd = recurrence === "daily" ? 1 : 7;

  do {
    next.setDate(next.getDate() + daysToAdd);
  } while (next.getTime() <= Date.now());

  return next.getTime();
}

export function completeCareTask(taskId: string): CareTask | null {
  const task = getCareTasks().find((item) => item.id === taskId);
  if (!task) return null;

  const recurrence = task.recurrence ?? "none";
  const now = Date.now();
  const updated: CareTask =
    recurrence !== "none" && task.dueAt
      ? {
          ...task,
          completed: false,
          dueAt: nextRecurringDue(task.dueAt, recurrence),
          lastCompletedAt: now,
        }
      : { ...task, completed: true, lastCompletedAt: now };

  saveCareTask(updated);
  return updated;
}

export function toggleCareTask(taskId: string): void {
  const task = getCareTasks().find((item) => item.id === taskId);
  if (!task) return;

  if (!task.completed) {
    completeCareTask(taskId);
    return;
  }

  saveCareTask({ ...task, completed: false, lastCompletedAt: undefined });
}

export function deleteCareTask(taskId: string): void {
  writeLocal(
    KEYS.tasks,
    getCareTasks().filter((task) => task.id !== taskId)
  );
  deleteCareTaskFromCloud(taskId);
  notifyCareTaskChange();
}

export function getFollowUps(): FollowUp[] {
  return readLocal<FollowUp[]>(KEYS.followUps, []).filter(
    (followUp) =>
      followUp.prompt !==
      "What changed after the action, and what should be remembered next time?"
  );
}

export function saveFollowUp(
  followUp: FollowUp,
  synchronize = true
): void {
  const followUps = getFollowUps();
  if (followUps.some((item) => item.id === followUp.id)) return;
  writeLocal(
    KEYS.followUps,
    [followUp, ...followUps].slice(0, COLLECTION_LIMITS.followUps)
  );
  if (synchronize) syncFollowUp(followUp);
}

export function completeFollowUp(followUpId: string): void {
  writeLocal(
    KEYS.followUps,
    getFollowUps().map((followUp) =>
      followUp.id === followUpId ? { ...followUp, completed: true } : followUp
    )
  );
  syncFollowUpCompletion(followUpId, true);
}

export function saveWorkflowResult(workflow: CareWorkflowResult): void {
  const existingEvents = getCareEvents();
  const existingPlans = getActionPlans();
  const existingTasks = getCareTasks();
  const existingFollowUps = getFollowUps();
  const hasMatchingOpenFollowUp = existingFollowUps.some((followUp) => {
    if (followUp.completed || followUp.recipientId !== workflow.event.recipientId) {
      return false;
    }
    return existingEvents.some(
      (event) =>
        event.id === followUp.eventId && event.issue === workflow.event.issue
    );
  });

  const events = [
    workflow.event,
    ...existingEvents.filter((event) => event.id !== workflow.event.id),
  ].slice(0, COLLECTION_LIMITS.events);
  const plans = [
    workflow.actionPlan,
    ...existingPlans.filter((plan) => plan.id !== workflow.actionPlan.id),
  ].slice(0, COLLECTION_LIMITS.plans);
  const workflowTaskIds = new Set(workflow.tasks.map((task) => task.id));
  const tasks = [
    ...workflow.tasks,
    ...existingTasks.filter((task) => !workflowTaskIds.has(task.id)),
  ].slice(0, COLLECTION_LIMITS.tasks);
  const followUps = hasMatchingOpenFollowUp
    ? existingFollowUps
    : [workflow.followUp, ...existingFollowUps].slice(
        0,
        COLLECTION_LIMITS.followUps
      );

  writeLocal(KEYS.events, events);
  writeLocal(KEYS.plans, plans);
  writeLocal(KEYS.tasks, tasks);
  writeLocal(KEYS.followUps, followUps);
  writeLocal(KEYS.latestWorkflow, workflow);
  syncWorkflowResult(workflow, !hasMatchingOpenFollowUp);
}

export function getLatestWorkflow(): CareWorkflowResult | null {
  return readLocal<CareWorkflowResult | null>(KEYS.latestWorkflow, null);
}

export const TRUSTED_GUIDES: TrustedGuide[] = [
  {
    id: "guide_wandering",
    title: "Wandering and getting lost",
    description: "Practical safeguards and ways to reduce wandering risk.",
    category: "wandering",
    sourceTitle: "National Institute on Aging",
    sourceUrl: "https://www.nia.nih.gov/health/wandering-and-alzheimers-disease",
    reviewedAt: "July 9, 2024",
  },
  {
    id: "guide_agitation",
    title: "Agitation, aggression, and sundowning",
    description: "Possible triggers, de-escalation ideas, and when to seek help.",
    category: "agitation",
    sourceTitle: "National Institute on Aging",
    sourceUrl:
      "https://www.nia.nih.gov/health/alzheimers-changes-behavior-and-communication/coping-agitation-aggression-and-sundowning",
    reviewedAt: "July 17, 2024",
  },
  {
    id: "guide_communication",
    title: "Communicating with a person who has Alzheimer’s",
    description: "Simple ways to make conversations calmer and clearer.",
    category: "communication",
    sourceTitle: "National Institute on Aging",
    sourceUrl: "https://www.nia.nih.gov/health/alzheimers-changes-behavior-and-communication",
    reviewedAt: "June 5, 2025",
  },
  {
    id: "guide_self_care",
    title: "Caring for yourself as a caregiver",
    description: "Support options and ways to protect your own wellbeing.",
    category: "self-care",
    sourceTitle: "National Institute on Aging",
    sourceUrl:
      "https://www.nia.nih.gov/health/alzheimers-caregiving/alzheimers-caregiving-caring-yourself",
    reviewedAt: "Verified July 2026",
  },
  {
    id: "guide_medical",
    title: "Common medical problems in Alzheimer’s",
    description: "Signs to observe and communicate to the clinical team.",
    category: "medication",
    sourceTitle: "National Institute on Aging",
    sourceUrl:
      "https://www.nia.nih.gov/health/alzheimers-caregiving/common-medical-problems-alzheimers-disease-information-caregivers",
    reviewedAt: "Verified July 2026",
  },
];

export function getCareResources(zipCode = ""): CareResource[] {
  const location = zipCode.trim() ? `Near ${zipCode.trim()}` : "United States";
  return [
    {
      id: "resource_eldercare",
      title: "Local caregiver support",
      description:
        "Find local counseling, support groups, caregiver training, respite, and help accessing services.",
      category: "caregiver-support",
      locationLabel: location,
      url: "https://eldercare.acl.gov/home",
      phone: "800-677-1116",
      verifiedBy: "Administration for Community Living",
      reviewedAt: "July 27, 2026",
    },
    {
      id: "resource_211",
      title: "211 local help",
      description:
        "Find nearby help with food, utilities, housing, transportation, healthcare, and caregiver needs.",
      category: "daily-needs",
      locationLabel: location,
      url: "https://211.org/about-us/your-local-211",
      phone: "211",
      verifiedBy: "United Way 211",
      reviewedAt: "July 27, 2026",
    },
    {
      id: "resource_respite",
      title: "National Respite Locator",
      description:
        "Search for respite services that can provide a short break from day-to-day caregiving.",
      category: "respite",
      locationLabel: location,
      url: "https://archrespite.org/respitelocator/",
      verifiedBy: "ARCH National Respite Network",
      reviewedAt: "July 27, 2026",
    },
    {
      id: "resource_state_support",
      title: "Caregiver services by state",
      description:
        "Browse state-specific caregiver programs, benefits guidance, legal help, and support.",
      category: "caregiver-support",
      locationLabel: "All U.S. states",
      url: "https://www.caregiver.org/connecting-caregivers/services-by-state/",
      verifiedBy: "Family Caregiver Alliance",
      reviewedAt: "July 27, 2026",
    },
    {
      id: "resource_care_compare",
      title: "Medicare Care Compare",
      description:
        "Compare Medicare-certified home health, hospice, nursing, and other care providers near you.",
      category: "care-provider",
      locationLabel: location,
      url: "https://www.medicare.gov/care-compare/",
      verifiedBy: "Medicare",
      reviewedAt: "July 27, 2026",
    },
    {
      id: "resource_alz",
      title: "Dementia caregiver support",
      description:
        "Find local caregiver support groups, education, and dementia-specific guidance.",
      category: "caregiver-support",
      locationLabel: location,
      url: "https://www.alz.org/help-support/community",
      verifiedBy: "Alzheimer’s Association",
      reviewedAt: "July 27, 2026",
    },
    {
      id: "resource_988",
      title: "988 Suicide & Crisis Lifeline",
      description: "Immediate confidential crisis support by call, text, or chat.",
      category: "crisis",
      locationLabel: "United States",
      url: "https://988lifeline.org/",
      phone: "988",
      verifiedBy: "U.S. 988 Lifeline",
      reviewedAt: "July 27, 2026",
    },
  ];
}
