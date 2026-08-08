import Link from "next/link";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LogoMark } from "@/components/brand";
import { UserMenu, NotificationBell } from "@/components/dashboard";

export async function DashboardHeader() {
  const session = await getSession();
  if (!session) return null;

  const [{ data: profile }, { count: unreadCount }] = await Promise.all([
    supabaseAdmin.from("users").select("name").eq("id", session.userId).maybeSingle(),
    supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .is("read_at", null),
  ]);

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">Ztution</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell initialUnreadCount={unreadCount ?? 0} userId={session.userId} />
          <UserMenu name={profile?.name ?? session.email} role={session.role} />
        </div>
      </div>
    </header>
  );
}
