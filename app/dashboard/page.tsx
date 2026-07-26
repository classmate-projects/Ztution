import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { buttonClasses, Card, Badge } from "@/components/ui";
import { JoinClassButton } from "@/components/dashboard";
import type { EnrollmentStatus } from "@/lib/supabase/types";

interface EnrolledClass {
  status: EnrollmentStatus;
  classes: { id: string; name: string };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  if (session.role === "teacher") {
    const { data: classes } = await supabaseAdmin
      .from("classes")
      .select("*")
      .eq("teacher_id", session.userId)
      .order("created_at", { ascending: false });

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Classes</h1>
          <Link href="/dashboard/classes/new" className={buttonClasses("primary")}>
            + Create Class
          </Link>
        </div>
        {!classes?.length ? (
          <Card>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You haven&apos;t created any classes yet.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((klass) => (
              <Link key={klass.id} href={`/dashboard/classes/${klass.id}`}>
                <Card className="h-full transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
                  <h2 className="font-medium">{klass.name}</h2>
                </Card>
              </Link>
            ))}
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
            <Card key={enrollment.classes.id}>
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/classes/${enrollment.classes.id}`}
                  className="font-medium hover:underline"
                >
                  {enrollment.classes.name}
                </Link>
                <Badge status={enrollment.status} />
              </div>
              {enrollment.status === "assigned" && (
                <div className="mt-3">
                  <JoinClassButton classId={enrollment.classes.id} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
