export interface StudentAttendanceSummary {
  studentId: string;
  name: string;
  totalMs: number;
  /** First time they joined this session, across all segments. */
  joinedAt: string;
  /** Last time they left (or the session's end, for a segment that never recorded a leave). */
  leftAt: string;
}

/**
 * Collapses raw session_attendance rows (one per join/leave segment — a
 * student who reconnects gets more than one) into one summary row per
 * student: total time across all their segments, first join, last leave.
 */
export function summarizeAttendance(
  rows: { studentId: string; name: string; joinedAt: string; leftAt: string | null }[],
  sessionEndedAt: string | null
): StudentAttendanceSummary[] {
  const fallbackEnd = sessionEndedAt ?? new Date().toISOString();
  const byStudent = new Map<string, StudentAttendanceSummary>();

  for (const row of rows) {
    const effectiveLeft = row.leftAt ?? fallbackEnd;
    const durationMs = Math.max(0, new Date(effectiveLeft).getTime() - new Date(row.joinedAt).getTime());

    const existing = byStudent.get(row.studentId);
    if (!existing) {
      byStudent.set(row.studentId, {
        studentId: row.studentId,
        name: row.name,
        totalMs: durationMs,
        joinedAt: row.joinedAt,
        leftAt: effectiveLeft,
      });
      continue;
    }

    existing.totalMs += durationMs;
    if (new Date(row.joinedAt) < new Date(existing.joinedAt)) existing.joinedAt = row.joinedAt;
    if (new Date(effectiveLeft) > new Date(existing.leftAt)) existing.leftAt = effectiveLeft;
  }

  return Array.from(byStudent.values()).sort((a, b) => a.name.localeCompare(b.name));
}
