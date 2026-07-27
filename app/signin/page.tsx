import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { PageDecor } from "@/components/decor";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <PageDecor icons={["📖", "✏️", "🎓", "⭐"]} />
      <div className="animate-fade-in-up mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Ztution
        </Link>
        <Card className="mt-4">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Welcome back.</p>
          <div className="mt-8">
            <SignInForm />
          </div>
        </Card>
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
