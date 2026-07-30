import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { buttonClasses, Card, Badge } from "@/components/ui";
import { ClassTile, JoinClassButton } from "@/components/dashboard";
import { formatDate } from "@/lib/format";
import type { ClassRow, EnrollmentStatus } from "@/lib/supabase/types";

interface EnrolledClass {
  status: EnrollmentStatus;
  classes: { id: string; name: string };
}

/** `classes` row selected with an embedded `class_students(count)` aggregate. */
type ClassWithStudentCount = ClassRow & { class_students: { count: number }[] };

const USERS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-3.5 w-3.5">
    <circle cx="8" cy="8" r="3" />
    <circle cx="16" cy="9" r="2.5" />
    <path d="M2.5 19c0-3.3 2.6-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
    <path d="M14 14c2.6.2 4.5 2.2 4.5 5" />
  </svg>
);

const CALENDAR_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-3.5 w-3.5">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18" />
    <path d="M8 3v4M16 3v4" />
  </svg>
);

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  if (session.role === "teacher") {
    const { data: classes } = await supabaseAdmin
      .from("classes")
      .select("*, class_students(count)")
      .eq("teacher_id", session.userId)
      .order("created_at", { ascending: false });
    const typedClasses = (classes ?? []) as unknown as ClassWithStudentCount[];

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Classes</h1>
          <Link href="/dashboard/classes/new" className={buttonClasses("primary")}>
            + Create Class
          </Link>
        </div>
        {!typedClasses.length ? (
          <Card>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You haven&apos;t created any classes yet.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {typedClasses.map((klass) => {
              const studentCount = klass.class_students[0]?.count ?? 0;
              return (
                <Link key={klass.id} href={`/dashboard/classes/${klass.id}`}>
                  <Card className="h-full transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
                    <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{klass.name}</h2>
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        {USERS_ICON}
                        {studentCount} {studentCount === 1 ? "student" : "students"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {CALENDAR_ICON}
                        {formatDate(klass.created_at)}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const { data: enrollments } = await supabaseAdmin
    .from("class_students")
    .select("status, classes(id, name)")
    .eq("student_id", session.userId);
  // supabase-js can't infer this join is one-to-one without generated DB
  // types (it defaults nested selects to arrays); it's a single row at runtime
  // since class_students.class_id -> classes is many-to-one.
  const typedEnrollments = (enrollments ?? []) as unknown as EnrolledClass[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">My Classes</h1>
      {!typedEnrollments.length ? (
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You haven&apos;t been assigned to any classes yet — ask your teacher to add you.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {typedEnrollments.map((enrollment) => (
            <ClassTile key={enrollment.classes.id} href={`/dashboard/classes/${enrollment.classes.id}`}>
              <Card className="h-full transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{enrollment.classes.name}</span>
                  <Badge status={enrollment.status} />
                </div>
                {enrollment.status === "assigned" && (
                  <div className="mt-3">
                    <JoinClassButton classId={enrollment.classes.id} />
                  </div>
                )}
              </Card>
            </ClassTile>
          ))}
        </div>
      )}
    </div>
  );
}
