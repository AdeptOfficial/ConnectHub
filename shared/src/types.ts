export interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
  identityKey: string;
  createdAt: number;
  flags: number;
}

export interface Space {
  id: string;
  ownerId: string;
  encryptedConfig: string; // base64
  historyVisibility: string;
  leaseTtl: string;
  createdAt: number;
}

export interface Channel {
  id: string;
  spaceId: string;
  type: ChannelType;
  encryptedName: string | null; // base64
  position: number;
  createdAt: number;
}

export enum ChannelType {
  Text = 0,
  Voice = 1,
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  encryptedContent: string; // base64
  leaseEnvelope: string | null;
  type: MessageType;
  flags: number;
  createdAt: number;
  editedAt: number | null;
}

export enum MessageType {
  Default = 0,
  System = 1,
}

export interface SpaceMember {
  spaceId: string;
  userId: string;
  role: Role;
  joinedAt: number;
}

export interface Invite {
  code: string;
  spaceId: string;
  creatorId: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: number | null;
  createdAt: number;
}

export interface DmChannel {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: number;
}

export interface ReadState {
  userId: string;
  channelId: string;
  lastMessageId: string | null;
  mentionCount: number;
}

export enum Role {
  Member = 0,
  Admin = 1,
  Owner = 2,
}
