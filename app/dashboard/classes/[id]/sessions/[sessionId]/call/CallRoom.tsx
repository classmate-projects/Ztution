"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { callChannelName, ICE_SERVERS } from "@/lib/webrtc-config";
import { Button, ErrorBanner } from "@/components/ui";
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

interface Peer {
  id: string;
  name: string;
  role: Role;
  stream: MediaStream | null;
}

type SignalPayload =
  | { type: "offer"; from: string; to: string; data: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; data: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; from: string; to: string; data: RTCIceCandidateInit };

interface PresenceMeta {
  id: string;
  name: string;
  role: Role;
}

export function CallRoom({ classId, classNameLabel, session, currentUser }: Props) {
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected">("connecting");

  const upsertPeer = useCallback((id: string, patch: Partial<Peer>) => {
    setPeers((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? { id, name: "Participant", role: "student" as Role, stream: null };
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

  const sendSignal = useCallback((msg: Omit<SignalPayload, "from">) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: { ...msg, from: currentUser.id },
    });
  }, [currentUser.id]);

  const getOrCreatePeerConnection = useCallback(
    (peerId: string, meta: PresenceMeta, isOfferer: boolean) => {
      let pc = peerConnectionsRef.current.get(peerId);
      if (pc) return pc;

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionsRef.current.set(peerId, pc);
      upsertPeer(peerId, { name: meta.name, role: meta.role, stream: null });

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

  useEffect(() => {
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
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setMicOn(Boolean(stream?.getAudioTracks().length));
      setCameraOn(Boolean(stream?.getVideoTracks().length));

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

      const isTeacher = currentUser.role === "teacher";

      channel.on("broadcast", { event: "signal" }, ({ payload }: { payload: SignalPayload }) => {
        if (payload.to !== currentUser.id) return;
        void handleSignal(payload);
      });

      async function handleSignal(payload: SignalPayload) {
        if (payload.type === "offer") {
          const presenceState = channel.presenceState<PresenceMeta>();
          const senderMeta = presenceState[payload.from]?.[0] ?? {
            id: payload.from,
            name: "Teacher",
            role: "teacher" as Role,
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

      function syncPresence() {
        const state = channel.presenceState<PresenceMeta>();
        for (const key of Object.keys(state)) {
          if (key === currentUser.id) continue;
          const meta = state[key][0];
          if (isTeacher && !peerConnectionsRef.current.has(key)) {
            getOrCreatePeerConnection(key, meta, true);
          }
        }
      }

      channel.on("presence", { event: "sync" }, syncPresence);
      channel.on("presence", { event: "join" }, syncPresence);
      channel.on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        removePeer(key);
      });

      channel.subscribe(async (subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          await channel.track({ id: currentUser.id, name: currentUser.name, role: currentUser.role } satisfies PresenceMeta);
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT" || subStatus === "CLOSED") {
          setConnectionError("Lost connection to the call's signaling channel. Try leaving and rejoining.");
        }
      });
    }

    setup();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnections.forEach((pc) => pc.close());
      peerConnections.clear();
      if (channelRef.current) {
        channelRef.current.untrack();
        createBrowserSupabaseClient().removeChannel(channelRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

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
    setCameraOn(track.enabled);
  }

  function leaveCall() {
    router.push(`/dashboard/classes/${classId}`);
  }

  const peerList = Array.from(peers.values());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{session.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{classNameLabel}</p>
        </div>
        <Button variant="danger" onClick={leaveCall}>
          Leave Call
        </Button>
      </div>

      <ErrorBanner message={connectionError} />

      {mediaError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {mediaError}
        </div>
      )}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {status === "connecting"
          ? peerList.length === 0
            ? "Waiting for others to join…"
            : "Connecting…"
          : `${peerList.length} other participant${peerList.length === 1 ? "" : "s"} in this call`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VideoTile label={`${currentUser.name} (You)`} muted stream={null} videoRef={localVideoRef} />
        {peerList.map((peer) => (
          <VideoTile key={peer.id} label={`${peer.name}${peer.role === "teacher" ? " (Teacher)" : ""}`} stream={peer.stream} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={toggleMic}>
          {micOn ? "Mute Mic" : "Unmute Mic"}
        </Button>
        <Button variant="secondary" onClick={toggleCamera}>
          {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
        </Button>
      </div>
    </div>
  );
}

function VideoTile({
  label,
  stream,
  muted,
  videoRef,
}: {
  label: string;
  stream?: MediaStream | null;
  muted?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? internalRef;

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [ref, stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900">
      <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {label}
      </span>
    </div>
  );
}
