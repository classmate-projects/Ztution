"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { callChannelName, ICE_SERVERS } from "@/lib/webrtc-config";
import { Button, ErrorBanner } from "@/components/ui";
import {
  CAM_OFF_ICON,
  CAM_ON_ICON,
  CHAT_ICON,
  ControlButton,
  FS_ENTER_ICON,
  FS_EXIT_ICON,
  HangupButton,
  MIC_OFF_ICON,
  MIC_ON_ICON,
  MessagePanel,
  MORE_ICON,
  PEOPLE_ICON,
  PIN_ICON,
  Placeholder,
  SCREEN_SHARE_ICON,
  ToggleButton,
  useAutoHideControls,
  type CallMessage,
} from "@/components/call-ui";
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
  /** Server-checked: true if the teacher removed this student and hasn't re-admitted them (survives leave + rejoin). */
  initiallyRemoved?: boolean;
}

interface Peer {
  id: string;
  name: string;
  role: Role;
  stream: MediaStream | null;
  micOn: boolean;
  videoOn: boolean;
  sharing: boolean;
  // Bumped to force a stuck <video> element to rebind its srcObject (Chrome
  // can leave a stale/green frame when the sender swaps tracks in place).
  repaintNonce: number;
}

interface PresenceMeta {
  id: string;
  name: string;
  role: Role;
  micOn: boolean;
  videoOn: boolean;
  sharing: boolean;
}

type SignalPayload =
  | { type: "offer"; from: string; to: string; data: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; data: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; from: string; to: string; data: RTCIceCandidateInit };

// Teacher moderation. Broadcast on the same call channel and trusted at face
// value client-side — same trust model as the rest of this WebRTC signaling
// (there's no server-side authorization layer), so the UI to trigger these
// is only ever shown to the teacher's own client.
type ModerationPayload =
  | { type: "removed"; studentId: string }
  | { type: "toggle-mic"; to: string }
  | { type: "join-request"; from: string; name: string }
  | { type: "admitted"; to: string }
  | { type: "declined"; to: string };

interface JoinRequest {
  id: string;
  name: string;
}

const SMALL_MIC_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 shrink-0 text-red-400">
    <path d="M9 9V6a3 3 0 0 1 5.5-1.7M15 11.5V11" strokeLinecap="round" />
    <path d="M5 11a7 7 0 0 0 10.6 6M19 11a7 7 0 0 1-1 3.6M12 18v3" strokeLinecap="round" />
    <path d="M4 4l16 16" strokeLinecap="round" />
  </svg>
);

export function CallRoom({ classId, session, currentUser, initiallyRemoved }: Props) {
  const router = useRouter();
  const isTeacher = currentUser.role === "teacher";

  const stageRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Tracks whichever <video> element is currently rendering the pinned/main
  // tile, so fullscreen toggles can repaint it directly (see effect below).
  const mainVideoElRef = useRef<HTMLVideoElement | null>(null);
  // Teacher-only: mirrors `removedIds` state for the long-lived syncPresence
  // closure below (which only runs once at effect-mount, so it can't see
  // fresh state directly). Lets a blocked student's presence updates keep
  // surfacing as a join request instead of silently reconnecting.
  const removedIdsRef = useRef<Set<string>>(new Set());
  // Exposes the in-effect syncPresence so admitStudent() can force an
  // immediate re-check after clearing someone from removedIds.
  const syncPresenceRef = useRef<(() => void) | null>(null);
  // Kicked students don't track presence on the main channel (see the
  // waiting-room effect below); this is the separate subscription they use
  // to ask for — and hear back about — re-admission.
  const waitingChannelRef = useRef<RealtimeChannel | null>(null);

  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [localDisplayStream, setLocalDisplayStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected">("connecting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualPin, setManualPin] = useState<string | null>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Teacher-only moderation state.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // This-student-only: set when the teacher removes *me*. Starts from the
  // server-checked prop so leaving and rejoining the session doesn't bypass
  // a removal that's still in effect.
  const [kickedOut, setKickedOut] = useState(initiallyRemoved ?? false);
  const [rejoinState, setRejoinState] = useState<"idle" | "pending" | "declined">("idle");

  useEffect(() => {
    removedIdsRef.current = removedIds;
  }, [removedIds]);

  const controlsActive = useAutoHideControls(stageRef);
  const controlsVisible = controlsActive || commentsOpen;

  const upsertPeer = useCallback((id: string, patch: Partial<Peer>) => {
    setPeers((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {
        id,
        name: "Participant",
        role: "student" as Role,
        stream: null,
        micOn: true,
        videoOn: true,
        sharing: false,
        repaintNonce: 0,
      };
      next.set(id, { ...existing, ...patch });
      return next;
    });
  }, []);

  const removePeer = useCallback((id: string) => {
    peerConnectionsRef.current.get(id)?.close();
    peerConnectionsRef.current.delete(id);
    setPeers((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  function bumpPeerRepaint(id: string) {
    setPeers((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, repaintNonce: existing.repaintNonce + 1 });
      return next;
    });
  }

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

  const presencePayload = useCallback(
    (): PresenceMeta => ({
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      micOn,
      videoOn: camOn || sharingScreen,
      sharing: sharingScreen,
    }),
    [currentUser.id, currentUser.name, currentUser.role, micOn, camOn, sharingScreen]
  );

  const getOrCreatePeerConnection = useCallback(
    (peerId: string, meta: PresenceMeta, isOfferer: boolean) => {
      let pc = peerConnectionsRef.current.get(peerId);
      if (pc) return pc;

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionsRef.current.set(peerId, pc);
      upsertPeer(peerId, {
        name: meta.name,
        role: meta.role,
        stream: null,
        micOn: meta.micOn ?? true,
        videoOn: meta.videoOn ?? true,
        sharing: meta.sharing ?? false,
      });

      localStreamRef.current?.getTracks().forEach((track) => {
        pc!.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ type: "ice-candidate", to: peerId, data: event.candidate.toJSON() });
        }
      };
      pc.ontrack = (event) => {
        upsertPeer(peerId, { stream: event.streams[0] });
        setStatus("connected");
      };

      if (isOfferer) {
        pc.onnegotiationneeded = async () => {
          const offer = await pc!.createOffer();
          await pc!.setLocalDescription(offer);
          sendSignal({ type: "offer", to: peerId, data: offer });
        };
      }

      return pc;
    },
    [sendSignal, upsertPeer]
  );

  // Media capture + signaling. Runs once for the lifetime of the call — every
  // participant publishes to every other participant (full mesh). To avoid
  // both sides racing to offer each other, the participant with the
  // lexicographically smaller id is the deterministic offerer for a pair.
  useEffect(() => {
    if (kickedOut) return;
    let cancelled = false;
    const peerConnections = peerConnectionsRef.current;

    async function setup() {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setMediaError("Camera unavailable — joining with audio only.");
        } catch {
          setMediaError("Camera and microphone unavailable — you can still see other participants.");
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalDisplayStream(stream);
      setMicOn(Boolean(stream?.getAudioTracks().length));
      setCamOn(Boolean(stream?.getVideoTracks().length));

      let supabase: ReturnType<typeof createBrowserSupabaseClient>;
      try {
        supabase = createBrowserSupabaseClient();
      } catch (err) {
        setConnectionError(err instanceof Error ? err.message : "Failed to connect to signaling server");
        return;
      }
      const channel = supabase.channel(callChannelName(session.id), {
        config: { presence: { key: currentUser.id } },
      });
      channelRef.current = channel;

      channel.on("broadcast", { event: "signal" }, ({ payload }: { payload: SignalPayload }) => {
        if (payload.to !== currentUser.id) return;
        void handleSignal(payload);
      });

      async function handleSignal(payload: SignalPayload) {
        if (payload.type === "offer") {
          const presenceState = channel.presenceState<PresenceMeta>();
          const senderMeta = presenceState[payload.from]?.[0] ?? {
            id: payload.from,
            name: "Participant",
            role: "student" as Role,
            micOn: true,
            videoOn: true,
            sharing: false,
          };
          const pc = getOrCreatePeerConnection(payload.from, senderMeta, false);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: "answer", to: payload.from, data: answer });
        } else if (payload.type === "answer") {
          const pc = peerConnectionsRef.current.get(payload.from);
          await pc?.setRemoteDescription(new RTCSessionDescription(payload.data));
        } else if (payload.type === "ice-candidate") {
          const pc = peerConnectionsRef.current.get(payload.from);
          try {
            await pc?.addIceCandidate(new RTCIceCandidate(payload.data));
          } catch {
            // Candidate arriving before remote description is set is harmless; ignore.
          }
        }
      }

      channel.on("broadcast", { event: "chat" }, ({ payload }: { payload: CallMessage }) => {
        setMessages((prev) => [...prev, payload]);
      });

      // A peer swapped their outgoing video (camera ↔ screen share) without
      // renegotiating — same receiver track, new content. Force a repaint so
      // Chrome doesn't leave a stale frame on screen.
      channel.on("broadcast", { event: "source-changed" }, ({ payload }: { payload: { from: string } }) => {
        if (payload.from === currentUser.id) return;
        bumpPeerRepaint(payload.from);
      });

      function syncPresence() {
        const state = channel.presenceState<PresenceMeta>();
        for (const key of Object.keys(state)) {
          if (key === currentUser.id) continue;
          const meta = state[key][0];
          if (!meta) continue;
          // A student we removed is still (or newly) tracking presence —
          // e.g. they reloaded instead of using "Request to rejoin". Don't
          // connect to them; just keep surfacing the rejoin request.
          if (isTeacher && removedIdsRef.current.has(key)) {
            setJoinRequests((prev) => (prev.some((r) => r.id === key) ? prev : [...prev, { id: key, name: meta.name }]));
            continue;
          }
          upsertPeer(key, {
            name: meta.name,
            role: meta.role,
            micOn: meta.micOn ?? true,
            videoOn: meta.videoOn ?? true,
            sharing: meta.sharing ?? false,
          });
          if (!peerConnectionsRef.current.has(key) && currentUser.id < key) {
            getOrCreatePeerConnection(key, meta, true);
          }
        }
      }
      syncPresenceRef.current = syncPresence;

      function pushSystemMessage(text: string) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), senderId: "system", senderName: "", senderRole: "student", text, at: Date.now(), system: true },
        ]);
      }

      // Teacher moderation — mute/remove a student, and the rejoin
      // request/response handshake for a previously removed one.
      channel.on("broadcast", { event: "moderation" }, ({ payload }: { payload: ModerationPayload }) => {
        if (payload.type === "removed") {
          if (payload.studentId === currentUser.id) {
            setKickedOut(true);
          } else {
            removePeer(payload.studentId);
          }
        } else if (payload.type === "toggle-mic") {
          if (payload.to === currentUser.id) toggleMic();
        } else if (payload.type === "join-request") {
          if (isTeacher) {
            setJoinRequests((prev) =>
              prev.some((r) => r.id === payload.from) ? prev : [...prev, { id: payload.from, name: payload.name }]
            );
          }
        } else if (payload.type === "admitted") {
          if (payload.to === currentUser.id) {
            setKickedOut(false);
            setRejoinState("idle");
          }
        } else if (payload.type === "declined") {
          if (payload.to === currentUser.id) {
            setRejoinState("declined");
          }
        }
      });

      channel.on("presence", { event: "sync" }, syncPresence);
      channel.on(
        "presence",
        { event: "join" },
        ({ key, newPresences }: { key: string; newPresences: PresenceMeta[] }) => {
          if (key !== currentUser.id) {
            pushSystemMessage(`${newPresences[0]?.name ?? "Someone"} joined`);
          }
          syncPresence();
        }
      );
      channel.on(
        "presence",
        { event: "leave" },
        ({ key, leftPresences }: { key: string; leftPresences: PresenceMeta[] }) => {
          if (key !== currentUser.id) {
            pushSystemMessage(`${leftPresences[0]?.name ?? "Someone"} left`);
          }
          removePeer(key);
        }
      );

      channel.subscribe(async (subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          setConnectionError(null);
          await channel.track(presencePayload());
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT" || subStatus === "CLOSED") {
          setConnectionError("Lost connection to the call's signaling channel. Try leaving and rejoining.");
        }
      });
    }

    setup();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnections.forEach((pc) => pc.close());
      peerConnections.clear();
      if (channelRef.current) {
        channelRef.current.untrack();
        createBrowserSupabaseClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
      syncPresenceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, kickedOut]);

  // Waiting room: active only while removed from the call. Subscribes to the
  // same channel name (so it can talk to the teacher's still-live main
  // subscription) but never tracks presence — a removed student stays
  // invisible to everyone until the teacher explicitly admits them.
  useEffect(() => {
    if (!kickedOut) return;
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(callChannelName(session.id));
    waitingChannelRef.current = channel;

    channel.on("broadcast", { event: "moderation" }, ({ payload }: { payload: ModerationPayload }) => {
      if (payload.type === "admitted" && payload.to === currentUser.id) {
        setKickedOut(false);
        setRejoinState("idle");
      } else if (payload.type === "declined" && payload.to === currentUser.id) {
        setRejoinState("declined");
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      waitingChannelRef.current = null;
    };
  }, [kickedOut, session.id, currentUser.id]);

  // Re-advertise mic/camera/sharing state whenever it changes so peers can
  // update their mute badge / camera-off placeholder / "Presenting" tag.
  useEffect(() => {
    void channelRef.current?.track(presencePayload());
  }, [presencePayload]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Entering/leaving fullscreen relayouts the pinned tile's <video> without
  // changing its srcObject — repaint to clear any leftover stale frame.
  useEffect(() => {
    const video = mainVideoElRef.current;
    if (!video || !video.srcObject) return;
    const stream = video.srcObject;
    video.srcObject = null;
    requestAnimationFrame(() => {
      video.srcObject = stream;
      void video.play?.().catch(() => {});
    });
  }, [isFullscreen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, commentsOpen]);

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

  // Swap the outgoing video track on every mesh connection without a full
  // renegotiation. Every participant already publishes a video sender from
  // setup (even a disabled one), so this covers the normal case; a peer who
  // joined with no camera at all is left as-is rather than force a fragile
  // manual renegotiation.
  async function replaceOutgoingVideo(track: MediaStreamTrack | null, owner: MediaStream | null) {
    for (const pc of peerConnectionsRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(track);
      } else if (track && owner) {
        pc.addTrack(track, owner);
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
      setLocalDisplayStream(display);
      channelRef.current?.send({ type: "broadcast", event: "source-changed", payload: { from: currentUser.id } });
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
    setLocalDisplayStream(localStreamRef.current);
    channelRef.current?.send({ type: "broadcast", event: "source-changed", payload: { from: currentUser.id } });
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

  function sendComment(event: FormEvent) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const msg: CallMessage = {
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

  function leaveCall() {
    router.push(`/dashboard/classes/${classId}`);
  }

  // ---- Teacher moderation ------------------------------------------------

  // Persists the remove/admit decision so it survives the student leaving
  // and reloading (the broadcasts below only cover clients still connected
  // right now). Best-effort: surfaces a banner on failure but doesn't block
  // the immediate in-call effect, which has already happened locally.
  async function persistModeration(action: "remove" | "admit", studentId: string) {
    try {
      const res = await fetch(`/api/classes/${classId}/sessions/${session.id}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, studentId }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      setConnectionError(
        action === "remove"
          ? "Removed them from this call, but couldn't save it — they may be able to rejoin if they reload."
          : "Let them back in, but couldn't save it — try again if they get blocked."
      );
    }
  }

  function toggleStudentMic(studentId: string) {
    channelRef.current?.send({
      type: "broadcast",
      event: "moderation",
      payload: { type: "toggle-mic", to: studentId } satisfies ModerationPayload,
    });
    setOpenMenuId(null);
  }

  function removeStudent(studentId: string) {
    setRemovedIds((prev) => new Set(prev).add(studentId));
    removePeer(studentId);
    channelRef.current?.send({
      type: "broadcast",
      event: "moderation",
      payload: { type: "removed", studentId } satisfies ModerationPayload,
    });
    setOpenMenuId(null);
    void persistModeration("remove", studentId);
  }

  function admitStudent(studentId: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
    setJoinRequests((prev) => prev.filter((r) => r.id !== studentId));
    channelRef.current?.send({
      type: "broadcast",
      event: "moderation",
      payload: { type: "admitted", to: studentId } satisfies ModerationPayload,
    });
    syncPresenceRef.current?.();
    void persistModeration("admit", studentId);
  }

  function declineStudent(studentId: string) {
    setJoinRequests((prev) => prev.filter((r) => r.id !== studentId));
    channelRef.current?.send({
      type: "broadcast",
      event: "moderation",
      payload: { type: "declined", to: studentId } satisfies ModerationPayload,
    });
  }

  // ---- This-student-only: requesting re-admission after being removed ----
  function requestRejoin() {
    setRejoinState("pending");
    waitingChannelRef.current?.send({
      type: "broadcast",
      event: "moderation",
      payload: { type: "join-request", from: currentUser.id, name: currentUser.name } satisfies ModerationPayload,
    });
  }

  // ---- Tiles + pin selection -------------------------------------------
  interface TileData {
    id: string;
    name: string;
    role: Role;
    stream: MediaStream | null;
    micOn: boolean;
    videoOn: boolean;
    sharing: boolean;
    repaintNonce: number;
    isLocal: boolean;
  }

  const peerList = Array.from(peers.values());
  const localTile: TileData = {
    id: "local",
    name: currentUser.name,
    role: currentUser.role,
    stream: localDisplayStream,
    micOn,
    videoOn: camOn || sharingScreen,
    sharing: sharingScreen,
    repaintNonce: 0,
    isLocal: true,
  };
  const allTiles: TileData[] = [
    localTile,
    ...peerList.map((p) => ({ ...p, isLocal: false })),
  ];

  const defaultPinId = isTeacher
    ? "local"
    : peerList.find((p) => p.role === "teacher")?.id ?? peerList[0]?.id ?? "local";
  const pinnedId = manualPin && allTiles.some((t) => t.id === manualPin) ? manualPin : defaultPinId;
  const mainTile = allTiles.find((t) => t.id === pinnedId) ?? localTile;
  const sidebarTiles = allTiles.filter((t) => t.id !== pinnedId);

  if (kickedOut) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center text-white">
        <p className="text-lg font-semibold">You were removed from this call</p>
        {rejoinState === "idle" && (
          <>
            <p className="max-w-sm text-sm text-white/60">
              You can ask the teacher to let you back in.
            </p>
            <Button onClick={requestRejoin}>Request to rejoin</Button>
          </>
        )}
        {rejoinState === "pending" && (
          <p className="text-sm text-white/70">Waiting for the teacher to accept your request…</p>
        )}
        {rejoinState === "declined" && (
          <>
            <p className="text-sm text-white/70">Your request was declined.</p>
            <Button onClick={requestRejoin}>Try again</Button>
          </>
        )}
        <Button variant="ghost" onClick={leaveCall}>
          Leave
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      onClick={() => openMenuId && setOpenMenuId(null)}
      className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950"
    >
      {!isFullscreen && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-3 bg-gradient-to-b from-black/60 to-transparent p-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-white">{session.title}</h1>
            <span className="pointer-events-auto mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
              {status === "connecting" && peerList.length === 0 ? (
                "Waiting for others…"
              ) : (
                <>
                  {PEOPLE_ICON}
                  {peerList.length + 1}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {(connectionError || mediaError) && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-col items-center gap-2 px-4">
          {connectionError && (
            <div className="pointer-events-auto w-full max-w-md">
              <ErrorBanner message={connectionError} />
            </div>
          )}
          {mediaError && (
            <div className="pointer-events-auto w-full max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              {mediaError}
            </div>
          )}
        </div>
      )}

      {isTeacher && joinRequests.length > 0 && (
        <div className="absolute bottom-24 left-4 z-30 flex flex-col gap-2">
          {joinRequests.map((r) => (
            <div
              key={r.id}
              onClick={(e) => e.stopPropagation()}
              className="w-64 rounded-xl bg-zinc-900/95 p-3 text-sm text-white shadow-2xl ring-1 ring-white/10"
            >
              <p className="mb-2.5">{r.name} was removed and wants to rejoin</p>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => admitStudent(r.id)}>
                  Accept
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => declineStudent(r.id)}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex h-full flex-col gap-3 p-3 lg:flex-row">
        <div className="relative min-h-0 flex-1">
          <VideoTile
            size="main"
            stream={mainTile.stream}
            muted={mainTile.isLocal}
            mirror={mainTile.isLocal && !sharingScreen}
            fit={mainTile.sharing ? "contain" : "cover"}
            name={mainTile.isLocal ? `${mainTile.name} (You)` : mainTile.name}
            roleLabel={mainTile.role === "teacher" ? "Teacher" : undefined}
            micOn={mainTile.micOn}
            videoOn={mainTile.videoOn}
            sharing={mainTile.sharing}
            repaintNonce={mainTile.repaintNonce}
            onVideoElement={(el) => {
              mainVideoElRef.current = el;
            }}
          />
          {manualPin && (
            <button
              type="button"
              onClick={() => setManualPin(null)}
              title="Unpin"
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/75"
            >
              {PIN_ICON} Unpin
            </button>
          )}
        </div>

        {sidebarTiles.length > 0 && !isFullscreen && (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:w-52 lg:flex-none lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
            {sidebarTiles.map((t) => (
              <VideoTile
                key={t.id}
                size="thumb"
                stream={t.stream}
                muted={t.isLocal}
                mirror={t.isLocal && !sharingScreen}
                name={t.isLocal ? `${t.name} (You)` : t.name}
                roleLabel={t.role === "teacher" ? "Teacher" : undefined}
                micOn={t.micOn}
                videoOn={t.videoOn}
                sharing={t.sharing}
                repaintNonce={t.repaintNonce}
                onClick={() => setManualPin(t.id)}
                menu={
                  isTeacher && !t.isLocal ? (
                    <TileMenu
                      open={openMenuId === t.id}
                      onToggle={() => setOpenMenuId((id) => (id === t.id ? null : t.id))}
                      micOn={t.micOn}
                      onToggleMic={() => toggleStudentMic(t.id)}
                      onRemove={() => removeStudent(t.id)}
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls overlay — floats over the video, inside the stage, so it
          shows in fullscreen and never shrinks the tile area. Fades out after
          a few seconds of no mouse/keyboard activity, like a normal call app. */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-4 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`flex items-center gap-2.5 rounded-full bg-black/50 px-4 py-3 backdrop-blur-sm ${
            controlsVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <ControlButton active={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"}>
            {micOn ? MIC_ON_ICON : MIC_OFF_ICON}
          </ControlButton>
          <ControlButton active={camOn} onClick={toggleCamera} label={camOn ? "Stop camera" : "Start camera"}>
            {camOn ? CAM_ON_ICON : CAM_OFF_ICON}
          </ControlButton>
          {isTeacher && (
            <ToggleButton
              on={sharingScreen}
              onClick={toggleScreenShare}
              label={sharingScreen ? "Stop sharing" : "Share screen"}
            >
              {SCREEN_SHARE_ICON}
            </ToggleButton>
          )}
          <ToggleButton on={commentsOpen} onClick={() => setCommentsOpen((v) => !v)} label="Toggle comments">
            {CHAT_ICON}
          </ToggleButton>
          <ToggleButton on={isFullscreen} onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? FS_EXIT_ICON : FS_ENTER_ICON}
          </ToggleButton>
          <HangupButton onClick={leaveCall} label="Leave" />
        </div>
      </div>

      {commentsOpen && (
          <MessagePanel
            title="Comments"
            placeholder="Add a comment for everyone"
            messages={messages}
            currentUserId={currentUser.id}
            value={chatInput}
            onChange={setChatInput}
            onSubmit={sendComment}
            onClose={() => setCommentsOpen(false)}
            endRef={messagesEndRef}
          />
        )}
      </div>
  );
}

function VideoTile({
  size,
  stream,
  muted,
  mirror,
  fit = "cover",
  name,
  roleLabel,
  micOn,
  videoOn,
  sharing,
  repaintNonce,
  onClick,
  onVideoElement,
  menu,
}: {
  size: "main" | "thumb";
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  fit?: "cover" | "contain";
  name: string;
  roleLabel?: string;
  micOn: boolean;
  videoOn: boolean;
  sharing?: boolean;
  repaintNonce?: number;
  onClick?: () => void;
  onVideoElement?: (el: HTMLVideoElement | null) => void;
  /** Teacher-only moderation menu, rendered top-right and revealed on hover. */
  menu?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = null;
    const raf = requestAnimationFrame(() => {
      video.srcObject = stream;
      void video.play?.().catch(() => {});
    });
    return () => cancelAnimationFrame(raf);
  }, [stream, repaintNonce]);

  const showVideo = videoOn && Boolean(stream);
  const label = `${name}${roleLabel ? ` · ${roleLabel}` : ""}`;

  const content = (
    <>
      {showVideo ? (
        <video
          ref={(el) => {
            videoRef.current = el;
            onVideoElement?.(el);
          }}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
          style={mirror ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <Placeholder name={name} compact={size === "thumb"} />
      )}
      {sharing && (
        <span className="absolute left-1.5 top-1.5 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Presenting
        </span>
      )}
      <span className="absolute bottom-1.5 left-1.5 inline-flex max-w-[calc(100%-0.75rem)] items-center gap-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
        {!micOn && SMALL_MIC_OFF_ICON}
        <span className="truncate">{label}</span>
      </span>
    </>
  );

  // A plain clickable <div> (not <button>) so a real <button> — the
  // moderation menu's kebab trigger — can be nested inside without invalid
  // HTML / click-target conflicts; keyboard activation is wired manually.
  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `Pin ${name}` : undefined}
      className={`group relative shrink-0 overflow-hidden bg-zinc-900 ring-2 ring-transparent transition-shadow ${
        size === "thumb" ? "aspect-video w-32 rounded-lg lg:w-full" : "h-full w-full rounded-xl"
      } ${onClick ? "cursor-pointer hover:ring-white/40" : ""}`}
    >
      {content}
      {menu}
    </div>
  );
}

/** Teacher-only 3-dot menu on a student's sidebar tile: mute toggle + remove. */
function TileMenu({
  open,
  onToggle,
  micOn,
  onToggleMic,
  onRemove,
}: {
  open: boolean;
  onToggle: () => void;
  micOn: boolean;
  onToggleMic: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute right-1.5 top-1.5 z-20 transition-opacity ${
        open ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        title="More options"
        aria-label="More options"
        className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        {MORE_ICON}
      </button>
      {open && (
        <div className="absolute right-0 top-7 w-40 overflow-hidden rounded-lg bg-zinc-900 py-1 text-sm text-white shadow-2xl ring-1 ring-white/10">
          <button
            type="button"
            onClick={onToggleMic}
            className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-white/10"
          >
            {micOn ? "Mute mic" : "Unmute mic"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="block w-full cursor-pointer px-3 py-1.5 text-left text-red-400 hover:bg-white/10"
          >
            Remove from class
          </button>
        </div>
      )}
    </div>
  );
}
