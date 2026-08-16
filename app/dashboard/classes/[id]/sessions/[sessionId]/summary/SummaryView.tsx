"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonClasses, Card } from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { StudentAttendanceSummary } from "@/lib/attendance";

interface Props {
  classId: string;
  className: string;
  sessionTitle: string;
  classDurationMs: number;
  startedAt: string | null;
  endedAt: string | null;
  students: StudentAttendanceSummary[];
}

export function SummaryView({
  classId,
  className,
  sessionTitle,
  classDurationMs,
  startedAt,
  endedAt,
  students,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(className, 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(sessionTitle, 14, 26);
      doc.setFontSize(10);
      doc.text(`Total duration: ${formatDuration(classDurationMs)}`, 14, 34);
      doc.text(`${formatDateTime(startedAt)} – ${formatDateTime(endedAt)}`, 14, 40);

      autoTable(doc, {
        startY: 46,
        head: [["#", "Student", "Duration", "Joined at", "Left at"]],
        body: students.map((s, i) => [
          String(i + 1),
          s.name,
          formatDuration(s.totalMs),
          formatDateTime(s.joinedAt),
          formatDateTime(s.leftAt),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      const safeTitle = sessionTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
      doc.save(`${safeTitle || "session"}-summary.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{className}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{sessionTitle} · Call summary</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/classes/${classId}`} className={buttonClasses("ghost")}>
            Back to class
          </Link>
          <Button onClick={downloadPdf} disabled={downloading}>
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">Total duration</p>
          <p className="mt-1 text-lg font-semibold">{formatDuration(classDurationMs)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">Started</p>
          <p className="mt-1 text-sm">{formatDateTime(startedAt)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">Ended</p>
          <p className="mt-1 text-sm">{formatDateTime(endedAt)}</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-medium uppercase text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Joined at</th>
                <th className="px-4 py-3">Left at</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500">
                    No students attended this call.
                  </td>
                </tr>
              ) : (
                students.map((s, i) => (
                  <tr
                    key={s.studentId}
                    className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{formatDuration(s.totalMs)}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDateTime(s.joinedAt)}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDateTime(s.leftAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
