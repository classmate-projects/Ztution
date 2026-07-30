"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";
import { initials } from "@/components/dashboard";
import type { Role } from "@/lib/supabase/types";

const SUCCESS_BANNER_CLASSES =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";

interface Props {
  initialName: string;
  initialUsername: string;
  email: string;
  role: Role;
}

export function ProfileForm({ initialName, initialUsername, email, role }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username }),
      });
      const body = await res.json();
      if (!res.ok) {
        setProfileError(body.message ?? "Something went wrong");
        return;
      }
      setProfileSuccess(true);
      router.refresh();
    } catch {
      setProfileError("Network error — please try again");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPasswordError(body.message ?? "Something went wrong");
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Network error — please try again");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xl font-semibold text-white dark:bg-indigo-500">
          {initials(name)}
        </span>
        <div>
          <div className="text-base font-medium text-zinc-900 dark:text-zinc-100">{name}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{email}</div>
          <div className="mt-1 text-xs font-medium capitalize text-zinc-400 dark:text-zinc-500">{role}</div>
        </div>
      </div>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={saveProfile}>
          <h2 className="text-base font-semibold">Profile details</h2>
          <ErrorBanner message={profileError} />
          {profileSuccess && <div className={SUCCESS_BANNER_CLASSES}>Profile updated.</div>}
          <Field label="Name" htmlFor="profile-name">
            <Input id="profile-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Username" htmlFor="profile-username">
            <Input
              id="profile-username"
              required
              pattern="[a-zA-Z0-9_]{3,32}"
              title="3-32 characters: letters, numbers, and underscores"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={savingProfile} className="self-start">
            {savingProfile ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={savePassword}>
          <h2 className="text-base font-semibold">Change password</h2>
          <ErrorBanner message={passwordError} />
          {passwordSuccess && <div className={SUCCESS_BANNER_CLASSES}>Password updated.</div>}
          <Field label="Current password" htmlFor="current-password">
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="New password" htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password">
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={savingPassword} className="self-start">
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
