"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, ErrorBanner, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { Toast, useToast } from "@/components/toast";
import type { Role } from "@/lib/supabase/types";

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
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const { message: toastMessage, toastKey, showToast, hideToast } = useToast();

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
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
      showToast("Profile updated");
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
      showToast("Password updated");
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
      {toastMessage && <Toast key={toastKey} message={toastMessage} onClose={hideToast} />}

      <div className="flex items-center gap-4">
        <Avatar name={name} size="lg" />
        <div>
          <div className="text-base font-medium text-zinc-900 dark:text-zinc-100">{name}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{email}</div>
          <div className="mt-1 text-xs font-medium capitalize text-zinc-400 dark:text-zinc-500">{role}</div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <Card className="lg:flex-1">
          <form className="flex h-full flex-col gap-4" onSubmit={saveProfile}>
            <h2 className="text-base font-semibold">Profile details</h2>
            <ErrorBanner message={profileError} />
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
            <Button type="submit" disabled={savingProfile} className="mt-auto self-start">
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Card>

        <Card className="lg:flex-1">
          <form className="flex h-full flex-col gap-4" onSubmit={savePassword}>
            <h2 className="text-base font-semibold">Change password</h2>
            <ErrorBanner message={passwordError} />
            <Field label="Current password" htmlFor="current-password">
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password" htmlFor="new-password">
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-password">
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={savingPassword} className="mt-auto self-start">
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
