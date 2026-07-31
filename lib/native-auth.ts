export const NATIVE_AUTH_SCHEME = "com.chu1503.invisiblepatient";
export const NATIVE_AUTH_CALLBACK_URL = `${NATIVE_AUTH_SCHEME}://auth/callback`;

export function isNativeAuthCallback(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === `${NATIVE_AUTH_SCHEME}:` &&
      url.hostname === "auth" &&
      url.pathname === "/callback"
    );
  } catch {
    return false;
  }
}
