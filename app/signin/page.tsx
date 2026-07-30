import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo, MarketingCard } from "@/components/marketing";
import { MarketingBackdrop } from "@/components/decor";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-zinc-950 text-white">
      <MarketingBackdrop />
      <div className="animate-fade-in-up mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center overflow-y-auto px-6 py-8">
        <Logo />
        <MarketingCard className="mt-6 p-8 sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in</h1>
          <p className="mt-1 text-sm text-slate-400">Welcome back.</p>
          <div className="mt-8">
            <SignInForm />
          </div>
        </MarketingCard>
        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
