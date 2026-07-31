export const INPUT_LIMITS = {
  apiBodyBytes: 32 * 1024,
  chatMessages: 24,
  chatMessageChars: 2_000,
  chatTotalChars: 16_000,
  forumPostChars: 1_200,
  forumReplyChars: 800,
  profileFieldChars: 120,
  careListItemChars: 180,
} as const;

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizePlainText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeSingleLine(value: unknown, maxLength: number): string {
  return sanitizePlainText(value, maxLength).replace(/\s+/g, " ").trim();
}

export function sanitizeTextList(
  value: unknown,
  maxItems: number = 20,
  maxItemLength: number = INPUT_LIMITS.careListItemChars
): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, maxItems)
    .map((item) => sanitizeSingleLine(item, maxItemLength))
    .filter(Boolean);
}

export function isValidZipCode(value: string): boolean {
  return value === "" || /^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/.test(value);
}
