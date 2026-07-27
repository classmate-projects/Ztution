import Link from "next/link";
import { getSession } from "@/lib/session";
import { buttonClasses, Card } from "@/components/ui";
import { PageDecor } from "@/components/decor";

const FEATURES = [
  {
    icon: "🎥",
    title: "Live classes",
    description:
      "Teachers conduct lectures for their assigned students in scheduled or instantly-started class sessions.",
  },
  {
    icon: "📚",
    title: "Study materials",
    description:
      "Teachers upload slides, notes, and documents; students read and download them anytime, right from the class page.",
  },
  {
    icon: "🧑‍🏫",
    title: "Role-based dashboards",
    description:
      "Teachers manage classes, students, and materials. Students see only what's assigned to them — a clean, focused view.",
  },
];

export default async function Home() {
  const session = await getSession();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <PageDecor />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">
          <span className="text-gradient-brand">Ztution</span>
        </span>
        <nav className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard" className={buttonClasses("primary")}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signin" className={buttonClasses("ghost")}>
                Sign In
              </Link>
              <Link href="/signup" className={buttonClasses("primary")}>
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-16 text-center sm:py-24">
        <span className="animate-fade-in-up mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-1.5 text-sm font-medium text-violet-700 shadow-sm backdrop-blur-sm dark:border-violet-500/30 dark:bg-white/5 dark:text-violet-300">
          ✨ Learning made fun for every age
        </span>
        <h1 className="animate-fade-in-up max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          One place for lectures, materials, and{" "}
          <span className="text-gradient-brand">every class</span> you teach or attend.
        </h1>
        <p className="animate-fade-in-up mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Ztution gives teachers a simple way to run classes and share study materials, and gives
          students an easy way to join in and keep up.
        </p>
        <div className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={session ? "/dashboard" : "/signup"} className={buttonClasses("primary", "px-8 py-3")}>
            {session ? "Go to Dashboard" : "Get Started Free"}
          </Link>
          {!session && (
            <Link href="/signin" className={buttonClasses("secondary", "px-8 py-3")}>
              Sign In
            </Link>
          )}
        </div>

        <div className="mt-20 grid w-full gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="animate-fade-in-up">
              <span className="text-2xl">{feature.icon}</span>
              <h2 className="mt-3 text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{feature.description}</p>
            </Card>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-center text-sm text-zinc-500">
        Ztution — built for teachers and students.
      </footer>
    </div>
  );
}
