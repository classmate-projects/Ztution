import Link from "next/link";
import { Badge, buttonClasses, Card } from "@/components/ui";
import { InviteActions } from "@/components/dashboard";
import { RealtimeClassRefresher } from "@/components/realtime-class";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { ClassRow, ClassSessionRow, ClassStudentRow, MaterialRow } from "@/lib/supabase/types";

interface Props {
  klass: ClassRow;
  sessions: ClassSessionRow[];
  materials: MaterialRow[];
  enrollment: ClassStudentRow;
}

const DOWNLOAD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M12 3v12m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_BUTTON_CLASSES =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/10";

export function StudentClassView({ klass, sessions, materials, enrollment }: Props) {
  if (enrollment.status === "suspended") {
    return (
      <div className="flex flex-col gap-6">
        <RealtimeClassRefresher classId={klass.id} />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{klass.name}</h1>
          <Badge status={enrollment.status} />
        </div>
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your access to this class has been suspended. Contact your teacher to have it restored.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <RealtimeClassRefresher classId={klass.id} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{klass.name}</h1>
        {enrollment.status === "assigned" ? (
          <InviteActions classId={klass.id} />
        ) : (
          <Badge status={enrollment.status} />
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Class Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No sessions scheduled yet — check back later.
          </p>
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
                  {session.status === "live" &&
                    (enrollment.status === "active" ? (
                      <Link
                        href={`/dashboard/classes/${klass.id}/sessions/${session.id}/call`}
                        className={buttonClasses("primary")}
                      >
                        Join Call
                      </Link>
                    ) : (
                      <span
                        title="Join the class before you can join a live call"
                        className="cursor-not-allowed rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-400 dark:bg-zinc-800"
                      >
                        Join Call
                      </span>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Study Materials</h2>
        {materials.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No materials shared yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {materials.map((material) => (
              <Card key={material.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{material.title}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {material.file_name}{" "}
                    {material.size_bytes ? `· ${formatFileSize(material.size_bytes)}` : ""}
                  </div>
                </div>
                <a
                  href={`/api/materials/${material.id}/download`}
                  className={ICON_BUTTON_CLASSES}
                  title="Download"
                  aria-label="Download"
                >
                  {DOWNLOAD_ICON}
                </a>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
