"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, buttonClasses, Card, ErrorBanner, Field, Input, Textarea } from "@/components/ui";
import { Toast, useToast } from "@/components/toast";
import { DateTimePicker } from "@/components/date-time-picker";
import { RealtimeClassRefresher } from "@/components/realtime-class";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { ClassRow, ClassSessionRow, EnrollmentStatus, MaterialRow, StudentEnrollmentRow } from "@/lib/supabase/types";

interface Props {
  klass: ClassRow;
  sessions: ClassSessionRow[];
  materials: MaterialRow[];
  students: StudentEnrollmentRow[];
}

type TabId = "sessions" | "students" | "materials" | "settings";

const SESSIONS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18" />
    <path d="M8 3v4M16 3v4" />
  </svg>
);

const STUDENTS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <circle cx="8" cy="8" r="3" />
    <circle cx="16" cy="9" r="2.5" />
    <path d="M2.5 19c0-3.3 2.6-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
    <path d="M14 14c2.6.2 4.5 2.2 4.5 5" />
  </svg>
);

const MATERIALS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <path d="M6 2.75h8.5L19 7.25V19.5a1.75 1.75 0 0 1-1.75 1.75H6A1.75 1.75 0 0 1 4.25 19.5v-15A1.75 1.75 0 0 1 6 2.75Z" />
    <path d="M14 2.75V7a1 1 0 0 0 1 1h4" />
    <path d="M8 12.5h8M8 16h5" />
  </svg>
);

const SETTINGS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const DOWNLOAD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M12 3v12m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TRASH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M4 7h16" strokeLinecap="round" />
    <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" strokeLinecap="round" />
  </svg>
);

const ICON_BUTTON_CLASSES =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/10";

const DELETE_ICON_BUTTON_CLASSES =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400";

export function TeacherClassView({ klass, sessions, materials, students }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  const tabs: { id: TabId; label: string; count?: number; icon: ReactNode }[] = [
    { id: "sessions", label: "Class Sessions", count: sessions.length, icon: SESSIONS_ICON },
    { id: "students", label: "Students", count: students.length, icon: STUDENTS_ICON },
    { id: "materials", label: "Study Materials", count: materials.length, icon: MATERIALS_ICON },
    { id: "settings", label: "Settings", icon: SETTINGS_ICON },
  ];

  return (
    <div className="flex flex-col gap-6">
      <RealtimeClassRefresher classId={klass.id} />
      <h1 className="text-xl font-semibold">{klass.name}</h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className="flex gap-2 overflow-x-auto lg:w-56 lg:flex-none lg:flex-col lg:gap-1 lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:w-full ${
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
              }`}
            >
              <span
                className={
                  activeTab === tab.id
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-400 dark:text-zinc-500"
                }
              >
                {tab.icon}
              </span>
              <span className="flex-1 whitespace-nowrap text-left">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    activeTab === tab.id
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === "sessions" && <SessionsPanel classId={klass.id} sessions={sessions} />}
          {activeTab === "students" && <StudentsPanel classId={klass.id} students={students} />}
          {activeTab === "materials" && <MaterialsPanel classId={klass.id} materials={materials} />}
          {activeTab === "settings" && <SettingsPanel klass={klass} />}
        </div>
      </div>
    </div>
  );
}

function SessionsPanel({ classId, sessions }: { classId: string; sessions: ClassSessionRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function createSession(event: FormEvent, instant: boolean) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          ...(instant ? {} : { scheduledAt: new Date(scheduledAt).toISOString() }),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      setTitle("");
      setScheduledAt("");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function transition(sessionId: string, action: "start" | "end") {
    setActioningId(sessionId);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      router.refresh();
    } finally {
      setActioningId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Class Sessions</h2>
      <Card>
        <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={(e) => createSession(e, true)}>
          <div className="flex-1">
            <Field label="Session title" htmlFor="session-title">
              <Input
                id="session-title"
                required
                placeholder="e.g. Chapter 4 review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Schedule for (optional)" htmlFor="session-time">
              <DateTimePicker id="session-time" value={scheduledAt} onChange={setScheduledAt} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || !title}>
              Start Instant Class
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting || !title || !scheduledAt}
              onClick={(e) => createSession(e, false)}
            >
              Schedule
            </Button>
          </div>
        </form>
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      </Card>

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No sessions yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <Card key={session.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <div className="font-medium">{session.title}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(session.scheduled_at)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={session.status} />
                {session.status === "scheduled" && (
                  <Button
                    variant="secondary"
                    disabled={actioningId === session.id}
                    onClick={() => transition(session.id, "start")}
                  >
                    Start
                  </Button>
                )}
                {session.status === "live" && (
                  <>
                    <Link
                      href={`/dashboard/classes/${classId}/sessions/${session.id}/call`}
                      className={buttonClasses("primary")}
                    >
                      Enter Call
                    </Link>
                    <Button
                      variant="danger"
                      disabled={actioningId === session.id}
                      onClick={() => transition(session.id, "end")}
                    >
                      End
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function StudentsPanel({ classId, students }: { classId: string; students: StudentEnrollmentRow[] }) {
  const router = useRouter();
  const [emailsInput, setEmailsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const { message: toastMessage, toastKey, showToast, hideToast } = useToast();

  async function addStudents(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const emails = Array.from(
      new Set(
        emailsInput
          .split(/[\n,]+/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );
    if (emails.length === 0) {
      setError("Enter at least one student email");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }

      const { added, alreadyAssigned, notFound } = body.data as {
        added: unknown[];
        alreadyAssigned: string[];
        notFound: string[];
      };
      const parts: string[] = [];
      if (added.length) parts.push(`Added ${added.length} student${added.length === 1 ? "" : "s"}.`);
      if (alreadyAssigned.length) parts.push(`Already in this class: ${alreadyAssigned.join(", ")}.`);
      if (notFound.length) parts.push(`No account found for: ${notFound.join(", ")}.`);
      showToast(parts.join(" "));
      setEmailsInput("");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeStudent(studentId: string) {
    setRemovingId(studentId);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/students?studentId=${studentId}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  async function toggleSuspension(studentId: string, currentStatus: EnrollmentStatus) {
    setSuspendingId(studentId);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action: currentStatus === "suspended" ? "reactivate" : "suspend" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      router.refresh();
    } finally {
      setSuspendingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {toastMessage && <Toast key={toastKey} message={toastMessage} onClose={hideToast} />}

      <h2 className="text-lg font-medium">Students</h2>
      <Card>
        <form className="flex flex-col gap-3" onSubmit={addStudents}>
          <div>
            <Field label="Student emails" htmlFor="student-emails">
              <Textarea
                id="student-emails"
                required
                rows={2}
                className="min-h-20"
                placeholder="student1@example.com, student2@example.com"
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
              />
            </Field>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Add multiple students at once — separate emails with commas or new lines.
            </p>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adding…" : "Add"}
          </Button>
        </form>
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      </Card>

      {students.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No students assigned yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map((enrollment) => (
            <Card
              key={enrollment.users?.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <div className="font-medium">{enrollment.users?.name}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">{enrollment.users?.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={enrollment.status} />
                <Button
                  variant="secondary"
                  disabled={suspendingId === enrollment.users?.id}
                  onClick={() => enrollment.users && toggleSuspension(enrollment.users.id, enrollment.status)}
                >
                  {enrollment.status === "suspended" ? "Reactivate" : "Suspend"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={removingId === enrollment.users?.id}
                  onClick={() => enrollment.users && removeStudent(enrollment.users.id)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function SettingsPanel({ klass }: { klass: ClassRow }) {
  const router = useRouter();
  const [name, setName] = useState(klass.name);
  const [paymentAmount, setPaymentAmount] = useState(
    klass.payment_amount ? String(klass.payment_amount) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { message: toastMessage, toastKey, showToast, hideToast } = useToast();

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/classes/${klass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, paymentAmount: paymentAmount === "" ? 0 : paymentAmount }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      showToast("Class settings saved.");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteClass() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${klass.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        setConfirmOpen(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {toastMessage && <Toast key={toastKey} message={toastMessage} onClose={hideToast} />}

      <h2 className="text-lg font-medium">Settings</h2>
      <Card>
        <form className="flex flex-col gap-4" onSubmit={save}>
          <Field label="Class name" htmlFor="class-name">
            <Input
              id="class-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div>
            <Field label="Payment amount" htmlFor="class-payment">
              <Input
                id="class-payment"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </Field>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              The fee you expect from each student for this class.
            </p>
          </div>
          <Button type="submit" disabled={isSaving || !name.trim()} className="self-start">
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </form>
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      </Card>

      <Card className="border-red-200 dark:border-red-500/30">
        <h3 className="font-medium text-red-700 dark:text-red-400">Danger zone</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Deleting a class permanently removes its sessions, study materials, and student
          enrollments. This can&apos;t be undone.
        </p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
        >
          Delete class
        </Button>
      </Card>

      {confirmOpen && (
        <ConfirmDialog
          title="Delete this class?"
          message={`"${klass.name}" and all of its sessions, materials, and student enrollments will be permanently deleted. This action can't be undone.`}
          confirmLabel={isDeleting ? "Deleting…" : "Delete class"}
          confirmDisabled={isDeleting}
          onConfirm={deleteClass}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </section>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={confirmDisabled}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MaterialsPanel({ classId, materials }: { classId: string; materials: MaterialRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function upload(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Please choose a file");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("file", file);
      const res = await fetch(`/api/classes/${classId}/materials`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      setTitle("");
      setFile(null);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteMaterial(materialId: string) {
    setDeletingId(materialId);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/materials/${materialId}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Study Materials</h2>
      <Card>
        <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={upload}>
          <div className="flex-1">
            <Field label="Title" htmlFor="material-title">
              <Input
                id="material-title"
                required
                placeholder="e.g. Week 3 slides"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="File" htmlFor="material-file">
              <Input
                id="material-file"
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Uploading…" : "Upload"}
          </Button>
        </form>
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      </Card>

      {materials.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No materials uploaded yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((material) => (
            <Card key={material.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{material.title}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {material.file_name} {material.size_bytes ? `· ${formatFileSize(material.size_bytes)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/materials/${material.id}/download`}
                  className={ICON_BUTTON_CLASSES}
                  title="Download"
                  aria-label="Download"
                >
                  {DOWNLOAD_ICON}
                </a>
                <button
                  type="button"
                  disabled={deletingId === material.id}
                  onClick={() => deleteMaterial(material.id)}
                  title="Delete"
                  aria-label="Delete"
                  className={DELETE_ICON_BUTTON_CLASSES}
                >
                  {TRASH_ICON}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
