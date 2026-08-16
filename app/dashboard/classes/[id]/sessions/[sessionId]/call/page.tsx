import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEnrollment, isRemovedFromSession } from "@/lib/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CallRoom } from "./CallRoom";
import { StreamingRoom } from "./StreamingRoom";

type Params = { params: Promise<{ id: string; sessionId: string }> };

export default async function CallPage({ params }: Params) {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  const { id, sessionId } = await params;

  const { data: klass } = await supabaseAdmin.from("classes").select("*").eq("id", id).maybeSingle();
  if (!klass) notFound();

  if (auth.role === "teacher") {
    if (klass.teacher_id !== auth.userId) notFound();
  } else {
    const enrollment = await getEnrollment(id, auth.userId);
    if (!enrollment || enrollment.status !== "active") redirect(`/dashboard/classes/${id}`);
  }

  const { data: callSession } = await supabaseAdmin
    .from("class_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("class_id", id)
    .maybeSingle();
  if (!callSession) notFound();
  if (callSession.status !== "live") redirect(`/dashboard/classes/${id}`);

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("name")
    .eq("id", auth.userId)
    .maybeSingle();

  const currentUser = { id: auth.userId, name: profile?.name ?? auth.email, role: auth.role };

  // Checked server-side (not just in the browser's React state) so a student
  // the teacher removed can't bypass it by simply leaving and rejoining —
  // the block has to survive a fresh page load.
  const removed =
    auth.role === "student" ? await isRemovedFromSession(sessionId, auth.userId) : false;

  // A call should behave like a real conferencing app: take over the whole
  // browser viewport (like Meet does) instead of living inside the dashboard's
  // padded, max-width page column — that's what forced a scroll to see it.
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-zinc-950">
      {callSession.mode === "streaming" ? (
        <StreamingRoom
          classId={id}
          classNameLabel={klass.name}
          session={callSession}
          currentUser={currentUser}
        />
      ) : (
        <CallRoom
          classId={id}
          classNameLabel={klass.name}
          session={callSession}
          currentUser={currentUser}
          initiallyRemoved={removed}
        />
      )}
    </div>
  );
}
