/** Sincroniza login/logout entre pestañas del mismo origen. */

export type SessionBroadcast =
  | { type: "customer:login" }
  | { type: "customer:logout" }
  | { type: "customer:refresh" }
  | { type: "admin:login" }
  | { type: "admin:logout" }
  | { type: "admin:refresh" };

const CHANNEL = "mrpaps-session";

export function broadcastSession(event: SessionBroadcast): void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(event);
    ch.close();
  } catch {
    /* ignore — canal no disponible */
  }
}

export function subscribeSession(handler: (event: SessionBroadcast) => void): () => void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return () => {};
  }
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = (msg: MessageEvent<SessionBroadcast>) => handler(msg.data);
  return () => ch.close();
}
