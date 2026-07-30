import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSubscriptionStatus } from "@/lib/billing";
import { DashboardHeader } from "@/components/dashboard-header";
import { BillingClient } from "./BillingClient";

type Props = { searchParams: Promise<{ success?: string; canceled?: string }> };

export default async function BillingPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role !== "student") redirect("/dashboard");

  const { success, canceled } = await searchParams;
  const status = await getSubscriptionStatus(session.userId);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {status.active
              ? "Your subscription is active — you have full access to your classes."
              : "A subscription is required to access your classes."}
          </p>
        </div>
        <BillingClient
          active={status.active}
          statusLabel={status.status}
          justSucceeded={success === "1"}
          justCanceled={canceled === "1"}
        />
      </div>
    </div>
  );
}
