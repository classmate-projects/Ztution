import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CreateClassForm } from "./CreateClassForm";

export default async function NewClassPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role !== "teacher") redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Create a class</h1>
      <CreateClassForm />
    </div>
  );
}
