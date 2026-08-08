/**
 * Backdrop for marketing/auth pages (landing, sign in, sign up) — the pages
 * shown before login. These are always dark, regardless of the visitor's
 * system theme; the light/dark switch is a post-login feature.
 */
export function MarketingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-zinc-950" aria-hidden="true">
      <div
        className="bg-grid-slate absolute inset-0"
        style={{
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 30%, transparent 85%)",
        }}
      />
      <div className="animate-glow-pulse absolute left-1/2 top-[-14rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
      <div className="absolute bottom-[-12rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[110px]" />
    </div>
  );
}
