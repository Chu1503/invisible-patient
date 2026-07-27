import {
  TRUSTED_GUIDES,
  careId,
  getCareResources,
  type CareEvent,
  type CareIssue,
  type CareRecipient,
  type CareResource,
  type CareTask,
  type CareWorkflowResult,
  type TrustedGuide,
  type WorkflowRisk,
} from "./care";

interface WorkflowInput {
  message: string;
  recipient: CareRecipient | null;
  recentEvents: CareEvent[];
  zipCode?: string;
  caregiverName?: string;
}

interface WorkflowDefinition {
  title: string;
  keywords: string[];
  urgentKeywords?: string[];
  emergencyKeywords?: string[];
  safetyQuestion?: string;
  actions: string[];
  task: string;
  followUp: string;
  guideId: string;
  resourceCategory?: CareResource["category"];
}

const DEFINITIONS: Record<CareIssue, WorkflowDefinition> = {
  wandering: {
    title: "Wandering safety plan",
    keywords: [
      "wander",
      "trying to leave",
      "tried to leave",
      "walked out",
      "get out",
      "leave the house",
      "leave again",
      "pacing",
    ],
    urgentKeywords: ["trying to leave", "walked out", "outside", "door"],
    emergencyKeywords: ["missing", "can't find", "cannot find", "ran into traffic"],
    safetyQuestion: "Is the person with you and away from exits or traffic right now?",
    actions: [
      "Confirm immediate safety and follow the approved wandering protocol.",
      "Use a calm tone, avoid arguing, and redirect toward a familiar activity.",
      "Record the time, setting, and possible trigger for the next handoff.",
    ],
    task: "Review the wandering event with the supervisor or clinical lead",
    followUp: "What helped during the wandering event, and what should the next caregiver know?",
    guideId: "guide_wandering",
    resourceCategory: "local-care",
  },
  agitation: {
    title: "Calm and de-escalate",
    keywords: [
      "aggressive",
      "aggression",
      "agitated",
      "angry",
      "yelling",
      "hit me",
      "hitting",
      "sundown",
      "combative",
      "frustrated",
    ],
    urgentKeywords: ["hit me", "hitting", "combative", "weapon"],
    emergencyKeywords: ["seriously hurt", "unconscious", "weapon"],
    safetyQuestion: "Are you and the person you are supporting physically safe right now?",
    actions: [
      "Create space, reduce noise, and avoid arguing or physically crowding the person.",
      "Use a calm voice and redirect toward a familiar, low-demand activity.",
      "Follow the agency escalation plan if the behavior continues or safety changes.",
    ],
    task: "Document possible agitation triggers for the next shift",
    followUp: "Which calming approach helped, and was there a trigger worth remembering?",
    guideId: "guide_agitation",
    resourceCategory: "training",
  },
  fall: {
    title: "Fall response",
    keywords: ["fell", "fall", "slipped", "on the floor", "tripped"],
    urgentKeywords: ["hit head", "pain", "bleeding", "cannot stand", "can't stand"],
    emergencyKeywords: ["unconscious", "not breathing", "severe bleeding"],
    safetyQuestion: "Is the person awake, breathing normally, and free from severe bleeding?",
    actions: [
      "Follow the agency fall protocol and do not rush to lift the person.",
      "Check for pain, head impact, bleeding, or a sudden change in alertness.",
      "Contact the designated clinical lead or emergency services as the protocol requires.",
    ],
    task: "Complete the fall handoff and incident follow up",
    followUp: "Was the fall protocol completed, and is any prevention step needed for the next shift?",
    guideId: "guide_medical",
    resourceCategory: "training",
  },
  medication: {
    title: "Medication uncertainty",
    keywords: [
      "medication",
      "medicine",
      "dose",
      "dosage",
      "pill",
      "prescription",
      "missed med",
    ],
    urgentKeywords: ["wrong dose", "double dose", "overdose", "reaction"],
    emergencyKeywords: ["not breathing", "unconscious", "overdose"],
    safetyQuestion: "Was a dose missed, duplicated, or taken differently from the written plan?",
    actions: [
      "Do not guess or independently change the medication instructions.",
      "Check the approved medication record and contact the designated nurse, pharmacist, or supervisor.",
      "Document exactly what was taken, when, and who was contacted.",
    ],
    task: "Confirm the medication question with the designated clinical contact",
    followUp: "Was the medication question resolved, and does the care record need an update?",
    guideId: "guide_medical",
    resourceCategory: "training",
  },
  emotional: {
    title: "Caregiver reset",
    keywords: [
      "lost my patience",
      "snapped",
      "overwhelmed",
      "exhausted",
      "can't cope",
      "burned out",
      "burnt out",
      "feel guilty",
      "hate myself",
      "failing",
    ],
    urgentKeywords: ["can't cope", "hate myself"],
    emergencyKeywords: ["want to die", "kill myself", "hurt myself", "suicide"],
    safetyQuestion: "Are you safe right now, and can you step away briefly if you need to reset?",
    actions: [
      "Name what happened without judging yourself or minimizing the strain.",
      "Take one brief reset if the person is safely supported.",
      "Choose one human support option if the strain is continuing.",
    ],
    task: "Choose one support or recovery step before the next shift",
    followUp: "Did the reset or support step help you feel more able to continue safely?",
    guideId: "guide_self_care",
    resourceCategory: "caregiver-support",
  },
  general: {
    title: "Next care step",
    keywords: [],
    actions: [
      "Capture the specific event, what made it difficult, and what is needed next.",
      "Choose one manageable action instead of trying to solve everything at once.",
      "Add anything the next caregiver or clinical lead should know.",
    ],
    task: "Complete the next care action from today’s check in",
    followUp: "Did you complete the care action you planned?",
    guideId: "guide_communication",
    resourceCategory: "caregiver-support",
  },
};

function includesAny(text: string, values: string[] = []): boolean {
  return values.some((value) => text.includes(value));
}

function detectIssue(message: string): CareIssue {
  const lower = message.toLowerCase();
  const ordered: CareIssue[] = [
    "wandering",
    "fall",
    "medication",
    "agitation",
    "emotional",
  ];
  return (
    ordered.find((issue) => includesAny(lower, DEFINITIONS[issue].keywords)) ??
    "general"
  );
}

function hasExplicitCareCommitment(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\bremind me\b/.test(lower) ||
    /\b(?:i will|i'll|i need to|i should)\s+(?:call|contact|tell|report|document|check|review|ask|schedule|update|complete)\b/.test(
      lower
    )
  );
}

function detectRisk(message: string, definition: WorkflowDefinition): WorkflowRisk {
  const lower = message.toLowerCase();
  if (includesAny(lower, definition.emergencyKeywords)) return "emergency";
  if (includesAny(lower, definition.urgentKeywords)) return "urgent";
  return "low";
}

function selectGuide(id: string): TrustedGuide {
  return (
    TRUSTED_GUIDES.find((guide) => guide.id === id) ?? TRUSTED_GUIDES[0]
  );
}

function selectResource(
  zipCode: string,
  category?: CareResource["category"]
): CareResource | undefined {
  const resources = getCareResources(zipCode);
  return (
    resources.find((resource) => resource.category === category) ?? resources[0]
  );
}

export function buildCareWorkflow(
  input: WorkflowInput
): CareWorkflowResult | null {
  const now = Date.now();
  const issue = detectIssue(input.message);

  if (issue === "general" && !hasExplicitCareCommitment(input.message)) {
    return null;
  }

  const definition = DEFINITIONS[issue];
  const risk = detectRisk(input.message, definition);
  const recipientId = input.recipient?.id ?? "unassigned";
  const eventId = careId("event");
  const previous = input.recentEvents.find(
    (event) => event.recipientId === recipientId && event.issue === issue
  );
  const detectedTrigger = input.recipient?.knownTriggers.find((trigger) =>
    input.message.toLowerCase().includes(trigger.toLowerCase())
  );
  const memoryNote = previous
    ? previous.outcome
      ? `Last time, the recorded outcome was: ${previous.outcome}`
      : `A similar ${issue} event was recorded previously and still needs an outcome.`
    : detectedTrigger
      ? `This may connect to the known trigger: ${detectedTrigger}.`
      : undefined;

  const event: CareEvent = {
    id: eventId,
    recipientId,
    issue,
    summary: input.message.trim(),
    risk,
    trigger: detectedTrigger,
    status: "open",
    timestamp: now,
  };

  const guide = selectGuide(definition.guideId);
  const actionPlan = {
    id: careId("plan"),
    eventId,
    title: definition.title,
    steps:
      risk === "emergency"
        ? [
            "Use emergency services now and clearly state that the person has dementia.",
            "Then follow the agency emergency and notification protocol.",
          ]
        : definition.actions,
    sourceTitle: guide.sourceTitle,
    sourceUrl: guide.sourceUrl,
    reviewedAt: guide.reviewedAt,
    createdAt: now,
  };

  const tasks: CareTask[] = [
    {
      id: careId("task"),
      recipientId,
      eventId,
      title: definition.task,
      owner: input.caregiverName || "Caregiver",
      dueAt: now + 4 * 60 * 60 * 1000,
      completed: false,
      createdAt: now,
    },
  ];

  return {
    id: careId("workflow"),
    issue,
    risk,
    title: definition.title,
    safetyQuestion: definition.safetyQuestion,
    immediateActions: actionPlan.steps,
    incidentNoteDraft: [
      `Client: ${input.recipient?.clientCode || "Unassigned"}`,
      `Reported event: ${input.message.trim()}`,
      `Possible trigger: ${detectedTrigger || "Not identified"}`,
      "Safety status and actions taken: Caregiver review required.",
      `Follow up needed: ${definition.task}.`,
    ].join("\n"),
    memoryNote,
    event,
    actionPlan,
    tasks,
    followUp: {
      id: careId("followup"),
      recipientId,
      eventId,
      prompt: definition.followUp,
      dueAt: now + 20 * 60 * 60 * 1000,
      completed: false,
      createdAt: now,
    },
    guide,
    resource: selectResource(input.zipCode ?? "", definition.resourceCategory),
  };
}
