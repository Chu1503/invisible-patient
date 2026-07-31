"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Check, Clock3 } from "lucide-react";
import {
  completeCareTask,
  getCareTasks,
  type CareTask,
} from "@/lib/care";
import { showTaskSystemReminder } from "@/lib/task-reminders";

const NOTIFIED_KEY = "ip_task_reminders_shown";
const SNOOZED_KEY = "ip_task_reminders_snoozed";

function readTimes(key: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function occurrenceKey(task: CareTask): string {
  return `${task.id}:${task.dueAt ?? "unscheduled"}`;
}

export default function TaskReminderManager() {
  const [activeTask, setActiveTask] = useState<CareTask | null>(null);

  const checkReminders = useCallback(() => {
    const now = Date.now();
    const shown = readTimes(NOTIFIED_KEY);
    const snoozed = readTimes(SNOOZED_KEY);
    const candidate = getCareTasks()
      .filter((task) => {
        if (
          task.completed ||
          !task.dueAt ||
          task.reminderMinutes == null
        ) {
          return false;
        }

        const key = occurrenceKey(task);
        const reminderAt =
          task.dueAt - task.reminderMinutes * 60 * 1000;
        const snoozedUntil = snoozed[key] ?? 0;

        return (
          now >= Math.max(reminderAt, snoozedUntil) &&
          now <= task.dueAt + 12 * 60 * 60 * 1000 &&
          !shown[key]
        );
      })
      .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))[0];

    if (!candidate) return;

    const key = occurrenceKey(candidate);
    const nextShown = { ...shown, [key]: now };
    const recentEntries = Object.entries(nextShown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);
    localStorage.setItem(
      NOTIFIED_KEY,
      JSON.stringify(Object.fromEntries(recentEntries))
    );
    setActiveTask(candidate);
    void showTaskSystemReminder(candidate);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(checkReminders, 250);
    const interval = window.setInterval(checkReminders, 30_000);
    window.addEventListener("ip-care-tasks-changed", checkReminders);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("ip-care-tasks-changed", checkReminders);
    };
  }, [checkReminders]);

  if (!activeTask) return null;

  return (
    <aside className="task-reminder-toast" aria-live="polite">
      <span className="task-reminder-icon" aria-hidden="true">
        <BellRing size={18} />
      </span>
      <div className="task-reminder-copy">
        <p>Have you completed this?</p>
        <h2>{activeTask.title}</h2>
        {activeTask.dueAt && (
          <span>
            Due{" "}
            {new Date(activeTask.dueAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <div className="task-reminder-actions">
        <button
          type="button"
          onClick={() => {
            completeCareTask(activeTask.id);
            setActiveTask(null);
          }}
        >
          <Check size={14} />
          Done
        </button>
        <button
          type="button"
          onClick={() => {
            const key = occurrenceKey(activeTask);
            const shown = readTimes(NOTIFIED_KEY);
            const snoozed = readTimes(SNOOZED_KEY);
            delete shown[key];
            snoozed[key] = Date.now() + 10 * 60 * 1000;
            localStorage.setItem(NOTIFIED_KEY, JSON.stringify(shown));
            localStorage.setItem(SNOOZED_KEY, JSON.stringify(snoozed));
            setActiveTask(null);
          }}
        >
          <Clock3 size={14} />
          10 min
        </button>
      </div>
    </aside>
  );
}
