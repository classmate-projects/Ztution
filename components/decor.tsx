const DEFAULT_ICONS = ["📚", "✏️", "🎓", "⭐", "💡", "🧠"];

interface Blob {
  className: string;
  color: string;
  delay: string;
  duration: string;
}

const BLOBS: Blob[] = [
  { className: "-left-24 -top-24 h-96 w-96", color: "bg-violet-400/40 dark:bg-violet-500/25", delay: "0s", duration: "16s" },
  { className: "-right-24 top-10 h-80 w-80", color: "bg-sky-400/35 dark:bg-sky-500/20", delay: "-5s", duration: "19s" },
  { className: "bottom-[-6rem] left-1/3 h-96 w-96", color: "bg-rose-300/40 dark:bg-fuchsia-500/20", delay: "-9s", duration: "21s" },
];

/**
 * Purely decorative animated backdrop (blurred color blobs + bobbing subject
 * icons) for marketing/auth pages. Not used on dashboard pages — those stay
 * calmer since people are doing real work there.
 */
export function PageDecor({ icons = DEFAULT_ICONS }: { icons?: string[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className={`animate-blob absolute rounded-full blur-3xl ${blob.className} ${blob.color}`}
          style={{ animationDelay: blob.delay, animationDuration: blob.duration }}
        />
      ))}
      {icons.map((icon, i) => (
        <span
          key={icon + i}
          className="animate-bob absolute text-3xl opacity-20 sm:text-4xl dark:opacity-25"
          style={{
            left: `${8 + ((i * 17) % 84)}%`,
            top: `${10 + ((i * 29) % 70)}%`,
            animationDelay: `${i * 0.9}s`,
            animationDuration: `${5 + (i % 3)}s`,
          }}
        >
          {icon}
        </span>
      ))}
    </div>
  );
}
