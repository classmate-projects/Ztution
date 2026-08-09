// WebRTC ICE configuration.
//
// STUN alone only works when peers can reach each other directly — true on
// localhost and many home networks, but it FAILS across restrictive/symmetric
// NATs (mobile data, corporate wifi), which is why calls that work locally
// break in production. A TURN relay fixes that by forwarding media when a
// direct path can't be established.
//
// TURN requires a server with credentials, so it's supplied via env vars (they
// must be NEXT_PUBLIC_* to reach the browser, and the app must be rebuilt after
// setting them). Providers: Metered (free tier), Cloudflare Realtime TURN,
// Twilio, or a self-hosted coturn.
//
//   NEXT_PUBLIC_TURN_URLS        comma-separated, e.g.
//                                "turn:turn.example.com:3478,turns:turn.example.com:5349"
//   NEXT_PUBLIC_TURN_USERNAME    TURN username
//   NEXT_PUBLIC_TURN_CREDENTIAL  TURN password/credential
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  const urls = process.env.NEXT_PUBLIC_TURN_URLS;
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (urls && username && credential) {
    servers.push({
      urls: urls
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean),
      username,
      credential,
    });
  }

  return servers;
}

export const ICE_SERVERS: RTCIceServer[] = buildIceServers();

export function callChannelName(sessionId: string): string {
  return `call-${sessionId}`;
}
