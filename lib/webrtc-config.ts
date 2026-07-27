// Public STUN only — no TURN relay. Works for most home/office networks;
// peers behind restrictive/symmetric NATs (e.g. some corporate networks) may
// fail to connect without a TURN server, which would need a paid provider.
export const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function callChannelName(sessionId: string): string {
  return `call-${sessionId}`;
}
