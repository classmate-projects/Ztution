// A fixed locale (rather than `undefined`, which resolves to whatever locale
// the runtime defaults to) keeps this identical between the server and the
// browser — otherwise differing server/client locales (e.g. 24h vs AM/PM)
// produce different text for the same timestamp and React's hydration fails.
const FORMAT_LOCALE = "en-US";

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(FORMAT_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(FORMAT_LOCALE, { dateStyle: "medium" });
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1) return `${bytes} B`;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
