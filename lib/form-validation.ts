function joinRequirements(requirements: string[]): string {
  if (requirements.length === 1) return requirements[0];
  if (requirements.length === 2) return requirements.join(" and ");
  return `${requirements.slice(0, -1).join(", ")}, and ${requirements.at(-1)}`;
}

export function getPasswordError(password: string): string {
  const missing: string[] = [];

  if (password.length < 10) missing.push("at least 10 characters");
  if (!/[A-Z]/.test(password)) missing.push("an uppercase letter");
  if (!/[0-9]/.test(password)) missing.push("a number");
  if (!/[^A-Za-z0-9]/.test(password)) missing.push("a symbol");

  return missing.length
    ? `Your password needs ${joinRequirements(missing)}.`
    : "";
}

export function isValidEmailAddress(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length > 254) return false;

  const parts = normalized.split("@");
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (
    !localPart ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)
  ) {
    return false;
  }

  const labels = domain.split(".");
  if (labels.length < 2 || labels.at(-1)!.length < 2) return false;

  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)
  );
}

export function isValidZipCode(value: string): boolean {
  const normalized = value.trim();
  if (!/^[0-9]{5}(-[0-9]{4})?$/.test(normalized)) return false;

  const primaryCode = Number(normalized.slice(0, 5));
  return primaryCode >= 501 && primaryCode <= 99950;
}
