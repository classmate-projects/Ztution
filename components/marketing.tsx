"use client";

import Link from "next/link";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

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
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-sm font-bold text-white">
        Z
      </span>
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

const fieldInputClasses =
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

const EYE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
    <path d="M2.25 12S5.5 5.25 12 5.25 21.75 12 21.75 12 18.5 18.75 12 18.75 2.25 12 2.25 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EYE_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
    <path d="M3 3l18 18" />
    <path d="M10.6 5.4A10.9 10.9 0 0 1 12 5.25c6.5 0 9.75 6.75 9.75 6.75a15 15 0 0 1-3.34 4.24M6.5 6.9C4.06 8.5 2.25 12 2.25 12s3.25 6.75 9.75 6.75a10.6 10.6 0 0 0 4.24-.86" />
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
  </svg>
);

export function MarketingPasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${fieldInputClasses} pr-11 ${props.className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3.5 text-slate-500 transition-colors hover:text-slate-300"
      >
        {visible ? EYE_ICON : EYE_OFF_ICON}
      </button>
    </div>
  );
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
