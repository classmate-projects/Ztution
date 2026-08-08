"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MarketingButton,
  MarketingErrorBanner,
  MarketingField,
  MarketingInput,
  MarketingRadioCard,
} from "@/components/marketing";
import { MarketingPasswordInput } from "@/components/marketing-password-input";
import type { Role } from "@/lib/supabase/types";

const STUDENT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
    <path d="M12 3 2 8l10 5 10-5-10-5Z" />
    <path d="M6 10.5V16c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-5.5" />
  </svg>
);

const TEACHER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
    <path d="M7 10l3-3 2 2 4-4" />
  </svg>
);

export function SignUpForm() {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!role) {
      setError("Please select whether you're a student or a teacher");
      return;
    }
    setIsSubmitting(true);
    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullname, username, email, password, role }),
      });
      const registerBody = await registerRes.json();
      if (!registerRes.ok) {
        setError(registerBody.message ?? "Something went wrong");
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginBody = await loginRes.json();
      if (!loginRes.ok) {
        setError(loginBody.message ?? "Account created — please sign in");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <MarketingErrorBanner message={error} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MarketingField label="Full name" htmlFor="fullname">
          <MarketingInput
            id="fullname"
            required
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
        </MarketingField>
        <MarketingField label="Username" htmlFor="username">
          <MarketingInput
            id="username"
            required
            pattern="[a-zA-Z0-9_]{3,32}"
            title="3-32 characters: letters, numbers, and underscores"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </MarketingField>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </MarketingField>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-300">I am a…</span>
        <div className="grid grid-cols-2 gap-3">
          <MarketingRadioCard
            name="role"
            value="student"
            label="Student"
            icon={STUDENT_ICON}
            checked={role === "student"}
            onChange={() => setRole("student")}
          />
          <MarketingRadioCard
            name="role"
            value="teacher"
            label="Teacher"
            icon={TEACHER_ICON}
            checked={role === "teacher"}
            onChange={() => setRole("teacher")}
          />
        </div>
      </div>
      <MarketingButton type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Continuing…" : "Continue"}
      </MarketingButton>
    </form>
  );
}
