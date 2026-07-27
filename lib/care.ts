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
  routines: string[];
  knownTriggers: string[];
  mobility: string;
  approvedInstructions: string[];
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
  owner: string;
  dueAt?: number;
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
  category: "local-care" | "caregiver-support" | "crisis" | "training";
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
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
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
  const profile: CaregiverProfile = {
    ...input,
    id: input.id ?? existing?.id ?? careId("caregiver"),
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeLocal(KEYS.caregiver, profile);
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
    ...input,
    id: input.id ?? careId("client"),
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };
  const updated = existing
    ? recipients.map((item) => (item.id === recipient.id ? recipient : item))
    : [...recipients, recipient];
  writeLocal(KEYS.recipients, updated);
  if (!getActiveCareRecipientId()) setActiveCareRecipientId(recipient.id);
  return recipient;
}

export function getActiveCareRecipientId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.activeRecipient);
}

export function setActiveCareRecipientId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.activeRecipient, id);
}

export function getActiveCareRecipient(): CareRecipient | null {
  const recipients = getCareRecipients();
  const activeId = getActiveCareRecipientId();
  return recipients.find((recipient) => recipient.id === activeId) ?? recipients[0] ?? null;
}

export function getCareEvents(): CareEvent[] {
  return readLocal<CareEvent[]>(KEYS.events, []);
}

export function saveCareEvent(event: CareEvent): void {
  const events = getCareEvents();
  const existing = events.some((item) => item.id === event.id);
  writeLocal(
    KEYS.events,
    existing
      ? events.map((item) => (item.id === event.id ? event : item))
      : [event, ...events]
  );
}

export function updateCareEventOutcome(eventId: string, outcome: string): void {
  const events = getCareEvents().map((event) =>
    event.id === eventId
      ? { ...event, outcome: outcome.trim(), status: "resolved" as const }
      : event
  );
  writeLocal(KEYS.events, events);
}

export function getActionPlans(): ActionPlan[] {
  return readLocal<ActionPlan[]>(KEYS.plans, []);
}

export function saveActionPlan(plan: ActionPlan): void {
  const plans = getActionPlans();
  if (plans.some((item) => item.id === plan.id)) return;
  writeLocal(KEYS.plans, [plan, ...plans]);
}

export function getCareTasks(): CareTask[] {
  return readLocal<CareTask[]>(KEYS.tasks, []);
}

export function saveCareTask(task: CareTask): void {
  const tasks = getCareTasks();
  const existing = tasks.some((item) => item.id === task.id);
  writeLocal(
    KEYS.tasks,
    existing
      ? tasks.map((item) => (item.id === task.id ? task : item))
      : [task, ...tasks]
  );
}

export function toggleCareTask(taskId: string): void {
  writeLocal(
    KEYS.tasks,
    getCareTasks().map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )
  );
}

export function getFollowUps(): FollowUp[] {
  return readLocal<FollowUp[]>(KEYS.followUps, []).filter(
    (followUp) =>
      followUp.prompt !==
      "What changed after the action, and what should be remembered next time?"
  );
}

export function saveFollowUp(followUp: FollowUp): void {
  const followUps = getFollowUps();
  if (followUps.some((item) => item.id === followUp.id)) return;
  writeLocal(KEYS.followUps, [followUp, ...followUps]);
}

export function completeFollowUp(followUpId: string): void {
  writeLocal(
    KEYS.followUps,
    getFollowUps().map((followUp) =>
      followUp.id === followUpId ? { ...followUp, completed: true } : followUp
    )
  );
}

export function saveWorkflowResult(workflow: CareWorkflowResult): void {
  const existingEvents = getCareEvents();
  const hasMatchingOpenFollowUp = getFollowUps().some((followUp) => {
    if (followUp.completed || followUp.recipientId !== workflow.event.recipientId) {
      return false;
    }
    return existingEvents.some(
      (event) =>
        event.id === followUp.eventId && event.issue === workflow.event.issue
    );
  });

  saveCareEvent(workflow.event);
  saveActionPlan(workflow.actionPlan);
  workflow.tasks.forEach(saveCareTask);
  if (!hasMatchingOpenFollowUp) {
    saveFollowUp(workflow.followUp);
  }
  writeLocal(KEYS.latestWorkflow, workflow);
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
      title: "Eldercare Locator",
      description: "Find local aging, transportation, training, and support services.",
      category: "local-care",
      locationLabel: location,
      url: "https://eldercare.acl.gov/home",
      phone: "800-677-1116",
      verifiedBy: "Administration for Community Living",
      reviewedAt: "March 2, 2026",
    },
    {
      id: "resource_alz",
      title: "Alzheimer’s Association 24/7 Helpline",
      description: "Care consultation, local programs, and dementia information.",
      category: "caregiver-support",
      locationLabel: location,
      url: "https://www.alz.org/help-support/resources/helpline",
      phone: "800-272-3900",
      verifiedBy: "National Institute on Aging resource listing",
      reviewedAt: "July 2026",
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
      reviewedAt: "July 2026",
    },
  ];
}
