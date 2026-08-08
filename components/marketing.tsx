import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { LogoMark } from "@/components/brand";

/**
 * Dark-only UI primitives for the pre-login pages (landing, sign in, sign
 * up). Deliberately separate from components/ui.tsx, which the dashboard
 * uses and which follows the visitor's system light/dark preference — these
 * marketing pages must always render dark, so they can't rely on `dark:`
 * variants and need their own literal-color components.
 */

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-indigo-500 text-white shadow-lg shadow-indigo-950/40 hover:bg-indigo-400",
  secondary: "border border-white/15 text-white hover:border-white/25 hover:bg-white/5",
  ghost: "text-slate-300 hover:text-white",
};

export const marketingButtonClasses = (variant: Variant = "primary", className = "") =>
  `inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${VARIANT_CLASSES[variant]} ${className}`;

export function MarketingButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={marketingButtonClasses(variant, className)} {...props} />;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span className="text-base font-semibold tracking-tight text-white">Ztution</span>
    </Link>
  );
}

export function MarketingCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition-colors hover:border-white/15 ${className}`}
    >
      {children}
    </div>
  );
}

export const fieldInputClasses =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20";

export function MarketingField({
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
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export function MarketingInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldInputClasses} ${props.className ?? ""}`} />;
}

export function MarketingRadioCard({
  name,
  value,
  label,
  icon,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-colors ${
        checked
          ? "border-indigo-400/60 bg-indigo-500/10 text-white"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
          checked ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-slate-400"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-indigo-400 bg-indigo-400" : "border-white/20"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />}
      </span>
    </label>
  );
}

export function MarketingErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {message}
    </div>
  );
}
