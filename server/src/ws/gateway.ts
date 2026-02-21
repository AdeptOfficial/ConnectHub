import type { ServerWebSocket } from "bun";
import { getDb } from "../db/database";
import { hashToken } from "../lib/crypto";
import { generateId } from "../lib/snowflake";
import {
  addSession,
  removeSession,
  getSession,
  subscribeToChannel,
  unsubscribeFromChannel,
  type WsData,
  type WsSession,
} from "./sessions";
import { sendPayload, broadcastToChannel } from "./events";
import {
  ClientOpcode,
  ServerOpcode,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
} from "shared";
import type {
  IdentifyPayload,
  SendMessagePayload,
  SubscribePayload,
  GatewayPayload,
} from "shared";

// Heartbeat checker — runs every 15s
setInterval(() => {
  const now = Date.now();
  // We iterate all sessions through the session store
  // For simplicity, we check from the gateway perspective
}, 15_000);

export function handleOpen(ws: ServerWebSocket<WsData>) {
  const tempId = generateId();
  ws.data = { sessionId: tempId };

  // Send HELLO
  const payload: GatewayPayload = {
    op: ServerOpcode.Hello,
    d: { heartbeatInterval: HEARTBEAT_INTERVAL },
  };
  ws.send(JSON.stringify(payload));
}

export async function handleMessage(
  ws: ServerWebSocket<WsData>,
  raw: string | Buffer
) {
  let payload: GatewayPayload;
  try {
    payload = JSON.parse(typeof raw === "string" ? raw : raw.toString());
  } catch {
    ws.close(4001, "Invalid JSON");
    return;
  }

  console.log(`[WS] Received op=${payload.op} from session=${ws.data.sessionId}`);

  switch (payload.op) {
    case ClientOpcode.Identify:
      await handleIdentify(ws, payload.d as IdentifyPayload);
      break;
    case ClientOpcode.Heartbeat:
      handleHeartbeat(ws);
      break;
    case ClientOpcode.SendMessage:
      console.log(`[WS] SendMessage:`, JSON.stringify(payload.d));
      await handleSendMessage(ws, payload.d as SendMessagePayload);
      break;
    case ClientOpcode.StartTyping:
      handleTyping(ws, payload.d as { channelId: string });
      break;
    case ClientOpcode.Subscribe:
      handleSubscribe(ws, payload.d as SubscribePayload);
      break;
    case ClientOpcode.Unsubscribe:
      handleUnsubscribe(ws, payload.d as SubscribePayload);
      break;
  }
}

export function handleClose(ws: ServerWebSocket<WsData>) {
  removeSession(ws.data.sessionId);
}

async function handleIdentify(
  ws: ServerWebSocket<WsData>,
  data: IdentifyPayload
) {
  if (!data.token) {
    ws.close(4002, "No token provided");
    return;
  }

  const tokenHash = await hashToken(data.token);
  const db = getDb();

  const sessionRow = db
    .query(
      `SELECT s.id, s.user_id, u.username, u.display_name, u.avatar_hash, u.identity_key, u.flags
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as any;

  if (!sessionRow) {
    sendPayload(
      { ws, sequence: 0 } as any,
      ServerOpcode.InvalidSession,
      { message: "Invalid token" }
    );
    ws.close(4003, "Invalid token");
    return;
  }

  const session: WsSession = {
    ws,
    user: {
      id: sessionRow.user_id,
      username: sessionRow.username,
      displayName: sessionRow.display_name,
      avatarHash: sessionRow.avatar_hash,
      identityKey: sessionRow.identity_key,
      flags: sessionRow.flags,
    },
    sessionId: ws.data.sessionId,
    subscribedChannels: new Set(),
    lastHeartbeat: Date.now(),
    sequence: 0,
  };

  addSession(session);

  // Fetch user's spaces
  const spaces = db
    .query(
      `SELECT s.* FROM spaces s
       JOIN space_members sm ON s.id = sm.space_id
       WHERE sm.user_id = ?`
    )
    .all(session.user.id) as any[];

  sendPayload(session, ServerOpcode.Ready, {
    user: {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      avatarHash: session.user.avatarHash,
      identityKey: session.user.identityKey,
      createdAt: 0,
      flags: session.user.flags,
    },
    spaces: spaces.map((s: any) => ({
      id: s.id,
      ownerId: s.owner_id,
      encryptedConfig: s.encrypted_config,
      historyVisibility: s.history_visibility,
      leaseTtl: s.lease_ttl,
      createdAt: s.created_at,
    })),
    sessionId: session.sessionId,
  });
}

function handleHeartbeat(ws: ServerWebSocket<WsData>) {
  const session = getSession(ws.data.sessionId);
  if (!session) return;
  session.lastHeartbeat = Date.now();
  sendPayload(session, ServerOpcode.HeartbeatAck, null);
}

async function handleSendMessage(
  ws: ServerWebSocket<WsData>,
  data: SendMessagePayload
) {
  const session = getSession(ws.data.sessionId);
  if (!session) return;

  const db = getDb();

  // Verify channel access
  const channel = db
    .query("SELECT space_id FROM channels WHERE id = ?")
    .get(data.channelId) as any;
  if (!channel) return;

  const member = db
    .query("SELECT 1 FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(channel.space_id, session.user.id);
  if (!member) return;

  const messageId = generateId();
  const now = Date.now();

  db.query(
    `INSERT INTO messages (id, channel_id, author_id, encrypted_content, lease_envelope, type, flags, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?)`
  ).run(
    messageId,
    data.channelId,
    session.user.id,
    data.encryptedContent,
    data.leaseEnvelope || null,
    now
  );

  const messagePayload = {
    message: {
      id: messageId,
      channelId: data.channelId,
      authorId: session.user.id,
      encryptedContent: data.encryptedContent,
      leaseEnvelope: data.leaseEnvelope || null,
      type: 0,
      flags: 0,
      createdAt: now,
      editedAt: null,
    },
    author: {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      avatarHash: session.user.avatarHash,
    },
  };

  // Fan out to all subscribers of this channel (excluding the author)
  broadcastToChannel(data.channelId, ServerOpcode.MessageCreate, messagePayload, session.sessionId);

  // Always send back to the author so they see their own message
  sendPayload(session, ServerOpcode.MessageCreate, messagePayload);
}

function handleTyping(
  ws: ServerWebSocket<WsData>,
  data: { channelId: string }
) {
  const session = getSession(ws.data.sessionId);
  if (!session) return;

  broadcastToChannel(
    data.channelId,
    ServerOpcode.TypingStart,
    {
      channelId: data.channelId,
      userId: session.user.id,
      username: session.user.username,
      timestamp: Date.now(),
    },
    session.sessionId // exclude sender
  );
}

function handleSubscribe(
  ws: ServerWebSocket<WsData>,
  data: SubscribePayload
) {
  subscribeToChannel(ws.data.sessionId, data.channelId);
}

function handleUnsubscribe(
  ws: ServerWebSocket<WsData>,
  data: SubscribePayload
) {
  unsubscribeFromChannel(ws.data.sessionId, data.channelId);
}
