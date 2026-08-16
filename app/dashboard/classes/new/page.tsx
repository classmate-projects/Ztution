import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { CreateClassForm } from "./CreateClassForm";

export default async function NewClassPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role !== "teacher") redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; My Classes
        </Link>
        <h1 className="mt-3 text-xl font-semibold">Create a class</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Give it a name — you can invite students and add materials next.
        </p>
      </div>
      <Card>
        <CreateClassForm />
      </Card>
    </div>
  );
}
