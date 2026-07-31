import "server-only";

import {
  INPUT_LIMITS,
  sanitizePlainText,
  sanitizeSingleLine,
  sanitizeTextList,
} from "./input";
import type { CareEvent, CareIssue, CareRecipient, WorkflowRisk } from "./care";
import type { ChatContext } from "./prompts";

type UnknownRecord = Record<string, unknown>;

interface RateHit {
  at: number;
  cost: number;
}

interface RateLimitStore {
  buckets: Map<string, RateHit[]>;
  lastCleanup: number;
}

interface GlobalRateLimitState {
  __invisiblePatientRateLimits?: RateLimitStore;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export class RequestValidationError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
  }
}

const globalRateLimitState = globalThis as typeof globalThis & GlobalRateLimitState;
const rateLimitStore: RateLimitStore =
  globalRateLimitState.__invisiblePatientRateLimits ??
  (globalRateLimitState.__invisiblePatientRateLimits = {
    buckets: new Map(),
    lastCleanup: Date.now(),
  });

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestValidationError(`${label} must be an object.`);
  }
  return value as UnknownRecord;
}

function optionalRecord(value: unknown, label: string): UnknownRecord | null {
  if (value === null || value === undefined) return null;
  return record(value, label);
}

function checkedText(
  value: unknown,
  label: string,
  maxLength: number,
  required = false
): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new RequestValidationError(`${label} is required.`);
    return undefined;
  }
  if (typeof value !== "string") {
    throw new RequestValidationError(`${label} must be text.`);
  }
  if (value.length > maxLength) {
    throw new RequestValidationError(
      `${label} exceeds the ${maxLength} character limit.`,
      413
    );
  }

  const clean = sanitizePlainText(value, maxLength);
  if (required && !clean) {
    throw new RequestValidationError(`${label} is required.`);
  }
  return clean || undefined;
}

function optionalStringList(
  value: unknown,
  label: string,
  maxItems: number = 20,
  maxItemLength: number = INPUT_LIMITS.careListItemChars
): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new RequestValidationError(`${label} is malformed or too large.`);
  }
  for (const item of value) {
    if (typeof item !== "string" || item.length > maxItemLength) {
      throw new RequestValidationError(`${label} contains an invalid value.`);
    }
  }
  return sanitizeTextList(value, maxItems, maxItemLength);
}

export async function readBoundedJson(
  request: Request,
  maxBytes = INPUT_LIMITS.apiBodyBytes
): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new RequestValidationError("Content-Type must be application/json.", 415);
  }

  const declaredLength = Number.parseInt(
    request.headers.get("content-length") ?? "0",
    10
  );
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestValidationError("Request body is too large.", 413);
  }
  if (!request.body) {
    throw new RequestValidationError("A request body is required.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RequestValidationError("Request body is too large.", 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestValidationError("Request body contains malformed JSON.");
  }
}

function expectedRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  return `${forwardedProtocol || requestUrl.protocol.replace(":", "")}://${forwardedHost || requestUrl.host}`;
}

export function corsHeadersForRequest(
  request: Request,
  allowedAppOrigins: string[]
): HeadersInit {
  const origin = request.headers.get("origin");
  if (!origin) return {};

  if (origin === expectedRequestOrigin(request)) return {};
  if (!allowedAppOrigins.includes(origin)) {
    throw new RequestValidationError("Cross-origin requests are not allowed.", 403);
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function sanitizeChatContext(value: unknown): ChatContext | undefined {
  if (value === undefined || value === null) return undefined;
  const context = record(value, "context");

  let zbiAnswers: number[] | undefined;
  if (context.zbiAnswers !== undefined) {
    if (
      !Array.isArray(context.zbiAnswers) ||
      context.zbiAnswers.length > 12 ||
      context.zbiAnswers.some(
        (answer) => !Number.isInteger(answer) || answer < 0 || answer > 4
      )
    ) {
      throw new RequestValidationError("context.zbiAnswers is malformed.");
    }
    zbiAnswers = context.zbiAnswers as number[];
  }

  const allowedRiskLevels = new Set(["low", "moderate", "high", "crisis"]);
  const riskLevel = checkedText(context.riskLevel, "context.riskLevel", 16);
  if (riskLevel && !allowedRiskLevels.has(riskLevel)) {
    throw new RequestValidationError("context.riskLevel is invalid.");
  }

  const caregiverSource = optionalRecord(context.caregiver, "context.caregiver");
  const recipientSource = optionalRecord(context.recipient, "context.recipient");
  const workflowSource = optionalRecord(context.workflow, "context.workflow");

  return {
    zbiAnswers,
    riskLevel,
    dominantThemes: optionalStringList(
      context.dominantThemes,
      "context.dominantThemes",
      8,
      80
    ),
    caregiver: caregiverSource
      ? {
          displayName: checkedText(
            caregiverSource.displayName,
            "context.caregiver.displayName",
            120
          ),
          role: checkedText(caregiverSource.role, "context.caregiver.role", 80),
          shift: checkedText(caregiverSource.shift, "context.caregiver.shift", 80),
          experience: checkedText(
            caregiverSource.experience,
            "context.caregiver.experience",
            120
          ),
          communicationPreference: checkedText(
            caregiverSource.communicationPreference,
            "context.caregiver.communicationPreference",
            20
          ),
        }
      : null,
    recipient: recipientSource
      ? {
          clientCode: checkedText(
            recipientSource.clientCode,
            "context.recipient.clientCode",
            120
          ),
          condition: checkedText(
            recipientSource.condition,
            "context.recipient.condition",
            120
          ),
          stage: checkedText(recipientSource.stage, "context.recipient.stage", 80),
          routines: optionalStringList(
            recipientSource.routines,
            "context.recipient.routines"
          ),
          knownTriggers: optionalStringList(
            recipientSource.knownTriggers,
            "context.recipient.knownTriggers"
          ),
          approvedInstructions: optionalStringList(
            recipientSource.approvedInstructions,
            "context.recipient.approvedInstructions"
          ),
        }
      : null,
    workflow: workflowSource
      ? {
          issue: checkedText(workflowSource.issue, "context.workflow.issue", 40),
          risk: checkedText(workflowSource.risk, "context.workflow.risk", 20),
          safetyQuestion: checkedText(
            workflowSource.safetyQuestion,
            "context.workflow.safetyQuestion",
            300
          ),
          memoryNote: checkedText(
            workflowSource.memoryNote,
            "context.workflow.memoryNote",
            500
          ),
          immediateActions: optionalStringList(
            workflowSource.immediateActions,
            "context.workflow.immediateActions",
            5,
            300
          ),
        }
      : null,
  };
}

export function validateChatPayload(value: unknown): {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  context?: ChatContext;
} {
  const body = record(value, "request body");
  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    body.messages.length > INPUT_LIMITS.chatMessages
  ) {
    throw new RequestValidationError(
      `messages must contain between 1 and ${INPUT_LIMITS.chatMessages} items.`
    );
  }

  let totalCharacters = 0;
  const messages = body.messages.map((item, index) => {
    const message = record(item, `messages[${index}]`);
    if (message.role !== "user" && message.role !== "assistant") {
      throw new RequestValidationError(`messages[${index}].role is invalid.`);
    }
    const role = message.role as "user" | "assistant";
    const content = checkedText(
      message.content,
      `messages[${index}].content`,
      INPUT_LIMITS.chatMessageChars,
      true
    )!;
    totalCharacters += content.length;
    return { role, content };
  });

  if (totalCharacters > INPUT_LIMITS.chatTotalChars) {
    throw new RequestValidationError("The conversation is too large.", 413);
  }

  return {
    messages,
    context: sanitizeChatContext(body.context),
  };
}

const CARE_ISSUES = new Set<CareIssue>([
  "wandering",
  "agitation",
  "fall",
  "medication",
  "emotional",
  "general",
]);
const WORKFLOW_RISKS = new Set<WorkflowRisk>(["low", "urgent", "emergency"]);

function sanitizeRecipient(value: unknown): CareRecipient | null {
  const source = optionalRecord(value, "recipient");
  if (!source) return null;

  const now = Date.now();
  return {
    id: checkedText(source.id, "recipient.id", 120) ?? "unassigned",
    clientCode: checkedText(source.clientCode, "recipient.clientCode", 120) ?? "",
    condition: checkedText(source.condition, "recipient.condition", 120) ?? "",
    stage: checkedText(source.stage, "recipient.stage", 80) ?? "",
    livingSituation:
      checkedText(source.livingSituation, "recipient.livingSituation", 120) ?? "",
    routines: optionalStringList(source.routines, "recipient.routines") ?? [],
    knownTriggers:
      optionalStringList(source.knownTriggers, "recipient.knownTriggers") ?? [],
    mobility: checkedText(source.mobility, "recipient.mobility", 120) ?? "",
    approvedInstructions:
      optionalStringList(
        source.approvedInstructions,
        "recipient.approvedInstructions"
      ) ?? [],
    createdAt:
      typeof source.createdAt === "number" && Number.isFinite(source.createdAt)
        ? source.createdAt
        : now,
    updatedAt:
      typeof source.updatedAt === "number" && Number.isFinite(source.updatedAt)
        ? source.updatedAt
        : now,
  };
}

function sanitizeCareEvents(value: unknown): CareEvent[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new RequestValidationError("recentEvents is malformed or too large.");
  }

  return value.map((item, index) => {
    const event = record(item, `recentEvents[${index}]`);
    if (
      typeof event.issue !== "string" ||
      !CARE_ISSUES.has(event.issue as CareIssue) ||
      typeof event.risk !== "string" ||
      !WORKFLOW_RISKS.has(event.risk as WorkflowRisk) ||
      (event.status !== "open" && event.status !== "resolved")
    ) {
      throw new RequestValidationError(`recentEvents[${index}] is malformed.`);
    }

    return {
      id: checkedText(event.id, `recentEvents[${index}].id`, 120, true)!,
      recipientId: checkedText(
        event.recipientId,
        `recentEvents[${index}].recipientId`,
        120,
        true
      )!,
      issue: event.issue as CareIssue,
      summary: checkedText(
        event.summary,
        `recentEvents[${index}].summary`,
        INPUT_LIMITS.chatMessageChars,
        true
      )!,
      risk: event.risk as WorkflowRisk,
      trigger: checkedText(
        event.trigger,
        `recentEvents[${index}].trigger`,
        INPUT_LIMITS.careListItemChars
      ),
      outcome: checkedText(
        event.outcome,
        `recentEvents[${index}].outcome`,
        500
      ),
      status: event.status as "open" | "resolved",
      timestamp:
        typeof event.timestamp === "number" && Number.isFinite(event.timestamp)
          ? event.timestamp
          : Date.now(),
    };
  });
}

export function validateWorkflowPayload(value: unknown): {
  message: string;
  recipient: CareRecipient | null;
  recentEvents: CareEvent[];
  zipCode?: string;
  caregiverName?: string;
} {
  const body = record(value, "request body");
  return {
    message: checkedText(
      body.message,
      "message",
      INPUT_LIMITS.chatMessageChars,
      true
    )!,
    recipient: sanitizeRecipient(body.recipient),
    recentEvents: sanitizeCareEvents(body.recentEvents),
    zipCode: checkedText(body.zipCode, "zipCode", 12),
    caregiverName: checkedText(body.caregiverName, "caregiverName", 120),
  };
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown";
  const agent = sanitizeSingleLine(request.headers.get("user-agent"), 80);
  return `${address}:${agent}`;
}

export function consumeRateLimit(
  request: Request,
  namespace: string,
  limit: number,
  windowMs: number,
  cost = 1
): RateLimitResult {
  const now = Date.now();
  const key = `${namespace}:${clientKey(request)}`;
  const cutoff = now - windowMs;
  const active = (rateLimitStore.buckets.get(key) ?? []).filter(
    (hit) => hit.at > cutoff
  );
  const used = active.reduce((sum, hit) => sum + hit.cost, 0);
  const allowed = used + cost <= limit;

  if (allowed) {
    active.push({ at: now, cost });
    rateLimitStore.buckets.set(key, active);
  } else if (active.length) {
    rateLimitStore.buckets.set(key, active);
  }

  if (now - rateLimitStore.lastCleanup > windowMs) {
    for (const [bucketKey, hits] of rateLimitStore.buckets) {
      const fresh = hits.filter((hit) => hit.at > cutoff);
      if (fresh.length) rateLimitStore.buckets.set(bucketKey, fresh);
      else rateLimitStore.buckets.delete(bucketKey);
    }
    rateLimitStore.lastCleanup = now;
  }

  const resetAt = active.length ? active[0].at + windowMs : now + windowMs;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - used - (allowed ? cost : 0)),
    resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000));
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
    ...(result.allowed ? {} : { "Retry-After": String(retryAfter) }),
  };
}

export function estimatedTokenCost(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  maxOutputTokens: number
): number {
  const inputCharacters =
    systemPrompt.length +
    messages.reduce((sum, message) => sum + message.content.length + 12, 0);
  return Math.ceil(inputCharacters / 4) + maxOutputTokens;
}
