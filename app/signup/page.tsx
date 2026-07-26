import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ← Ztution
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Join Ztution as a teacher or a student.
      </p>
      <div className="mt-8">
        <SignUpForm />
      </div>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Sign in
        </Link>
      </p>
    </div>
  );
}
