import type { ServerWebSocket } from "bun";
import type { AuthUser } from "../middleware/auth";

export interface WsSession {
  ws: ServerWebSocket<WsData>;
  user: AuthUser;
  sessionId: string;
  subscribedChannels: Set<string>;
  lastHeartbeat: number;
  sequence: number;
}

export interface WsData {
  sessionId: string;
}

// userId -> WsSession[]  (user can have multiple connections)
const sessions = new Map<string, WsSession[]>();

// sessionId -> WsSession
const sessionById = new Map<string, WsSession>();

// channelId -> Set<sessionId>
const channelSubscribers = new Map<string, Set<string>>();

export function addSession(session: WsSession) {
  sessionById.set(session.sessionId, session);

  const userSessions = sessions.get(session.user.id) || [];
  userSessions.push(session);
  sessions.set(session.user.id, userSessions);
}

export function removeSession(sessionId: string) {
  const session = sessionById.get(sessionId);
  if (!session) return;

  sessionById.delete(sessionId);

  // Remove from user sessions
  const userSessions = sessions.get(session.user.id);
  if (userSessions) {
    const idx = userSessions.findIndex((s) => s.sessionId === sessionId);
    if (idx !== -1) userSessions.splice(idx, 1);
    if (userSessions.length === 0) sessions.delete(session.user.id);
  }

  // Unsubscribe from all channels
  for (const channelId of session.subscribedChannels) {
    const subs = channelSubscribers.get(channelId);
    if (subs) {
      subs.delete(sessionId);
      if (subs.size === 0) channelSubscribers.delete(channelId);
    }
  }
}

export function getSession(sessionId: string): WsSession | undefined {
  return sessionById.get(sessionId);
}

export function getUserSessions(userId: string): WsSession[] {
  return sessions.get(userId) || [];
}

export function subscribeToChannel(sessionId: string, channelId: string) {
  const session = sessionById.get(sessionId);
  if (!session) return;

  session.subscribedChannels.add(channelId);

  let subs = channelSubscribers.get(channelId);
  if (!subs) {
    subs = new Set();
    channelSubscribers.set(channelId, subs);
  }
  subs.add(sessionId);
}

export function unsubscribeFromChannel(sessionId: string, channelId: string) {
  const session = sessionById.get(sessionId);
  if (!session) return;

  session.subscribedChannels.delete(channelId);

  const subs = channelSubscribers.get(channelId);
  if (subs) {
    subs.delete(sessionId);
    if (subs.size === 0) channelSubscribers.delete(channelId);
  }
}

export function getChannelSessions(channelId: string): WsSession[] {
  const subs = channelSubscribers.get(channelId);
  if (!subs) return [];

  const result: WsSession[] = [];
  for (const sessionId of subs) {
    const session = sessionById.get(sessionId);
    if (session) result.push(session);
  }
  return result;
}

export function getAllSessionCount(): number {
  return sessionById.size;
}
