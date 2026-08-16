import Link from "next/link";
import { getSession } from "@/lib/session";
import { Logo, MarketingCard, marketingButtonClasses } from "@/components/marketing";
import { MarketingBackdrop } from "@/components/decor";

const FEATURES = [
  {
    title: "Live classes",
    description:
      "Teachers conduct lectures for their assigned students in scheduled or instantly-started class sessions.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
        <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
        <path d="M15.5 10.2 20.4 7.3c.66-.4 1.5.08 1.5.85v7.7c0 .77-.84 1.24-1.5.85l-4.9-2.9" />
      </svg>
    ),
  },
  {
    title: "Study materials",
    description:
      "Teachers upload slides, notes, and documents; students read and download them anytime, right from the class page.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
        <path d="M6 2.75h8.5L19 7.25V19.5a1.75 1.75 0 0 1-1.75 1.75H6A1.75 1.75 0 0 1 4.25 19.5v-15A1.75 1.75 0 0 1 6 2.75Z" />
        <path d="M14 2.75V7a1 1 0 0 0 1 1h4" />
        <path d="M8 12.5h8M8 16h5" />
      </svg>
    ),
  },
  {
    title: "Role-based dashboards",
    description:
      "Teachers manage classes, students, and materials. Students see only what's assigned to them — a clean, focused view.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
        <rect x="2.75" y="4" width="18.5" height="16" rx="2.25" />
        <path d="M9.5 4v16" />
        <path d="M2.75 9h6.75" />
      </svg>
    ),
  },
];

const STEPS = [
  { step: "01", title: "Create a class", description: "Teachers set up a class and share the join details with their students." },
  { step: "02", title: "Invite students", description: "Students join with an invite, landing straight in their own focused dashboard." },
  { step: "03", title: "Go live", description: "Start a lecture, share materials, and keep everything in one place." },
];

export default async function Home() {
  const session = await getSession();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-zinc-950 text-white">
      <MarketingBackdrop />

      <header className="sticky top-0 z-10 border-b border-white/5 bg-zinc-950/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            {session ? (
              <Link href="/dashboard" className={marketingButtonClasses("primary")}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/signin" className={marketingButtonClasses("ghost")}>
                  Sign In
                </Link>
                <Link href="/signup" className={marketingButtonClasses("primary")}>
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 py-20 text-center sm:py-28">
        <span className="animate-fade-in-up mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-slate-300 shadow-sm shadow-black/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Built for teachers &amp; students
        </span>
        <h1 className="animate-fade-in-up max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          One place for lectures, materials, and{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
            every class
          </span>{" "}
          you teach or attend.
        </h1>
        <p className="animate-fade-in-up mt-6 max-w-xl text-lg text-slate-400">
          Ztution gives teachers a simple way to run classes and share study materials, and gives
          students an easy way to join in and keep up.
        </p>
        <div className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={session ? "/dashboard" : "/signup"} className={marketingButtonClasses("primary", "px-8 py-3")}>
            {session ? "Go to Dashboard" : "Get Started Free"}
          </Link>
          {!session && (
            <Link href="/signin" className={marketingButtonClasses("secondary", "px-8 py-3")}>
              Sign In
            </Link>
          )}
        </div>

        <div className="mt-24 grid w-full gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <MarketingCard
              key={feature.title}
              className="animate-fade-in-up group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors duration-200 group-hover:bg-indigo-500/20">
                {feature.icon}
              </span>
              <h2 className="mt-4 text-base font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
            </MarketingCard>
          ))}
        </div>

        <div className="mt-28 w-full">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">How it works</h2>
          <div className="relative mt-10 grid w-full gap-8 text-left sm:grid-cols-3">
            <div className="absolute top-5 left-0 hidden h-px w-full bg-gradient-to-r from-white/15 via-white/15 to-transparent sm:block" />
            {STEPS.map((item, index) => (
              <div
                key={item.step}
                className="animate-fade-in-up relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/30 bg-zinc-950 text-sm font-semibold text-indigo-400">
                  {item.step}
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-fade-in-up relative mt-28 flex w-full flex-col items-center gap-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-12">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(99, 102, 241, 0.18), transparent)",
            }}
          />
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ready to bring your classroom online?
          </h2>
          <p className="max-w-md text-sm text-slate-400">
            Create your first class in minutes — no credit card required.
          </p>
          <Link href={session ? "/dashboard" : "/signup"} className={marketingButtonClasses("primary", "px-8 py-3")}>
            {session ? "Go to Dashboard" : "Get Started Free"}
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <span>© 2026 Ztution — built for teachers and students.</span>
        </div>
      </footer>
    </div>
  );
}
