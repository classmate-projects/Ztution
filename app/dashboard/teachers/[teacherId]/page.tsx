import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Avatar, Card, Badge } from "@/components/ui";
import { ClassTile, InviteActions } from "@/components/dashboard";
import type { EnrollmentStatus } from "@/lib/supabase/types";

interface TeacherEnrollment {
  status: EnrollmentStatus;
  classes: { id: string; name: string; teacher_id: string; users: { id: string; name: string } | null };
}

type Params = { params: Promise<{ teacherId: string }> };

export default async function TeacherClassesPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role === "teacher") redirect("/dashboard");

  const { teacherId } = await params;

  const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
    .from("class_students")
    // `users!classes_teacher_id_fkey` disambiguates the embed: classes and
    // users are connected two ways (classes.teacher_id directly, and
    // indirectly through class_students), so PostgREST can't infer which
    // relationship to use for a bare `users(...)` here and errors (PGRST201).
    .select("status, classes!inner(id, name, teacher_id, users!classes_teacher_id_fkey(id, name))")
    .eq("student_id", session.userId)
    .eq("classes.teacher_id", teacherId);
  if (enrollmentsError) throw enrollmentsError;

  // supabase-js can't infer this join is one-to-one without generated DB
  // types (it defaults nested selects to arrays); it's a single row at
  // runtime since class_students.class_id -> classes and classes.teacher_id
  // -> users are both many-to-one.
  const typedEnrollments = (enrollments ?? []) as unknown as TeacherEnrollment[];
  if (!typedEnrollments.length) notFound();

  const teacherName = typedEnrollments[0].classes.users?.name ?? "Teacher";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; My Teachers
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={teacherName} />
          <h1 className="text-xl font-semibold">{teacherName}</h1>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {typedEnrollments.map((enrollment) => (
          <ClassTile key={enrollment.classes.id} href={`/dashboard/classes/${enrollment.classes.id}`}>
            <Card hoverable className="h-full">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{enrollment.classes.name}</span>
                <Badge status={enrollment.status} />
              </div>
              {enrollment.status === "assigned" && (
                <div className="mt-3">
                  <InviteActions classId={enrollment.classes.id} />
                </div>
              )}
            </Card>
          </ClassTile>
        ))}
      </div>
    </div>
  );
}
