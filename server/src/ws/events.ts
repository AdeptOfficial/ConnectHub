import type { WsSession } from "./sessions";
import { getChannelSessions, getUserSessions } from "./sessions";
import type { GatewayPayload } from "shared";
import { ServerOpcode } from "shared";

export function sendPayload(session: WsSession, op: ServerOpcode, data: unknown) {
  session.sequence++;
  const payload: GatewayPayload = { op, d: data, s: session.sequence };
  session.ws.send(JSON.stringify(payload));
}

export function broadcastToChannel(
  channelId: string,
  op: ServerOpcode,
  data: unknown,
  excludeSessionId?: string
) {
  const sessions = getChannelSessions(channelId);
  for (const session of sessions) {
    if (session.sessionId === excludeSessionId) continue;
    sendPayload(session, op, data);
  }
}

export function sendToUser(userId: string, op: ServerOpcode, data: unknown) {
  const sessions = getUserSessions(userId);
  for (const session of sessions) {
    sendPayload(session, op, data);
  }
}
