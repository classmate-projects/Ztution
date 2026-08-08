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

/** "Vishal" -> "V"; "Viraf Patel" -> "VP" (first letter of first + last name). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1) return `${bytes} B`;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
