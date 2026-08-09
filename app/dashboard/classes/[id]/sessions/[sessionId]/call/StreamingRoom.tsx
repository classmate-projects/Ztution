"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { callChannelName, ICE_SERVERS } from "@/lib/webrtc-config";
import { Button, ErrorBanner } from "@/components/ui";
import { initials } from "@/lib/format";
import type { ClassSessionRow, Role } from "@/lib/supabase/types";

interface CurrentUser {
  id: string;
  name: string;
  role: Role;
}

interface Props {
  classId: string;
  classNameLabel: string;
  session: ClassSessionRow;
  currentUser: CurrentUser;
}

interface PresenceMeta {
  id: string;
  name: string;
  role: Role;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  at: number;
}

type SignalPayload =
  | { type: "offer"; from: string; to: string; data: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; data: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; from: string; to: string; data: RTCIceCandidateInit };

const MIC_ON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
  </svg>
);

const MIC_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M9 9v-3a3 3 0 0 1 5.5-1.7M15 11.5V11" strokeLinecap="round" />
    <path d="M5 11a7 7 0 0 0 10.6 6M19 11a7 7 0 0 1-1 3.6M12 18v3" strokeLinecap="round" />
    <path d="M4 4l16 16" strokeLinecap="round" />
  </svg>
);

const CAM_ON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="M15 10.5 21 7v10l-6-3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CAM_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M15 10.5 21 7v10l-6-3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-.3 1M11 18H5a2 2 0 0 1-2-2V8" strokeLinecap="round" />
    <path d="M4 4l16 16" strokeLinecap="round" />
  </svg>
);

const CHAT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
  </svg>
);

export function StreamingRoom({ classId, classNameLabel, session, currentUser }: Props) {
  const router = useRouter();
  const isTeacher = currentUser.role === "teacher";

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Teachers pass through a lobby before broadcasting; students go straight in.
  const [phase, setPhase] = useState<"lobby" | "live">(isTeacher ? "lobby" : "live");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const [teacherStream, setTeacherStream] = useState<MediaStream | null>(null);
  const [teacherLive, setTeacherLive] = useState(false);
  const [participants, setParticipants] = useState<PresenceMeta[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = isTeacher ? phase === "live" : true;

  // Teacher lobby: grab camera+mic for the preview. The same stream is reused
  // as the broadcast source once they go live (component never unmounts in
  // between), so we don't stop its tracks here.
  useEffect(() => {
    if (!isTeacher) return;
    let cancelled = false;
    (async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setMediaError("Camera unavailable — you can stream audio only.");
        } catch {
          setMediaError("Camera and microphone are blocked — enable them in your browser to stream.");
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setMicOn(Boolean(stream?.getAudioTracks().length));
      setCamOn(Boolean(stream?.getVideoTracks().length));
      if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;
    })();
    return () => {
      cancelled = true;
    };
  }, [isTeacher]);

  // Stop local capture on unmount regardless of which phase we're in.
  useEffect(
    () => () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  // Keep the teacher's own <video> wired to the local stream across lobby→live.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [phase, camOn]);

  useEffect(() => {
    if (remoteVideoRef.current && teacherStream) {
      remoteVideoRef.current.srcObject = teacherStream;
    }
  }, [teacherStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  // Signaling + WebRTC (star topology). Runs once the teacher goes live, and
  // immediately for students. Reuses the presence/broadcast pattern of the
  // conference room, but only the teacher publishes media.
  useEffect(() => {
    if (!active) return;

    const supabase = createBrowserSupabaseClient();
    const pcs = peerConnectionsRef.current;
    const channel = supabase.channel(callChannelName(session.id), {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    function sendSignal(msg: Omit<SignalPayload, "from">) {
      channel.send({ type: "broadcast", event: "signal", payload: { ...msg, from: currentUser.id } });
    }

    // Teacher → student: build a connection, publish local tracks, offer.
    async function connectToStudent(studentId: string) {
      if (pcs.has(studentId)) return;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcs.set(studentId, pc);
      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal({ type: "ice-candidate", to: studentId, data: event.candidate.toJSON() });
      };
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: "offer", to: studentId, data: offer });
      } catch {
        // If negotiation fails the student can rejoin to retry.
      }
    }

    // Student → teacher: receive-only connection.
    function connectToTeacher(teacherId: string) {
      let pc = pcs.get(teacherId);
      if (pc) return pc;
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcs.set(teacherId, pc);
      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal({ type: "ice-candidate", to: teacherId, data: event.candidate.toJSON() });
      };
      pc.ontrack = (event) => {
        setTeacherStream(event.streams[0]);
        setTeacherLive(true);
      };
      return pc;
    }

    async function handleSignal(payload: SignalPayload) {
      if (isTeacher) {
        const pc = pcs.get(payload.from);
        if (payload.type === "answer") {
          await pc?.setRemoteDescription(new RTCSessionDescription(payload.data));
        } else if (payload.type === "ice-candidate") {
          try {
            await pc?.addIceCandidate(new RTCIceCandidate(payload.data));
          } catch {
            // Candidate before remote description is harmless.
          }
        }
      } else {
        if (payload.type === "offer") {
          const pc = connectToTeacher(payload.from);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: "answer", to: payload.from, data: answer });
        } else if (payload.type === "ice-candidate") {
          const pc = pcs.get(payload.from);
          try {
            await pc?.addIceCandidate(new RTCIceCandidate(payload.data));
          } catch {
            // As above.
          }
        }
      }
    }

    channel.on("broadcast", { event: "signal" }, ({ payload }: { payload: SignalPayload }) => {
      if (payload.to !== currentUser.id) return;
      void handleSignal(payload);
    });

    channel.on("broadcast", { event: "chat" }, ({ payload }: { payload: ChatMessage }) => {
      setMessages((prev) => [...prev, payload]);
    });

    // Teacher ended the stream — send viewers back to the class page.
    channel.on("broadcast", { event: "ended" }, () => {
      if (!isTeacher) router.push(`/dashboard/classes/${classId}`);
    });

    function syncPresence() {
      const state = channel.presenceState<PresenceMeta>();
      const others: PresenceMeta[] = [];
      for (const key of Object.keys(state)) {
        if (key === currentUser.id) continue;
        const meta = state[key][0];
        others.push(meta);
        if (isTeacher && meta.role === "student" && !pcs.has(key)) {
          void connectToStudent(key);
        }
      }
      setParticipants(others);
      if (!isTeacher) setTeacherLive(others.some((p) => p.role === "teacher"));
    }

    channel.on("presence", { event: "sync" }, syncPresence);
    channel.on("presence", { event: "join" }, syncPresence);
    channel.on("presence", { event: "leave" }, ({ key }: { key: string }) => {
      pcs.get(key)?.close();
      pcs.delete(key);
      syncPresence();
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ id: currentUser.id, name: currentUser.name, role: currentUser.role } satisfies PresenceMeta);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnectionError("Lost connection to the stream. Try leaving and rejoining.");
      }
    });

    return () => {
      pcs.forEach((pc) => pc.close());
      pcs.clear();
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, session.id]);

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function toggleCamera() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }

  function sendChat(event: FormEvent) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text,
      at: Date.now(),
    };
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setMessages((prev) => [...prev, msg]);
    setChatInput("");
  }

  async function endStream() {
    setEnding(true);
    channelRef.current?.send({ type: "broadcast", event: "ended", payload: {} });
    try {
      await fetch(`/api/classes/${classId}/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
    } finally {
      router.push(`/dashboard/classes/${classId}`);
    }
  }

  function leave() {
    router.push(`/dashboard/classes/${classId}`);
  }

  // ---- Teacher lobby -------------------------------------------------------
  if (isTeacher && phase === "lobby") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">{session.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{classNameLabel} · Streaming</p>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-900">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${camOn ? "" : "hidden"}`}
            style={{ transform: "scaleX(-1)" }}
          />
          {!camOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold">
                {initials(currentUser.name)}
              </span>
              <span className="text-sm text-white/70">Camera is off</span>
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
            <ControlButton active={micOn} onClick={toggleMic} label={micOn ? "Turn off mic" : "Turn on mic"}>
              {micOn ? MIC_ON_ICON : MIC_OFF_ICON}
            </ControlButton>
            <ControlButton active={camOn} onClick={toggleCamera} label={camOn ? "Turn off camera" : "Turn on camera"}>
              {camOn ? CAM_ON_ICON : CAM_OFF_ICON}
            </ControlButton>
          </div>
        </div>

        {mediaError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {mediaError}
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Choose your camera and mic, then go live. Students will start watching right away.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={leave}>
              Cancel
            </Button>
            <Button onClick={() => setPhase("live")}>Start Stream</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Live call screen (teacher broadcasting / student watching) ----------
  const viewerCount = isTeacher
    ? participants.filter((p) => p.role === "student").length
    : participants.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{session.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{classNameLabel} · Streaming</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
            Live
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {isTeacher
              ? `${viewerCount} watching`
              : `${viewerCount} ${viewerCount === 1 ? "person" : "people"} in the room`}
          </span>
        </div>
      </div>

      <ErrorBanner message={connectionError} />

      <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-900">
        {isTeacher ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${camOn ? "" : "hidden"}`}
              style={{ transform: "scaleX(-1)" }}
            />
            {!camOn && <Placeholder name={currentUser.name} caption="Your camera is off" />}
            <span className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {currentUser.name} (You)
            </span>
          </>
        ) : teacherStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            <span className="text-sm">
              {teacherLive ? "Connecting to the stream…" : "Waiting for the teacher to start…"}
            </span>
          </div>
        )}
      </div>

      {chatOpen && (
        <ChatPanel
          messages={messages}
          currentUserId={currentUser.id}
          value={chatInput}
          onChange={setChatInput}
          onSubmit={sendChat}
          onClose={() => setChatOpen(false)}
          endRef={messagesEndRef}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isTeacher && (
          <>
            <ControlButton active={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"}>
              {micOn ? MIC_ON_ICON : MIC_OFF_ICON}
            </ControlButton>
            <ControlButton active={camOn} onClick={toggleCamera} label={camOn ? "Stop camera" : "Start camera"}>
              {camOn ? CAM_ON_ICON : CAM_OFF_ICON}
            </ControlButton>
          </>
        )}
        <ControlButton active={chatOpen} onClick={() => setChatOpen((v) => !v)} label="Toggle chat">
          {CHAT_ICON}
        </ControlButton>
        {isTeacher ? (
          <Button variant="danger" onClick={endStream} disabled={ending}>
            {ending ? "Ending…" : "End Stream"}
          </Button>
        ) : (
          <Button variant="danger" onClick={leave}>
            Leave
          </Button>
        )}
      </div>
    </div>
  );
}

function Placeholder({ name, caption }: { name: string; caption: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold">
        {initials(name)}
      </span>
      <span className="text-sm text-white/70">{caption}</span>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
        active
          ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
          : "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
      }`}
    >
      {children}
    </button>
  );
}

function ChatPanel({
  messages,
  currentUserId,
  value,
  onChange,
  onSubmit,
  onClose,
  endRef,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
        <span className="text-sm font-medium">In-call messages</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          title="Close chat"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span
                className={`font-medium ${
                  m.senderId === currentUserId
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                {m.senderId === currentUserId ? "You" : m.senderName}
                {m.senderRole === "teacher" ? " (Teacher)" : ""}
              </span>
              <span className="ml-2 break-words text-zinc-600 dark:text-zinc-300">{m.text}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-white/10">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Send a message to everyone"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <Button type="submit" disabled={!value.trim()}>
          Send
        </Button>
      </form>
    </aside>
  );
}
