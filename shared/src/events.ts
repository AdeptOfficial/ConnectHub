import type { Message, User, SpaceMember, Channel, Space } from "./types";

// Client → Server opcodes
export enum ClientOpcode {
  Identify = 1,
  Heartbeat = 2,
  SendMessage = 3,
  StartTyping = 4,
  UpdatePresence = 5,
  Subscribe = 6,   // subscribe to a channel
  Unsubscribe = 7,
}

// Server → Client opcodes
export enum ServerOpcode {
  Hello = 0,
  Ready = 1,
  HeartbeatAck = 2,
  MessageCreate = 3,
  MessageUpdate = 4,
  MessageDelete = 5,
  TypingStart = 6,
  PresenceUpdate = 7,
  SpaceCreate = 8,
  SpaceUpdate = 9,
  SpaceDelete = 10,
  ChannelCreate = 11,
  ChannelUpdate = 12,
  ChannelDelete = 13,
  MemberAdd = 14,
  MemberRemove = 15,
  InvalidSession = 16,
}

export interface GatewayPayload {
  op: ClientOpcode | ServerOpcode;
  d: unknown;
  s?: number; // sequence number
}

// Server → Client payloads
export interface HelloPayload {
  heartbeatInterval: number;
}

export interface ReadyPayload {
  user: User;
  spaces: Space[];
  sessionId: string;
}

export interface MessageCreatePayload {
  message: Message;
  author: Pick<User, "id" | "username" | "displayName" | "avatarHash">;
}

export interface TypingStartPayload {
  channelId: string;
  userId: string;
  username: string;
  timestamp: number;
}

export interface PresenceUpdatePayload {
  userId: string;
  status: "online" | "idle" | "offline";
}

// Client → Server payloads
export interface IdentifyPayload {
  token: string;
}

export interface SendMessagePayload {
  channelId: string;
  encryptedContent: string;
  leaseEnvelope?: string;
  nonce?: string; // client-side dedup
}

export interface SubscribePayload {
  channelId: string;
}
