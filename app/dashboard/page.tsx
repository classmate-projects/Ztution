import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Avatar, buttonClasses, Card, EmptyState } from "@/components/ui";
import { ClassTile } from "@/components/dashboard";
import { formatDate } from "@/lib/format";
import type { ClassRow, EnrollmentStatus } from "@/lib/supabase/types";

interface EnrolledClass {
  status: EnrollmentStatus;
  classes: { id: string; name: string; teacher_id: string; users: { id: string; name: string } | null };
}

interface TeacherGroup {
  teacherId: string;
  teacherName: string;
  enrollments: EnrolledClass[];
}

function groupByTeacher(enrollments: EnrolledClass[]): TeacherGroup[] {
  const groups = new Map<string, TeacherGroup>();
  for (const enrollment of enrollments) {
    const teacherId = enrollment.classes.teacher_id;
    let group = groups.get(teacherId);
    if (!group) {
      group = { teacherId, teacherName: enrollment.classes.users?.name ?? "Unknown teacher", enrollments: [] };
      groups.set(teacherId, group);
    }
    group.enrollments.push(enrollment);
  }
  return Array.from(groups.values());
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

const CALENDAR_ICON_LG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18" />
    <path d="M8 3v4M16 3v4" />
  </svg>
);

const TEACHERS_ICON_LG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
    <circle cx="8" cy="8" r="3" />
    <circle cx="16" cy="9" r="2.5" />
    <path d="M2.5 19c0-3.3 2.6-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
    <path d="M14 14c2.6.2 4.5 2.2 4.5 5" />
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
            <EmptyState
              icon={CALENDAR_ICON_LG}
              title="No classes yet"
              description="Create your first class to start scheduling lectures and sharing materials."
              action={
                <Link href="/dashboard/classes/new" className={buttonClasses("primary", "mt-1")}>
                  + Create Class
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {typedClasses.map((klass) => {
              const studentCount = klass.class_students[0]?.count ?? 0;
              return (
                <Link key={klass.id} href={`/dashboard/classes/${klass.id}`}>
                  <Card hoverable className="h-full">
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

  const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
    .from("class_students")
    // `users!classes_teacher_id_fkey` disambiguates the embed: classes and
    // users are connected two ways (classes.teacher_id directly, and
    // indirectly through class_students), so PostgREST can't infer which
    // relationship to use for a bare `users(...)` here and errors (PGRST201).
    .select("status, classes(id, name, teacher_id, users!classes_teacher_id_fkey(id, name))")
    .eq("student_id", session.userId);
  if (enrollmentsError) throw enrollmentsError;
  // supabase-js can't infer this join is one-to-one without generated DB
  // types (it defaults nested selects to arrays); it's a single row at runtime
  // since class_students.class_id -> classes and classes.teacher_id -> users
  // are both many-to-one.
  const typedEnrollments = (enrollments ?? []) as unknown as EnrolledClass[];
  const teacherGroups = groupByTeacher(typedEnrollments);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">My Teachers</h1>
      {!teacherGroups.length ? (
        <Card>
          <EmptyState
            icon={TEACHERS_ICON_LG}
            title="No classes assigned yet"
            description="Ask your teacher to add you to a class and it'll show up here."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teacherGroups.map((group) => (
            <ClassTile key={group.teacherId} href={`/dashboard/teachers/${group.teacherId}`}>
              <Card hoverable className="h-full">
                <div className="flex items-center gap-3">
                  <Avatar name={group.teacherName} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {group.teacherName}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {group.enrollments.length} {group.enrollments.length === 1 ? "class" : "classes"}
                    </div>
                  </div>
                </div>
              </Card>
            </ClassTile>
          ))}
        </div>
      )}
    </div>
  );
}
