"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorBanner } from "@/components/ui";

interface Props {
  active: boolean;
  statusLabel: string | null;
  justSucceeded: boolean;
  justCanceled: boolean;
}

export function BillingClient({ active, statusLabel, justSucceeded, justCanceled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redirectTo(endpoint: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      window.location.href = body.data.url;
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorBanner message={error} />

      {justSucceeded && !active && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Payment received — activating your account. This usually takes a few seconds; refresh if
          it hasn&apos;t updated yet.
        </div>
      )}
      {justCanceled && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Checkout canceled — no charge was made.
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
          <span className="inline-flex items-center gap-2 font-medium capitalize">
            <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
            {statusLabel ?? "No subscription"}
          </span>
        </div>
      </Card>

      {active ? (
        <>
          <Button onClick={() => router.push("/dashboard")}>Continue to Dashboard</Button>
          <Button variant="secondary" disabled={loading} onClick={() => redirectTo("/api/billing/portal")}>
            Manage Subscription
          </Button>
        </>
      ) : (
        <Button disabled={loading} onClick={() => redirectTo("/api/billing/checkout")}>
          {loading ? "Redirecting…" : "Subscribe Now"}
        </Button>
      )}
    </div>
  );
}
