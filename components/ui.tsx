import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400",
  secondary:
    "bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 dark:bg-white/5 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-white/10",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400",
  ghost: "bg-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
};

export const buttonClasses = (variant: Variant = "primary", className = "") =>
  `inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${VARIANT_CLASSES[variant]} ${className}`;

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
      className={`rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

const fieldInputClasses =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

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
