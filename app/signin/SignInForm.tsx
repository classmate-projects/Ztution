"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MarketingButton,
  MarketingErrorBanner,
  MarketingField,
  MarketingInput,
  MarketingPasswordInput,
} from "@/components/marketing";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <MarketingErrorBanner message={error} />
      <MarketingField label="Email" htmlFor="email">
        <MarketingInput
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </MarketingField>
      <MarketingField label="Password" htmlFor="password">
        <MarketingPasswordInput
          id="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </MarketingField>
      <MarketingButton type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Signing in…" : "Sign In"}
      </MarketingButton>
    </form>
  );
}
