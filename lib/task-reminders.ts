import type { CareTask } from "./care";

export type TaskReminderPermission =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "paused";

const REMINDERS_ENABLED_KEY = "ip_task_reminders_enabled";

export function getTaskReminderPermission(): TaskReminderPermission {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return "unsupported";
  }

  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "default";

  return localStorage.getItem(REMINDERS_ENABLED_KEY) === "true"
    ? "granted"
    : "paused";
}

async function registerReminderWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  return registration;
}

export async function enableTaskReminders(): Promise<TaskReminderPermission> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return "unsupported";
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    localStorage.removeItem(REMINDERS_ENABLED_KEY);
    window.dispatchEvent(new Event("ip-task-reminder-setting-changed"));
    return permission === "denied" ? "denied" : "default";
  }

  await registerReminderWorker();
  localStorage.setItem(REMINDERS_ENABLED_KEY, "true");
  window.dispatchEvent(new Event("ip-task-reminder-setting-changed"));
  return "granted";
}

export function pauseTaskReminders(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REMINDERS_ENABLED_KEY);
  window.dispatchEvent(new Event("ip-task-reminder-setting-changed"));
}

export async function showTaskSystemReminder(task: CareTask): Promise<void> {
  if (getTaskReminderPermission() !== "granted") return;

  try {
    const registration = await registerReminderWorker();
    await registration.showNotification("Care task reminder", {
      body: "A care task is due. Open The Invisible Patient to review it.",
      tag: `care-task-${task.id}-${task.dueAt ?? "unscheduled"}`,
      data: { url: "/tasks" },
    });
  } catch {
    // The task prompt remains available if the browser blocks system alerts.
  }
}
