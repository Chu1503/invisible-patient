import "server-only";

function positiveInteger(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

export interface AnthropicSettings {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
}

export function getAnthropicSettings(): AnthropicSettings {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  return {
    apiKey,
    model: process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-4-5",
    maxOutputTokens: positiveInteger("ANTHROPIC_MAX_OUTPUT_TOKENS", 220, 512),
    timeoutMs: positiveInteger("ANTHROPIC_TIMEOUT_MS", 30_000, 60_000),
    maxRetries: positiveInteger("ANTHROPIC_MAX_RETRIES", 1, 2),
  };
}

export function getRateLimitSettings() {
  return {
    windowMs: positiveInteger("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1_000, 60 * 60 * 1_000),
    apiRequests: positiveInteger("API_RATE_LIMIT_MAX", 60, 1_000),
    loginAttempts: positiveInteger("LOGIN_RATE_LIMIT_MAX", 5, 20),
    claudeRequests: positiveInteger("CLAUDE_RATE_LIMIT_MAX", 12, 100),
    claudeTokens: positiveInteger("CLAUDE_TOKEN_BUDGET", 30_000, 1_000_000),
  };
}

export function getAllowedAppOrigins(): string[] {
  const configured = process.env.MOBILE_APP_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured?.length ? configured : ["https://localhost"];
}
