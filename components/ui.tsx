import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
  secondary:
    "bg-transparent border border-zinc-300 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "bg-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
};

export const buttonClasses = (variant: Variant = "primary", className = "") =>
  `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASSES[variant]} ${className}`;

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
      className={`rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    >
      {children}
    </div>
  );
}

const fieldInputClasses =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

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
  scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  live: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  ended: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  assigned: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  active: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

export function Badge({ status }: { status: string }) {
  const classes = BADGE_CLASSES[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}>
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
