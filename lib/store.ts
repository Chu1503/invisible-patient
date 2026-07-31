import { syncCheckin, syncLastMentalState } from "./cloud-sync";
import { INPUT_LIMITS, sanitizePlainText, sanitizeSingleLine } from "./input";

export type MentalState =
  | "calm"
  | "restless"
  | "anxious"
  | "hopeful"
  | "tired"
  | "overwhelmed";
export type RiskLevel = "low" | "moderate" | "high" | "crisis";

export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

export interface CheckinEntry {
  id: string;
  date: string;
  timestamp: number;
  mentalState: MentalState;
  zbiEstimate: number;
  zbiAnswers: number[];
  resonanceScore: number;
  emotions: string[];
  riskLevel: RiskLevel;
  messages: Message[];
}

export interface UserProfile {
  username: string;
  createdAt: number;
}

const KEYS = {
  profile: "ip_profile",
  checkins: "ip_checkins",
  lastState: "ip_last_state",
};

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.profile);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEYS.profile,
    JSON.stringify({
      ...profile,
      username: sanitizeSingleLine(
        profile.username,
        INPUT_LIMITS.profileFieldChars
      ),
    })
  );
}

export function ensureProfile(): UserProfile {
  const existing = getProfile();
  if (existing) return existing;
  const profile: UserProfile = { username: "CAREGIVER", createdAt: Date.now() };
  saveProfile(profile);
  return profile;
}

export function getCheckins(): CheckinEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.checkins);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CheckinEntry[];
  } catch {
    return [];
  }
}

export function saveCheckin(entry: CheckinEntry): void {
  if (typeof window === "undefined") return;
  const safeEntry: CheckinEntry = {
    ...entry,
    messages: entry.messages.slice(-50).map((message) => ({
      ...message,
      content: sanitizePlainText(
        message.content,
        INPUT_LIMITS.chatMessageChars
      ),
    })),
  };
  const bounded = [
    ...getCheckins().filter((checkin) => checkin.id !== entry.id),
    safeEntry,
  ]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-90);
  localStorage.setItem(KEYS.checkins, JSON.stringify(bounded));
  syncCheckin(safeEntry);
}

export function getLatestCheckin(): CheckinEntry | null {
  return getCheckins().sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;
}

export function getLatestZbiCheckin(): CheckinEntry | null {
  return (
    getCheckins()
      .filter((checkin) => (checkin.zbiAnswers ?? []).length > 0)
      .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null
  );
}

export function getLastMentalState(): MentalState {
  if (typeof window === "undefined") return "restless";
  return (localStorage.getItem(KEYS.lastState) as MentalState) || "restless";
}

export function saveLastMentalState(state: MentalState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.lastState, state);
  syncLastMentalState(state);
}

export function getLast7DaysCheckins(): CheckinEntry[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return getCheckins()
    .filter((checkin) => checkin.timestamp >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export const AURA_COLORS: Record<MentalState, string> = {
  calm: "#2E756D",
  restless: "#17645F",
  anxious: "#0B4B4A",
  hopeful: "#438275",
  tired: "#56716F",
  overwhelmed: "#063A3D",
};

export function generateId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function calculateZbiFromAnswers(answers: number[]): number {
  const raw = answers.reduce((sum, answer) => sum + answer, 0);
  return Math.round((raw / 48) * 88);
}
