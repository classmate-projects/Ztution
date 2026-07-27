import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSubscriptionStatus } from "@/lib/billing";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/dashboard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/signin");

  if (session.role === "student") {
    const { active } = await getSubscriptionStatus(session.userId);
    if (!active) redirect("/billing");
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("name")
    .eq("id", session.userId)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Ztution
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className="font-medium">{profile?.name ?? session.email}</div>
              <div className="capitalize text-zinc-500 dark:text-zinc-400">{session.role}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
