export const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
export const HEARTBEAT_TIMEOUT = 45_000;  // 45 seconds before disconnect
export const MAX_MESSAGE_SIZE = 16_384;   // 16 KB encrypted content
export const MAX_MESSAGES_PER_FETCH = 100;
export const DEFAULT_MESSAGES_PER_FETCH = 50;
export const INVITE_CODE_LENGTH = 8;
export const SESSION_TOKEN_LENGTH = 64;
export const MAX_USERNAME_LENGTH = 32;
export const MIN_USERNAME_LENGTH = 2;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DISPLAY_NAME_LENGTH = 64;
export const TYPING_TIMEOUT = 8_000;      // 8 seconds

// Permission bitfield
export const Permissions = {
  SEND_MESSAGES:    1 << 0,
  MANAGE_MESSAGES:  1 << 1,
  MANAGE_CHANNELS:  1 << 2,
  MANAGE_SPACE:     1 << 3,
  KICK_MEMBERS:     1 << 4,
  BAN_MEMBERS:      1 << 5,
  CREATE_INVITES:   1 << 6,
  MANAGE_ROLES:     1 << 7,
} as const;

// Default permissions for roles
export const DEFAULT_MEMBER_PERMISSIONS =
  Permissions.SEND_MESSAGES | Permissions.CREATE_INVITES;

export const ADMIN_PERMISSIONS =
  DEFAULT_MEMBER_PERMISSIONS |
  Permissions.MANAGE_MESSAGES |
  Permissions.MANAGE_CHANNELS |
  Permissions.KICK_MEMBERS |
  Permissions.BAN_MEMBERS;

export const OWNER_PERMISSIONS = 0xFFFFFFFF; // all permissions
