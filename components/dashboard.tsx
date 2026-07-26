"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleClick} disabled={loading}>
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}

export function JoinClassButton({ classId }: { classId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/join`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Failed to join class");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={handleClick} disabled={loading}>
        {loading ? "Joining…" : "Join Class"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
