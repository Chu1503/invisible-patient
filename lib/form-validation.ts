export function isValidZipCode(value: string): boolean {
  const normalized = value.trim();
  if (!/^[0-9]{5}(-[0-9]{4})?$/.test(normalized)) return false;

  const primaryCode = Number(normalized.slice(0, 5));
  return primaryCode >= 501 && primaryCode <= 99950;
}
