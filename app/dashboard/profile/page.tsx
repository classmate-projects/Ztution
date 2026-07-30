import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("name, username, email")
    .eq("id", session.userId)
    .maybeSingle();
  if (!profile) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <ProfileForm
        initialName={profile.name}
        initialUsername={profile.username}
        email={profile.email}
        role={session.role}
      />
    </div>
  );
}
