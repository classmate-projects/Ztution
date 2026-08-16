import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-600/25 dark:bg-indigo-500 dark:shadow-indigo-500/10 dark:hover:bg-indigo-400 dark:hover:shadow-indigo-500/20",
  secondary:
    "bg-white border border-zinc-200 text-zinc-900 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 dark:bg-white/5 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-white/10",
  danger:
    "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-500 hover:shadow-md hover:shadow-red-600/25 dark:bg-red-500 dark:hover:bg-red-400",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100",
};

export const buttonClasses = (variant: Variant = "primary", className = "") =>
  `inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium outline-none transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none active:scale-[0.98] ${VARIANT_CLASSES[variant]} ${className}`;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

export function Card({
  children,
  className = "",
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/[0.03] transition-all duration-200 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-black/10 ${
        hoverable
          ? "hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-900/[0.06] dark:hover:border-white/20 dark:hover:shadow-black/20"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export const fieldInputClasses =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors hover:border-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600";

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
  suspended: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
};

export function Badge({ status }: { status: string }) {
  const classes = BADGE_CLASSES[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ring-current/10 ${classes}`}
    >
      {status === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
        </span>
      )}
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

const AVATAR_COLORS = [
  "bg-indigo-600 dark:bg-indigo-500",
  "bg-violet-600 dark:bg-violet-500",
  "bg-sky-600 dark:bg-sky-500",
  "bg-emerald-600 dark:bg-emerald-500",
  "bg-amber-600 dark:bg-amber-500",
  "bg-rose-600 dark:bg-rose-500",
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const AVATAR_SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: keyof typeof AVATAR_SIZE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-zinc-950 ${AVATAR_SIZE_CLASSES[size]} ${colorForName(name)} ${className}`}
    >
      {initialsFrom(name)}
    </span>
  );
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
        {description && <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
