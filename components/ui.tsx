import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 text-white shadow-md shadow-violet-500/25 hover:brightness-110 hover:shadow-lg hover:shadow-violet-500/30",
  secondary:
    "bg-white/80 border border-zinc-200 text-zinc-900 hover:bg-white hover:border-violet-300 dark:bg-white/5 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-white/10",
  danger:
    "bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-md shadow-rose-500/25 hover:brightness-110",
  ghost: "bg-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
};

export const buttonClasses = (variant: Variant = "primary", className = "") =>
  `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-95 ${VARIANT_CLASSES[variant]} ${className}`;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm shadow-indigo-950/5 backdrop-blur-sm transition-shadow hover:shadow-md hover:shadow-indigo-950/10 dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {children}
    </div>
  );
}

const fieldInputClasses =
  "w-full rounded-lg border border-zinc-300 bg-white/90 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100";

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldInputClasses} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldInputClasses} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldInputClasses} ${props.className ?? ""}`} />;
}

const BADGE_CLASSES: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  live: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  ended: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400",
  assigned: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function Badge({ status }: { status: string }) {
  const classes = BADGE_CLASSES[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {status === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />}
      {status}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {message}
    </div>
  );
}
