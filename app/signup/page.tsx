import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo, MarketingCard } from "@/components/marketing";
import { MarketingBackdrop } from "@/components/decor";
import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-zinc-950 text-white">
      <MarketingBackdrop />
      <div className="animate-fade-in-up mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center overflow-y-auto px-6 py-6">
        <Logo />
        <MarketingCard className="mt-4 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Join Ztution as a teacher or a student.</p>
          <div className="mt-6">
            <SignUpForm />
          </div>
        </MarketingCard>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
