"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge, buttonClasses, Card } from "@/components/ui";
import { InviteActions } from "@/components/dashboard";
import { RealtimeClassRefresher } from "@/components/realtime-class";
import { ChatGroupList, ChatPanel } from "@/components/class-chat";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { ChatGroupRow, ClassRow, ClassSessionRow, ClassStudentRow, MaterialRow } from "@/lib/supabase/types";

interface Props {
  klass: ClassRow;
  sessions: ClassSessionRow[];
  materials: MaterialRow[];
  chatGroups: ChatGroupRow[];
  enrollment: ClassStudentRow;
  currentUserId: string;
}

type TabId = "sessions" | "materials";

/** What's showing in the main panel: a top-level tab, or an open chat group. */
type ClassNavView = { kind: "tab"; tab: TabId } | { kind: "chat"; groupId: string };

const SESSIONS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18" />
    <path d="M8 3v4M16 3v4" />
  </svg>
);

const MATERIALS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <path d="M6 2.75h8.5L19 7.25V19.5a1.75 1.75 0 0 1-1.75 1.75H6A1.75 1.75 0 0 1 4.25 19.5v-15A1.75 1.75 0 0 1 6 2.75Z" />
    <path d="M14 2.75V7a1 1 0 0 0 1 1h4" />
    <path d="M8 12.5h8M8 16h5" />
  </svg>
);

const CHATS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5Z" />
    <path d="M8 8.5h8M8 11.5h5" strokeLinecap="round" />
  </svg>
);

const CHEVRON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DOWNLOAD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M12 3v12m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_BUTTON_CLASSES =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/10";

export function StudentClassView({ klass, sessions, materials, chatGroups, enrollment, currentUserId }: Props) {
  const [view, setView] = useState<ClassNavView>({ kind: "tab", tab: "sessions" });
  const [chatsExpanded, setChatsExpanded] = useState(false);

  if (enrollment.status === "suspended") {
    return (
      <div className="flex flex-col gap-6">
        <RealtimeClassRefresher classId={klass.id} />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{klass.name}</h1>
          <Badge status={enrollment.status} />
        </div>
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your access to this class has been suspended. Contact your teacher to have it restored.
          </p>
        </Card>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; count: number; icon: ReactNode }[] = [
    { id: "sessions", label: "Class Sessions", count: sessions.length, icon: SESSIONS_ICON },
    { id: "materials", label: "Study Materials", count: materials.length, icon: MATERIALS_ICON },
  ];

  const activeChatGroup =
    view.kind === "chat" ? chatGroups.find((g) => g.id === view.groupId) ?? null : null;
  const chatsActive = view.kind === "chat";

  function renderTab(tab: { id: TabId; label: string; count: number; icon: ReactNode }) {
    const active = view.kind === "tab" && view.tab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setView({ kind: "tab", tab: tab.id })}
        className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:w-full ${
          active
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
        }`}
      >
        <span className={active ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"}>
          {tab.icon}
        </span>
        <span className="flex-1 whitespace-nowrap text-left">{tab.label}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
            active
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
              : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
          }`}
        >
          {tab.count}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RealtimeClassRefresher classId={klass.id} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{klass.name}</h1>
        {enrollment.status === "assigned" ? (
          <InviteActions classId={klass.id} />
        ) : (
          <Badge status={enrollment.status} />
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className="flex gap-2 overflow-x-auto lg:w-56 lg:flex-none lg:flex-col lg:gap-1 lg:overflow-visible">
          {tabs.map(renderTab)}

          {/* Chats — expands in place to list the class's chat groups. */}
          <button
            type="button"
            onClick={() => setChatsExpanded((v) => !v)}
            className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:w-full ${
              chatsActive
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
            }`}
          >
            <span className={chatsActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"}>
              {CHATS_ICON}
            </span>
            <span className="flex-1 whitespace-nowrap text-left">Chats</span>
            {chatGroups.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  chatsActive
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
                }`}
              >
                {chatGroups.length}
              </span>
            )}
            <span className={`text-zinc-400 transition-transform dark:text-zinc-500 ${chatsExpanded ? "rotate-90" : ""}`}>
              {CHEVRON_ICON}
            </span>
          </button>

          {chatsExpanded && (
            <div className="pl-3 lg:pl-4">
              <ChatGroupList
                groups={chatGroups}
                activeGroupId={view.kind === "chat" ? view.groupId : null}
                onSelect={(groupId) => setView({ kind: "chat", groupId })}
                canCreate={false}
                onNewChat={() => {}}
              />
            </div>
          )}
        </nav>

        <div className="min-w-0 flex-1">
          {view.kind === "tab" && view.tab === "sessions" && (
            <SessionsPanel klass={klass} sessions={sessions} enrollment={enrollment} />
          )}
          {view.kind === "tab" && view.tab === "materials" && <MaterialsPanel materials={materials} />}
          {view.kind === "chat" &&
            (activeChatGroup ? (
              <ChatPanel
                key={activeChatGroup.id}
                classId={klass.id}
                groupId={activeChatGroup.id}
                groupName={activeChatGroup.name}
                currentUserId={currentUserId}
              />
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Select a chat from the sidebar to start messaging.
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}

function SessionsPanel({
  klass,
  sessions,
  enrollment,
}: {
  klass: ClassRow;
  sessions: ClassSessionRow[];
  enrollment: ClassStudentRow;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Class Sessions</h2>
      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No sessions scheduled yet — check back later.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <Card key={session.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <div className="font-medium">{session.title}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(session.scheduled_at)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={session.status} />
                {session.status === "live" &&
                  (enrollment.status === "active" ? (
                    <Link
                      href={`/dashboard/classes/${klass.id}/sessions/${session.id}/call`}
                      className={buttonClasses("primary")}
                    >
                      Join Call
                    </Link>
                  ) : (
                    <span
                      title="Join the class before you can join a live call"
                      className="cursor-not-allowed rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-400 dark:bg-zinc-800"
                    >
                      Join Call
                    </span>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function MaterialsPanel({ materials }: { materials: MaterialRow[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Study Materials</h2>
      {materials.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No materials shared yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((material) => (
            <Card key={material.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{material.title}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {material.file_name}{" "}
                  {material.size_bytes ? `· ${formatFileSize(material.size_bytes)}` : ""}
                </div>
              </div>
              <a
                href={`/api/materials/${material.id}/download`}
                className={ICON_BUTTON_CLASSES}
                title="Download"
                aria-label="Download"
              >
                {DOWNLOAD_ICON}
              </a>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
