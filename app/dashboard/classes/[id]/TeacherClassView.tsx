"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, buttonClasses, Card, ErrorBanner, Field, Input } from "@/components/ui";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { ClassRow, ClassSessionRow, MaterialRow, StudentEnrollmentRow } from "@/lib/supabase/types";

interface Props {
  klass: ClassRow;
  sessions: ClassSessionRow[];
  materials: MaterialRow[];
  students: StudentEnrollmentRow[];
}

export function TeacherClassView({ klass, sessions, materials, students }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">{klass.name}</h1>
      <SessionsPanel classId={klass.id} sessions={sessions} />
      <StudentsPanel classId={klass.id} students={students} />
      <MaterialsPanel classId={klass.id} materials={materials} />
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
              <Input
                id="session-time"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
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
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function addStudent(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      setEmail("");
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

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Students</h2>
      <Card>
        <form className="flex items-end gap-3" onSubmit={addStudent}>
          <div className="flex-1">
            <Field label="Student email" htmlFor="student-email">
              <Input
                id="student-email"
                type="email"
                required
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Add
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
                  className="text-sm font-medium underline"
                >
                  Download
                </a>
                <Button
                  variant="ghost"
                  disabled={deletingId === material.id}
                  onClick={() => deleteMaterial(material.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
