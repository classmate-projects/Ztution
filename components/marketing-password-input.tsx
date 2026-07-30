"use client";

import { useState, type InputHTMLAttributes } from "react";
import { fieldInputClasses } from "@/components/marketing";

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
