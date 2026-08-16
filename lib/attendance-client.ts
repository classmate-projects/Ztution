"use client";

/**
 * Self-reported attendance for the post-call summary report (students only —
 * see app/api/classes/[id]/sessions/[sessionId]/attendance/route.ts). Shared
 * between CallRoom and StreamingRoom so both call types build the same report.
 */

export async function recordAttendanceJoin(classId: string, sessionId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/classes/${classId}/sessions/${sessionId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join" }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { attendanceId?: string } };
    return body.data?.attendanceId ?? null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget by design — called from effect cleanup and page-unload
 * handlers, neither of which can await a response. Prefers sendBeacon (the
 * only thing reliably delivered during unload); falls back to a keepalive
 * fetch for browsers where sendBeacon is unavailable or rejects the payload.
 */
export function recordAttendanceLeave(classId: string, sessionId: string, attendanceId: string) {
  const url = `/api/classes/${classId}/sessions/${sessionId}/attendance`;
  const payload = JSON.stringify({ action: "leave", attendanceId });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
