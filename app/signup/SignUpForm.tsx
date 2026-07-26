"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorBanner, Field, Input, Select } from "@/components/ui";
import type { Role } from "@/lib/supabase/types";

export function SignUpForm() {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ErrorBanner message={error} />
      <Field label="Full name" htmlFor="fullname">
        <Input
          id="fullname"
          required
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
        />
      </Field>
      <Field label="Username" htmlFor="username">
        <Input
          id="username"
          required
          pattern="[a-zA-Z0-9_]{3,32}"
          title="3-32 characters: letters, numbers, and underscores"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="I am a…" htmlFor="role">
        <Select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </Select>
      </Field>
      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Creating account…" : "Create Account"}
      </Button>
    </form>
  );
}
