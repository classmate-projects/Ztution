import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEnrollment } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { StudentEnrollmentRow } from "@/lib/supabase/types";
import { TeacherClassView } from "./TeacherClassView";
import { StudentClassView } from "./StudentClassView";

type Params = { params: Promise<{ id: string }> };

export default async function ClassDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/signin");
  const { id } = await params;

  const { data: klass } = await supabaseAdmin.from("classes").select("*").eq("id", id).maybeSingle();
  if (!klass) notFound();

  if (session.role === "teacher") {
    if (klass.teacher_id !== session.userId) notFound();

    const [{ data: sessions }, { data: materials }, { data: students }] = await Promise.all([
      supabaseAdmin
        .from("class_sessions")
        .select("*")
        .eq("class_id", id)
        .order("scheduled_at", { ascending: true }),
      supabaseAdmin
        .from("materials")
        .select("*")
        .eq("class_id", id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("class_students")
        .select("status, assigned_at, joined_at, users(id, name, email)")
        .eq("class_id", id),
    ]);

    // supabase-js can't infer this join is one-to-one without generated DB
    // types (it defaults nested selects to arrays); it's a single row at
    // runtime since class_students.student_id -> users is many-to-one.
    const typedStudents = (students ?? []) as unknown as StudentEnrollmentRow[];

    return (
      <TeacherClassView
        klass={klass}
        sessions={sessions ?? []}
        materials={materials ?? []}
        students={typedStudents}
      />
    );
  }

  const enrollment = await getEnrollment(id, session.userId);
  if (!enrollment) notFound();

  if (enrollment.status === "suspended") {
    return <StudentClassView klass={klass} sessions={[]} materials={[]} enrollment={enrollment} />;
  }

  const [{ data: sessions }, { data: materials }] = await Promise.all([
    supabaseAdmin
      .from("class_sessions")
      .select("*")
      .eq("class_id", id)
      // Students see the most recent session first.
      .order("scheduled_at", { ascending: false }),
    supabaseAdmin
      .from("materials")
      .select("*")
      .eq("class_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <StudentClassView
      klass={klass}
      sessions={sessions ?? []}
      materials={materials ?? []}
      enrollment={enrollment}
    />
  );
}
