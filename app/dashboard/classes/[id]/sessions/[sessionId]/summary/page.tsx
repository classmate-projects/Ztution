import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { summarizeAttendance } from "@/lib/attendance";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SummaryView } from "./SummaryView";

type Params = { params: Promise<{ id: string; sessionId: string }> };

export default async function SessionSummaryPage({ params }: Params) {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  const { id, sessionId } = await params;

  const { data: klass } = await supabaseAdmin.from("classes").select("*").eq("id", id).maybeSingle();
  if (!klass) notFound();
  // Teacher-only — and only the class's own teacher.
  if (auth.role !== "teacher" || klass.teacher_id !== auth.userId) notFound();

  const { data: session } = await supabaseAdmin
    .from("class_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("class_id", id)
    .maybeSingle();
  if (!session) notFound();
  // Duration data isn't meaningful (or complete — students may still be
  // connected) until the call has actually ended.
  if (session.status !== "ended") redirect(`/dashboard/classes/${id}`);

  const { data: rows, error } = await supabaseAdmin
    .from("session_attendance")
    .select("student_id, joined_at, left_at, users(name)")
    .eq("session_id", sessionId);
  if (error) throw error;

  // supabase-js can't infer this join is one-to-one without generated DB
  // types (it defaults nested selects to arrays); it's a single row at
  // runtime since session_attendance.student_id -> users is many-to-one.
  type AttendanceRow = { student_id: string; joined_at: string; left_at: string | null; users: { name: string } | null };
  const typedRows = (rows ?? []) as unknown as AttendanceRow[];

  const students = summarizeAttendance(
    typedRows.map((r) => ({
      studentId: r.student_id,
      name: r.users?.name ?? "Unknown student",
      joinedAt: r.joined_at,
      leftAt: r.left_at,
    })),
    session.ended_at
  );

  const classDurationMs =
    session.started_at && session.ended_at
      ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
      : 0;

  return (
    <SummaryView
      classId={id}
      className={klass.name}
      sessionTitle={session.title}
      classDurationMs={classDurationMs}
      startedAt={session.started_at}
      endedAt={session.ended_at}
      students={students}
    />
  );
}
