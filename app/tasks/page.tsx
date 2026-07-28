"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  Clock3,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  careId,
  completeCareTask,
  deleteCareTask,
  getActiveCareRecipient,
  getCaregiverProfile,
  getCareTasks,
  saveCareTask,
  type CareTask,
} from "@/lib/care";

type TaskDraft = {
  title: string;
  details: string;
  date: string;
  time: string;
  recurrence: NonNullable<CareTask["recurrence"]>;
  reminderMinutes: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function timeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultDueDate(): Date {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

function emptyDraft(): TaskDraft {
  const due = defaultDueDate();
  return {
    title: "",
    details: "",
    date: dateValue(due),
    time: timeValue(due),
    recurrence: "none",
    reminderMinutes: "15",
  };
}

function sameDay(a: number, b: number): boolean {
  const first = new Date(a);
  const second = new Date(b);
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function dueLabel(timestamp?: number): string {
  if (!timestamp) return "No due time";
  const date = new Date(timestamp);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay(timestamp, now.getTime())) return `Today at ${time}`;
  if (sameDay(timestamp, tomorrow.getTime())) return `Tomorrow at ${time}`;
  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} at ${time}`;
}

function recurrenceLabel(recurrence?: CareTask["recurrence"]): string {
  if (recurrence === "daily") return "Repeats daily";
  if (recurrence === "weekly") return "Repeats weekly";
  return "";
}

function reminderLabel(minutes?: number | null): string {
  if (minutes == null) return "";
  if (minutes === 0) return "In-app reminder at due time";
  if (minutes === 60) return "In-app reminder 1 hour before";
  return `In-app reminder ${minutes} minutes before`;
}

export default function TasksPage() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [now, setNow] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [message, setMessage] = useState("");

  const recipient = getActiveCareRecipient();
  const caregiver = getCaregiverProfile();

  function refreshTasks() {
    setTasks(getCareTasks());
    setNow(Date.now());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      refreshTasks();
    }, 0);
    const minute = window.setInterval(() => setNow(Date.now()), 60_000);
    window.addEventListener("ip-care-tasks-changed", refreshTasks);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(minute);
      window.removeEventListener("ip-care-tasks-changed", refreshTasks);
    };
  }, []);

  const recipientTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) => !recipient || task.recipientId === recipient.id
        )
        .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)),
    [recipient, tasks]
  );

  const groups = useMemo(() => {
    const incomplete = recipientTasks.filter((task) => !task.completed);
    return {
      overdue: incomplete.filter(
        (task) => Boolean(task.dueAt && task.dueAt < now)
      ),
      today: incomplete.filter(
        (task) =>
          Boolean(task.dueAt && task.dueAt >= now) &&
          sameDay(task.dueAt!, now)
      ),
      upcoming: incomplete.filter((task) =>
        Boolean(
          task.dueAt &&
            task.dueAt >= now &&
            !sameDay(task.dueAt, now)
        )
      ),
      unscheduled: incomplete.filter((task) => !task.dueAt),
      completed: recipientTasks
        .filter((task) => task.completed)
        .sort(
          (a, b) =>
            (b.lastCompletedAt ?? b.createdAt) -
            (a.lastCompletedAt ?? a.createdAt)
        ),
    };
  }, [now, recipientTasks]);

  function closeComposer() {
    setComposerOpen(false);
    setEditingTaskId(null);
    setDraft(emptyDraft());
    setMessage("");
  }

  function openNewTask() {
    setEditingTaskId(null);
    setDraft(emptyDraft());
    setMessage("");
    setComposerOpen(true);
  }

  function openEditTask(task: CareTask) {
    const due = new Date(task.dueAt ?? defaultDueDate());
    setEditingTaskId(task.id);
    setDraft({
      title: task.title,
      details: task.details ?? "",
      date: dateValue(due),
      time: timeValue(due),
      recurrence: task.recurrence ?? "none",
      reminderMinutes:
        task.reminderMinutes == null
          ? "none"
          : String(task.reminderMinutes),
    });
    setMessage("");
    setComposerOpen(true);
  }

  function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!recipient) {
      setMessage("Add a client profile before creating a care task.");
      return;
    }

    const dueAt = new Date(`${draft.date}T${draft.time}`).getTime();
    if (!draft.title.trim() || !Number.isFinite(dueAt)) {
      setMessage("Add a task name, date, and time.");
      return;
    }

    const existing = editingTaskId
      ? tasks.find((task) => task.id === editingTaskId)
      : undefined;
    saveCareTask({
      id: existing?.id ?? careId("task"),
      recipientId: recipient.id,
      eventId: existing?.eventId,
      title: draft.title.trim(),
      details: draft.details.trim(),
      owner: existing?.owner ?? caregiver?.displayName ?? "Caregiver",
      dueAt,
      recurrence: draft.recurrence,
      reminderMinutes:
        draft.reminderMinutes === "none"
          ? null
          : Number(draft.reminderMinutes),
      lastCompletedAt: existing?.lastCompletedAt,
      completed: existing?.completed ?? false,
      createdAt: existing?.createdAt ?? Date.now(),
    });

    closeComposer();
    setMessage(existing ? "Task updated." : "Task added.");
    refreshTasks();
  }

  function markDone(task: CareTask) {
    const updated = completeCareTask(task.id);
    if (!updated) return;
    setMessage(
      task.recurrence && task.recurrence !== "none"
        ? `${task.title} completed. The next occurrence is scheduled.`
        : `${task.title} completed.`
    );
    refreshTasks();
  }

  if (!mounted) {
    return <main className="min-h-screen bg-[#090d15]" />;
  }

  return (
    <main className="tasks-page min-h-screen bg-[#090d15] px-4 pb-20 pt-24">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        <header className="tasks-header">
          <div>
            <h1>Care tasks</h1>
            <span>Build a simple routine and check off what gets done.</span>
          </div>
          {recipientTasks.length > 0 && (
            <button
              type="button"
              className="tasks-add-button"
              onClick={() => openNewTask()}
            >
              <Plus size={16} />
              Add task
            </button>
          )}
        </header>

        {message && (
          <div
            className={`tasks-message ${
              message.startsWith("Add") ? "is-error" : ""
            }`}
            role="status"
          >
            {message}
          </div>
        )}

        {composerOpen && (
          <section className="task-composer-card">
            <div className="task-composer-heading">
              <div>
                <p>{editingTaskId ? "Edit task" : "New task"}</p>
                <h2>
                  {editingTaskId
                    ? "Update the care task"
                    : "What needs to happen?"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeComposer}
                aria-label="Close task form"
              >
                <X size={18} />
              </button>
            </div>

            <form className="task-composer-form" onSubmit={submitTask}>
              <label className="task-field task-field-wide">
                <span>Task</span>
                <input
                  autoFocus
                  required
                  maxLength={140}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </label>
              <label className="task-field">
                <span>Date</span>
                <input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(event) =>
                    setDraft({ ...draft, date: event.target.value })
                  }
                />
              </label>
              <label className="task-field">
                <span>Time</span>
                <input
                  type="time"
                  required
                  value={draft.time}
                  onChange={(event) =>
                    setDraft({ ...draft, time: event.target.value })
                  }
                />
              </label>
              <label className="task-field">
                <span>Repeat</span>
                <select
                  value={draft.recurrence}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      recurrence: event.target
                        .value as TaskDraft["recurrence"],
                    })
                  }
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                </select>
              </label>
              <label className="task-field">
                <span>In-app reminder</span>
                <select
                  value={draft.reminderMinutes}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      reminderMinutes: event.target.value,
                    })
                  }
                >
                  <option value="none">No reminder</option>
                  <option value="0">At due time</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                </select>
              </label>
              <label className="task-field task-field-wide">
                <span>Details (optional)</span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={draft.details}
                  onChange={(event) =>
                    setDraft({ ...draft, details: event.target.value })
                  }
                  placeholder="Add only the instructions needed to complete this task"
                />
              </label>
              <div className="task-composer-actions task-field-wide">
                <button type="button" onClick={closeComposer}>
                  Cancel
                </button>
                <button type="submit">
                  {editingTaskId ? <Save size={15} /> : <Plus size={15} />}
                  {editingTaskId ? "Save changes" : "Add task"}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="task-groups">
          <TaskGroup
            title="Overdue"
            tasks={groups.overdue}
            tone="overdue"
            onDone={markDone}
            onEdit={openEditTask}
            onDelete={(task) => {
              if (!window.confirm(`Delete “${task.title}”?`)) return;
              deleteCareTask(task.id);
              setMessage("Task deleted.");
              refreshTasks();
            }}
          />
          <TaskGroup
            title="Today"
            tasks={groups.today}
            tone="today"
            onDone={markDone}
            onEdit={openEditTask}
            onDelete={(task) => {
              if (!window.confirm(`Delete “${task.title}”?`)) return;
              deleteCareTask(task.id);
              setMessage("Task deleted.");
              refreshTasks();
            }}
          />
          <TaskGroup
            title="Upcoming"
            tasks={[...groups.upcoming, ...groups.unscheduled]}
            tone="upcoming"
            onDone={markDone}
            onEdit={openEditTask}
            onDelete={(task) => {
              if (!window.confirm(`Delete “${task.title}”?`)) return;
              deleteCareTask(task.id);
              setMessage("Task deleted.");
              refreshTasks();
            }}
          />
          <TaskGroup
            title="Completed"
            tasks={groups.completed}
            tone="completed"
            onDone={markDone}
            onEdit={openEditTask}
            onDelete={(task) => {
              if (!window.confirm(`Delete “${task.title}”?`)) return;
              deleteCareTask(task.id);
              setMessage("Task deleted.");
              refreshTasks();
            }}
          />
        </div>

        {!recipientTasks.length && !composerOpen && (
          <section className="tasks-empty">
            <p>
              Add a meal, activity, appointment, or other care plan task.
            </p>
            <button type="button" onClick={() => openNewTask()}>
              Add task
            </button>
          </section>
        )}

        <p className="tasks-safety-note">
          Reminders appear while this app is open. Care tasks are not emergency
          alerts or medical instructions.
        </p>
      </div>
    </main>
  );
}

function TaskGroup({
  title,
  tasks,
  tone,
  onDone,
  onEdit,
  onDelete,
}: {
  title: string;
  tasks: CareTask[];
  tone: "overdue" | "today" | "upcoming" | "completed";
  onDone: (task: CareTask) => void;
  onEdit: (task: CareTask) => void;
  onDelete: (task: CareTask) => void;
}) {
  if (!tasks.length) return null;

  return (
    <section className={`task-group is-${tone}`}>
      <div className="task-group-heading">
        <h2>{title}</h2>
        <span>{tasks.length}</span>
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <article className="task-item" key={task.id}>
            <button
              type="button"
              className="task-check"
              onClick={() => onDone(task)}
              disabled={task.completed}
              aria-label={
                task.completed
                  ? `${task.title} is completed`
                  : `Mark ${task.title} complete`
              }
            >
              {task.completed && <Check size={16} />}
            </button>
            <div className="task-item-copy">
              <h3>{task.title}</h3>
              {task.details && <p>{task.details}</p>}
              <div className="task-item-meta">
                <span>
                  <Clock3 size={12} />
                  {dueLabel(task.dueAt)}
                </span>
                {recurrenceLabel(task.recurrence) && (
                  <span>
                    <CalendarClock size={12} />
                    {recurrenceLabel(task.recurrence)}
                  </span>
                )}
                {reminderLabel(task.reminderMinutes) && (
                  <span>
                    <Bell size={12} />
                    {reminderLabel(task.reminderMinutes)}
                  </span>
                )}
              </div>
            </div>
            <div className="task-item-actions">
              <button
                type="button"
                onClick={() => onEdit(task)}
                aria-label={`Edit ${task.title}`}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(task)}
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
