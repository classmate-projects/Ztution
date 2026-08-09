"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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
  // Teacher only: whether they're currently sending video (camera or screen).
  // Lets viewers show a "camera off" placeholder instead of a black frame.
  videoOn?: boolean;
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

const SCREEN_SHARE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    <path d="M12 12V7m0 0-2 2m2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FS_ENTER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path
      d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FS_EXIT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path
      d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LEAVE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M15 12H4M4 12l4-4M4 12l4 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 4h9a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function StreamingRoom({ classId, classNameLabel, session, currentUser }: Props) {
  const router = useRouter();
  const isTeacher = currentUser.role === "teacher";

  const stageRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Teachers pass through a lobby before broadcasting; students go straight in.
  const [phase, setPhase] = useState<"lobby" | "live">(isTeacher ? "lobby" : "live");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const [teacherStream, setTeacherStream] = useState<MediaStream | null>(null);
  const [teacherLive, setTeacherLive] = useState(false);
  const [teacherVideoOn, setTeacherVideoOn] = useState(true);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [participants, setParticipants] = useState<PresenceMeta[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = isTeacher ? phase === "live" : true;

  const sendSignal = useCallback(
    (msg: Omit<SignalPayload, "from">) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: { ...msg, from: currentUser.id },
      });
    },
    [currentUser.id]
  );

  // The teacher advertises whether they're currently sending any video so
  // viewers can distinguish "camera off" from a still-connecting stream.
  const presencePayload = useCallback((): PresenceMeta => {
    const videoOn = isTeacher
      ? Boolean(screenStreamRef.current) || Boolean(localStreamRef.current?.getVideoTracks()[0]?.enabled)
      : undefined;
    return { id: currentUser.id, name: currentUser.name, role: currentUser.role, videoOn };
  }, [currentUser.id, currentUser.name, currentUser.role, isTeacher]);

  // Rebind the same stream to force the decoder to repaint. Chrome can leave a
  // green frame after a layout change (fullscreen) or a silent track swap
  // (screen share via replaceTrack) because srcObject never changed identity.
  function repaintVideo(video: HTMLVideoElement | null) {
    if (!video || !video.srcObject) return;
    const stream = video.srcObject;
    video.srcObject = null;
    requestAnimationFrame(() => {
      video.srcObject = stream;
      void video.play?.().catch(() => {});
    });
  }

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

  // Stop all local capture on unmount.
  useEffect(
    () => () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  // Keep the teacher's own <video> wired to the current source (camera or, when
  // sharing, the screen) across lobby→live and camera toggles.
  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = screenStreamRef.current ?? localStreamRef.current;
  }, [phase, camOn, sharingScreen]);

  useEffect(() => {
    if (remoteVideoRef.current && teacherStream) {
      remoteVideoRef.current.srcObject = teacherStream;
    }
  }, [teacherStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  // Track real (OS-level) fullscreen so the button icon and layout stay in sync
  // even when the user exits with Esc.
  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Entering/leaving fullscreen relays out the video element but keeps the same
  // srcObject — repaint to clear any leftover green frame.
  useEffect(() => {
    repaintVideo(isTeacher ? localVideoRef.current : remoteVideoRef.current);
  }, [isFullscreen, isTeacher]);

  // When the teacher's camera comes back on, the receiver's track resumes real
  // frames but the element can stay stuck on the last (black) frame — repaint it.
  useEffect(() => {
    if (!isTeacher && teacherVideoOn) repaintVideo(remoteVideoRef.current);
  }, [isTeacher, teacherVideoOn]);

  // Re-advertise the teacher's video state whenever it changes so viewers can
  // toggle their "camera off" placeholder.
  useEffect(() => {
    if (!isTeacher || !active) return;
    void channelRef.current?.track(presencePayload());
  }, [isTeacher, active, camOn, sharingScreen, presencePayload]);

  // Signaling + WebRTC (star topology). Runs once the teacher goes live, and
  // immediately for students. Only the teacher publishes media.
  useEffect(() => {
    if (!active) return;

    const supabase = createBrowserSupabaseClient();
    const pcs = peerConnectionsRef.current;
    const channel = supabase.channel(callChannelName(session.id), {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    // Teacher → student: build a connection, publish the current audio + video
    // (screen share takes precedence over camera), and offer.
    async function connectToStudent(studentId: string) {
      if (pcs.has(studentId)) return;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcs.set(studentId, pc);

      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack && localStreamRef.current) pc.addTrack(audioTrack, localStreamRef.current);
      const videoTrack =
        screenStreamRef.current?.getVideoTracks()[0] ?? localStreamRef.current?.getVideoTracks()[0];
      const videoOwner = screenStreamRef.current ?? localStreamRef.current;
      if (videoTrack && videoOwner) pc.addTrack(videoTrack, videoOwner);

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

    // Teacher switched camera↔screen (same receiver track, new content) —
    // repaint to avoid a green frame on the viewer's side.
    channel.on("broadcast", { event: "source-changed" }, () => {
      if (!isTeacher) repaintVideo(remoteVideoRef.current);
    });

    function syncPresence() {
      const state = channel.presenceState<PresenceMeta>();
      const others: PresenceMeta[] = [];
      for (const key of Object.keys(state)) {
        if (key === currentUser.id) continue;
        // A presence key can momentarily hold an empty array while a client
        // re-tracks (e.g. the teacher updating videoOn), so guard the entry.
        const meta = state[key][0];
        if (!meta) continue;
        others.push(meta);
        if (isTeacher && meta.role === "student" && !pcs.has(key)) {
          void connectToStudent(key);
        }
      }
      setParticipants(others);
      if (!isTeacher) {
        const teacher = others.find((p) => p.role === "teacher");
        setTeacherLive(Boolean(teacher));
        if (teacher) {
          setTeacherName(teacher.name);
          setTeacherVideoOn(teacher.videoOn ?? true);
        }
      }
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
        setConnectionError(null);
        await channel.track(presencePayload());
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
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

  // Swap the outgoing video track on every peer connection without a full
  // renegotiation (replaceTrack); fall back to add-track + re-offer only if a
  // peer has no video sender yet (teacher joined with no camera).
  async function replaceOutgoingVideo(track: MediaStreamTrack | null, owner: MediaStream | null) {
    for (const [peerId, pc] of peerConnectionsRef.current) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(track);
      } else if (track && owner) {
        pc.addTrack(track, owner);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: "offer", to: peerId, data: offer });
        } catch {
          // Viewer can rejoin to retry.
        }
      }
    }
  }

  async function startScreenShare() {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) return;
      screenStreamRef.current = display;
      await replaceOutgoingVideo(screenTrack, display);
      if (localVideoRef.current) localVideoRef.current.srcObject = display;
      channelRef.current?.send({ type: "broadcast", event: "source-changed", payload: {} });
      // Fires when the user stops sharing via the browser's own control.
      screenTrack.onended = () => void stopScreenShare();
      setSharingScreen(true);
    } catch {
      // User dismissed the picker.
    }
  }

  async function stopScreenShare() {
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    await replaceOutgoingVideo(cameraTrack, localStreamRef.current);
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    channelRef.current?.send({ type: "broadcast", event: "source-changed", payload: {} });
    setSharingScreen(false);
  }

  function toggleScreenShare() {
    if (sharingScreen) void stopScreenShare();
    else void startScreenShare();
  }

  function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void el.requestFullscreen?.();
    }
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
          {!camOn && <Placeholder name={currentUser.name} caption="Camera is off" />}
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

  const videoFit = isFullscreen ? "object-contain" : "object-cover";

  return (
    <div className="flex flex-col gap-4">
      <ErrorBanner message={connectionError} />

      <div
        ref={stageRef}
        className={`relative overflow-hidden bg-zinc-900 ${
          isFullscreen ? "h-screen w-screen" : "aspect-video w-full rounded-2xl"
        }`}
      >
        {isTeacher ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full ${videoFit} ${camOn || sharingScreen ? "" : "hidden"}`}
              style={{ transform: sharingScreen || isFullscreen ? "none" : "scaleX(-1)" }}
            />
            {!camOn && !sharingScreen && <Placeholder name={currentUser.name} caption="Your camera is off" />}
            <span className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {currentUser.name} (You){sharingScreen ? " · Sharing screen" : ""}
            </span>
          </>
        ) : teacherStream ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className={`h-full w-full ${videoFit}`} />
            {!teacherVideoOn && <Placeholder name={teacherName} caption="Camera is off" />}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            <span className="text-sm">
              {teacherLive ? "Connecting to the stream…" : "Waiting for the teacher to start…"}
            </span>
          </div>
        )}

        {/* Header overlay — title on the left, live tag + count on the right.
            Hidden in fullscreen so nothing sits over the video. */}
        {!isFullscreen && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent p-4">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-white">{session.title}</h1>
              <p className="truncate text-xs text-white/70">{classNameLabel} · Streaming</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 px-2.5 py-1 text-xs font-medium text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>
              <span className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                {isTeacher
                  ? `${viewerCount} watching`
                  : `${viewerCount} in room`}
              </span>
            </div>
          </div>
        )}

        {/* Controls overlay — lives inside the stage so it shows in fullscreen. */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm">
            {isTeacher && (
              <>
                <ControlButton active={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"}>
                  {micOn ? MIC_ON_ICON : MIC_OFF_ICON}
                </ControlButton>
                <ControlButton active={camOn} onClick={toggleCamera} label={camOn ? "Stop camera" : "Start camera"}>
                  {camOn ? CAM_ON_ICON : CAM_OFF_ICON}
                </ControlButton>
                <ToggleButton
                  on={sharingScreen}
                  onClick={toggleScreenShare}
                  label={sharingScreen ? "Stop sharing" : "Share screen"}
                >
                  {SCREEN_SHARE_ICON}
                </ToggleButton>
              </>
            )}
            <ToggleButton on={chatOpen} onClick={() => setChatOpen((v) => !v)} label="Toggle chat">
              {CHAT_ICON}
            </ToggleButton>
            <ToggleButton on={isFullscreen} onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? FS_EXIT_ICON : FS_ENTER_ICON}
            </ToggleButton>
            {isTeacher ? (
              <HangupButton onClick={endStream} disabled={ending} label="End stream" />
            ) : (
              <HangupButton onClick={leave} label="Leave" />
            )}
          </div>
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
      </div>
    </div>
  );
}

function Placeholder({ name, caption }: { name: string; caption: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-800 to-zinc-950 text-white">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-3xl font-semibold shadow-lg ring-4 ring-white/10">
        {initials(name)}
      </span>
      <div className="flex flex-col items-center gap-2">
        <span className="text-base font-medium">{name}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <path d="M15 10.5 21 7v10l-6-3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-.3 1M11 18H5a2 2 0 0 1-2-2V8" strokeLinecap="round" />
            <path d="M4 4l16 16" strokeLinecap="round" />
          </svg>
          {caption}
        </span>
      </div>
    </div>
  );
}

/** Mic/camera style: neutral when on, red when off (muted). */
function ControlButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
        active
          ? "bg-white/90 text-zinc-800 hover:bg-white"
          : "bg-red-500 text-white hover:bg-red-600"
      }`}
    >
      {children}
    </button>
  );
}

/** Toggle style (chat / screen share / fullscreen): highlighted when on. */
function ToggleButton({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
        on ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-white/15 text-white hover:bg-white/25"
      }`}
    >
      {children}
    </button>
  );
}

function HangupButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {LEAVE_ICON}
      <span className="hidden sm:inline">{label}</span>
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
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
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
