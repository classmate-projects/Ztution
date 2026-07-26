import { Badge, Card } from "@/components/ui";
import { JoinClassButton } from "@/components/dashboard";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { ClassRow, ClassSessionRow, ClassStudentRow, MaterialRow } from "@/lib/supabase/types";

interface Props {
  klass: ClassRow;
  sessions: ClassSessionRow[];
  materials: MaterialRow[];
  enrollment: ClassStudentRow;
}

export function StudentClassView({ klass, sessions, materials, enrollment }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{klass.name}</h1>
        {enrollment.status === "assigned" ? (
          <JoinClassButton classId={klass.id} />
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
                  {session.status === "live" && (
                    <span
                      title="Live calling isn't available yet"
                      className="cursor-not-allowed rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-400 dark:bg-zinc-800"
                    >
                      Join Call — coming soon
                    </span>
                  )}
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
                  className="text-sm font-medium underline"
                >
                  Download
                </a>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
