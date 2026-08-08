import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/signin");

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
