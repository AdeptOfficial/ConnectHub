# ConnectHub — Implementation & Testing Checklist

## Bugs to Fix

- [x] **`restore()` never sets `user`** — After page refresh, `authStore.user` is `null`. `isOwn` checks on messages always fail. Fixed: added `GET /auth/me` endpoint, `restore()` now fetches user.
- [x] **`handleDelete` has no error handling** — API errors silently swallowed. Fixed: added try/catch with alert.
- [ ] **Heartbeat timeout never evicts dead sessions** — `server/src/ws/gateway.ts` has a 15s interval with an empty body. Dead WS clients linger forever in the session store.
- [ ] **Channel header shows truncated ID instead of name** — `ChannelView.tsx:49` always renders `channel-XXXX`. Should resolve `encryptedName` from `channelStore`.
- [ ] **`encryptMessage`/`decryptMessage` are no-ops** — `client/src/lib/crypto/e2ee.ts` returns plaintext unchanged. All data labeled "encrypted" is actually plaintext.

---

## Features to Implement

### Real-Time Event Broadcasting (High Priority)

Server opcodes 4–15 are defined in `shared/src/events.ts` but never emitted. Mutations done via REST are invisible to other connected clients.

- [ ] **MessageUpdate (opcode 4)** — Broadcast when `PUT /messages/:id` succeeds
- [ ] **MessageDelete (opcode 5)** — Broadcast when `DELETE /messages/:id` succeeds
- [ ] **SpaceCreate (8) / SpaceUpdate (9) / SpaceDelete (10)** — Broadcast on space mutations
- [ ] **ChannelCreate (11) / ChannelUpdate (12) / ChannelDelete (13)** — Broadcast on channel mutations
- [ ] **MemberAdd (14)** — Broadcast when a user joins via invite
- [ ] **MemberRemove (15)** — Broadcast on kick or leave
- [ ] **Client handlers in `gatewayStore.ts`** — Register `.on()` for all of the above and update stores in real-time

### Presence System

- [ ] **ClientOpcode.UpdatePresence (5)** — Defined but never implemented. Server has no handler, client has no send method.
- [ ] **ServerOpcode.PresenceUpdate (7)** — Never emitted. No online/offline/idle indicators in UI.

### E2EE Key Exchange & Encryption

- [ ] **Wire up `client/src/lib/crypto/keys.ts`** — `generateIdentityKeyPair` and `generateSignedPrekey` exist but are never called. `authStore.register` uses a fake random key.
- [ ] **Upload prekeys** — `POST /api/keys/prekeys` route is fully implemented server-side. Client never calls it.
- [ ] **Fetch key bundles** — `GET /api/keys/bundle/:userId` is implemented. Client never calls it.
- [ ] **Implement `encryptMessage` / `decryptMessage`** — Currently return plaintext unchanged.
- [ ] **MLS group state** — `mls_groups` table exists, never touched. No group key negotiation.
- [ ] **Lease key wrapping** — `client/src/lib/crypto/lease.ts` has real AES-GCM logic but is never imported.

### DM Channels

- [ ] **Server routes** — `dm_channels` table exists, no routes.
- [ ] **Client UI** — Home view is a placeholder. No DM list, no DM conversation view, no DM store.
- [ ] **`DmChannel` type** — Defined in `shared/src/types.ts`, unused.

### Read States & Unread Indicators

- [ ] **Server routes** — `read_states` table exists, never read or written.
- [ ] **Client UI** — No unread counts, no mention badges, no read position tracking.
- [ ] **`ReadState` type** — Defined in `shared/src/types.ts`, unused.

### Space Management

- [ ] **Delete Space UI** — `DELETE /api/spaces/:id` route exists (owner-only), no client button.
- [ ] **Space settings** — No way to update space config (name, history visibility, lease TTL).
- [ ] **Transfer ownership** — Owner cannot transfer, can only leave (which is blocked server-side).

### Permissions System

- [ ] **Bitfield constants unused** — `shared/src/constants.ts` defines `SEND_MESSAGES`, `MANAGE_MESSAGES`, `MANAGE_CHANNELS`, etc. Server uses raw `role >= Role.Admin` instead.
- [ ] **Per-channel permission overrides** — Not implemented.

### User Profile & Settings

- [ ] **Avatar upload/display** — `avatarHash` field exists on User, stored in DB, never used for image rendering. All avatars are colored initials.
- [ ] **User settings modal** — No way to change display name, password, or avatar after registration.
- [ ] **`User.flags` interpretation** — Stored but never read or displayed.

### Message Features

- [ ] **System messages** — `MessageType.System = 1` defined, never created or rendered differently.
- [ ] **Message nonce dedup** — `SendMessagePayload.nonce` field defined, never sent by client, never checked by server.
- [ ] **Voice channels** — `ChannelType.Voice = 1` defined, no WebRTC implementation.

### Miscellaneous

- [ ] **`sendToUser()` utility** — Exported from `server/src/ws/events.ts`, never called. Intended for DM delivery or targeted notifications.
- [ ] **Invite preview** — `GET /api/invites/:code` route exists, client never uses it to show invite details before joining.
- [ ] **Single space fetch** — `GET /api/spaces/:id` route exists, client only fetches the full list.

---

## Testing Checklist

### Auth Flow
- [ ] Register a new account → redirected to main app
- [ ] Login with existing credentials → session restored
- [ ] Refresh page → user stays logged in, `user` object is populated (not null)
- [ ] Logout → token cleared, redirected to login
- [ ] Invalid token on refresh → auto-logout, no stuck states

### Space Management
- [ ] Create a new space → appears in left rail
- [ ] Click space name → dropdown shows Invite / Create Channel / Leave
- [ ] Leave a space (non-owner) → space removed from sidebar
- [ ] Leave a space (owner) → should show error "Owner cannot leave"

### Channel Management
- [ ] Click "+" next to "Text Channels" → CreateChannelModal opens
- [ ] Create channel → channel appears in sidebar, auto-selected
- [ ] Click dropdown → "Create Channel" → same modal
- [ ] Channel header shows actual channel name (not truncated ID)

### Invites
- [ ] Open Invite modal from space dropdown → Create tab visible
- [ ] Generate invite code → code displayed, copyable
- [ ] Click "Join a Space" from home screen → opens join-only InviteModal
- [ ] Join with valid code → space appears in sidebar, auto-selected
- [ ] Join with invalid/expired code → error message shown
- [ ] Join space you're already in → error "Already a member"

### Messaging
- [ ] Send a message → appears in message list
- [ ] Hover own message → edit (pencil) and delete (trash) icons appear
- [ ] Hover another user's message → only delete icon shows (if admin/owner)
- [ ] Hover another user's message as regular member → no action icons
- [ ] Edit message → inline textarea, press Enter → message updated, "(edited)" shown
- [ ] Edit message → press Escape → edit cancelled, original content restored
- [ ] Delete own message → confirm dialog → message removed
- [ ] Delete fails (e.g. permission error) → alert shown with error message
- [ ] Messages from other users appear in real-time via WebSocket

### Member Management
- [ ] Member list shows grouped by role (Owner, Admin, Member)
- [ ] Hover member as admin/owner → "Kick" button appears on lower-role members
- [ ] Kick button does NOT show on self
- [ ] Kick button does NOT show on equal/higher-role members
- [ ] Kick member → member removed from list
- [ ] Kick fails → alert with error

### Real-Time Sync (currently broken — no WS broadcasts for mutations)
- [ ] User A edits message → User B sees update without refresh
- [ ] User A deletes message → User B sees removal without refresh
- [ ] User A creates channel → User B sees new channel in sidebar
- [ ] User A kicks User B → User B's UI reflects removal
- [ ] User joins via invite → existing members see them in member list
