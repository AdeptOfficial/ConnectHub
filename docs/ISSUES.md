# ConnectHub — Known Issues

## Critical

### ISS-01: Server defaults to port 3000, client expects 4000
**File:** `server/src/index.ts:48`

`Number(process.env.PORT) || 3000` — if `PORT` env is unset, server starts on 3000. Vite proxy and gateway client both target 4000. Everything breaks silently.

**Fix:** Change fallback to `4000`.

---

### ISS-02: PUT/DELETE message routes return 404 — Hono sub-router not matching
**Files:** `server/src/routes/messages.ts:96,136`, `client/src/stores/messageStore.ts:64,84`

`PUT /:messageId` and `DELETE /:messageId` are registered on the messages sub-router, but Hono returns its default 404 "Not Found" for both. The routes are never reached. Edit and delete both fail with "Not Found" in the UI. Likely a Hono sub-router matching issue — the `messages.use("/*", authMiddleware)` wildcard or route ordering may be interfering.

**Symptoms:** Clicking delete shows `alert("Not Found")`. Edit save fails silently.

**Fix:** Debug Hono route matching. May need to register these on the parent `api` router directly (e.g. `api.put("/messages/:messageId", ...)`) instead of the sub-router, or change the middleware pattern.

---

### ISS-03: `handleSubscribe` has no membership check
**File:** `server/src/ws/gateway.ts:257-262`

Any authenticated WS session can subscribe to any channel ID — even non-existent ones or channels in spaces they're not a member of. They'll receive `MessageCreate` and `TypingStart` events for channels they have no access to.

**Fix:** Verify channel exists and user is a member of its space before adding the subscription.

---

### ISS-04: `handleTyping` has no membership check
**File:** `server/src/ws/gateway.ts:237-255`

Any identified session can broadcast typing indicators to any channel. No space membership verification, unlike `handleSendMessage` which does check.

**Fix:** Add the same membership check as `handleSendMessage`.

---

### ISS-05: TOCTOU race on invite use-count
**File:** `server/src/routes/invites.ts:54-82`

Invite expiry and max-uses checks are done outside the transaction. Under concurrent load, multiple users can pass both checks and all get added, bypassing `max_uses`.

**Fix:** Move the checks inside the transaction and re-validate.

---

### ISS-06: OTP key claim is not atomic
**File:** `server/src/routes/keys.ts:55-62`

Two concurrent callers can `SELECT` the same unused prekey before either runs `UPDATE`. Same one-time key handed out twice — breaks forward secrecy.

**Fix:** Use `UPDATE ... RETURNING` in one statement or wrap in transaction with re-check.

---

### ISS-07: Double-Identify causes session duplication
**File:** `server/src/ws/gateway.ts:88-166`

If a client sends `Identify` twice, `addSession` pushes a duplicate entry. Causes double delivery of events and a memory leak (`removeSession` only removes the first match).

**Fix:** Check if session already exists in `sessionById` at start of `handleIdentify`.

---

## High

### ISS-08: `App.tsx` inline restore never sets `user`
**File:** `client/src/App.tsx:48-85`

`App.tsx` has its own restore logic that bypasses `authStore.restore()`. It validates the token via `GET /spaces` but never fetches or sets `user`. After page refresh, `authStore.user` is `null` — breaks `isOwn` checks, UserArea display, and any component reading user state before gateway `READY`.

**Fix:** Delete inline restore in `App.tsx`, call `authStore.restore()` instead (which now uses `GET /auth/me`).

---

### ISS-09: `authStore.restore()` is never called
**File:** `client/src/stores/authStore.ts:77-97`

The `restore()` method exists but nothing invokes it. `App.tsx` reimplements the logic differently (see ISS-07). Dead code.

---

### ISS-10: Heartbeat timeout never evicts dead sessions
**File:** `server/src/ws/gateway.ts:29-33`

The 15s interval body is completely empty. `HEARTBEAT_TIMEOUT` is imported but unused. Zombie WS connections accumulate forever.

**Fix:** Iterate sessions, compare `lastHeartbeat` to `Date.now() - HEARTBEAT_TIMEOUT`, close stale ones.

---

### ISS-11: `sendPayload` doesn't check socket readyState
**File:** `server/src/ws/events.ts:6-10`

No guard on `ws.readyState` before calling `.send()`. If a socket is closing during a `broadcastToChannel` loop, `.send()` throws and aborts the entire broadcast — other subscribers don't get the message.

**Fix:** Guard with `if (session.ws.readyState === 1)`.

---

### ISS-12: `useAuthStore()` without selector in UserArea
**File:** `client/src/components/layout/UserArea.tsx:5`

`const { user, logout } = useAuthStore()` subscribes to the entire store. Any state change re-renders UserArea. Known Zustand anti-pattern per MEMORY.md.

**Fix:** Use individual selectors.

---

### ISS-13: `getChannelMessages` and `getSpaceChannels` use `|| []`
**Files:** `client/src/stores/messageStore.ts:99`, `client/src/stores/channelStore.ts:44`

Creates a new array reference every call. If used as a Zustand selector, causes infinite re-render loop. Known anti-pattern per MEMORY.md.

**Fix:** Use module-level `const EMPTY = []` with `?? EMPTY`.

---

### ISS-14: Token stored in localStorage — XSS exposure
**File:** `client/src/stores/authStore.ts:42,60,73,90`

Bearer token in `localStorage` is accessible to any JS on the page. An XSS vulnerability anywhere in the app gives full account takeover.

**Fix:** Use `httpOnly; SameSite=Strict` cookies, or at minimum `sessionStorage`.

---

## Medium

### ISS-15: No `MAX_MESSAGE_SIZE` check on WS messages
**File:** `server/src/ws/gateway.ts:handleSendMessage`

`MAX_MESSAGE_SIZE` constant exists in shared but is never checked. Client can send arbitrarily large messages that get stored and broadcast.

**Fix:** Check `data.encryptedContent.length <= MAX_MESSAGE_SIZE`.

---

### ISS-16: No size limit on REST message edit
**File:** `server/src/routes/messages.ts:109-113`

Same as ISS-14 but for the `PUT /messages/:id` route.

**Fix:** Add length check.

---

### ISS-17: Delete button visible to all users
**File:** `client/src/components/channel/Message.tsx:134-143`

Delete button renders for every user on every message. Non-owners/non-admins click it, get a 403 error. Should only show for the message author and space admins/owners.

**Fix:** Gate on `isOwn || userRole >= Role.Admin`.

---

### ISS-18: `fetchedRef` prevents channel refresh on space re-entry
**File:** `client/src/components/layout/SpaceSidebar.tsx:28-32`

Once channels are fetched for a space, `fetchedRef.current` prevents re-fetching. If user leaves and re-enters the same space, channels created by others since the first fetch are invisible.

**Fix:** Always refetch, or clear `fetchedRef` on space leave.

---

### ISS-19: `gateway.connect()` called twice on fresh login
**Files:** `client/src/App.tsx`, `client/src/stores/authStore.ts`

`authStore.login()` calls `gateway.connect()`. Then `App.tsx` render cycle detects the token and calls `gateway.connect()` again. The second call closes the first socket mid-handshake and reconnects, losing queued operations.

**Fix:** Deduplicate — only connect from one place.

---

### ISS-20: Message action buttons clip on first message
**File:** `client/src/components/channel/Message.tsx:122`

`top-0 -translate-y-1/2` positions action buttons above the message row. For the first message in the list, they render outside the scroll container and get clipped.

**Fix:** Position within the message row bounds.

---

### ISS-21: Edit textarea doesn't sync when message updates externally
**File:** `client/src/components/channel/Message.tsx:17`

`editContent` state is initialized from `message.encryptedContent` on mount. If the message is edited externally (once real-time events work), the textarea shows stale content. Saving overwrites the newer version.

**Fix:** Sync `editContent` from props when not actively editing.

---

### ISS-22: Channel header shows truncated ID, not channel name
**File:** `client/src/components/channel/ChannelView.tsx:49`

Always renders `channel-{activeChannelId.slice(-4)}`. The actual `encryptedName` from channelStore is never used here.

**Fix:** Look up channel name from store.

---

### ISS-23: `typingState` map never cleaned proactively
**File:** `client/src/stores/gatewayStore.ts:40-55`

Expired typing entries only evicted when `getTypingUsers()` is called. If no channel is viewed, the map grows unbounded.

**Fix:** Add periodic cleanup or limit map size.

---

### ISS-24: Typing timeout not cleared on unmount
**File:** `client/src/components/channel/MessageComposer.tsx:37-40`

Pending `setTimeout` keeps closure alive after component unmounts. Minor memory leak over many channel switches.

**Fix:** Add cleanup in `useEffect` return.

---

### ISS-25: WS identify doesn't update `last_used_at`
**File:** `server/src/ws/gateway.ts:handleIdentify`

REST auth middleware updates `last_used_at` on every request. WS identify does not. Sessions that only use WS appear permanently stale in the DB.

---

### ISS-26: Reconnect timer silently canceled by cleanup
**File:** `client/src/lib/gateway.ts:187-202`

When `doConnect()` closes an existing socket, `onclose` fires and calls `cleanup()`, which clears the reconnect timer that `scheduleReconnect()` just set. Reconnection silently stops.

**Fix:** Set `this.ws = null` before closing to prevent `onclose` from triggering cleanup, or flag intentional disconnects.

---

### ISS-27: `require("fs")` in ESM context
**File:** `server/src/db/database.ts:17`

Uses CommonJS `require("fs")` in a TypeScript/ESM file. Works in Bun but fragile.

**Fix:** Use `import { mkdirSync } from "fs"`.

---

### ISS-28: Rate limiter per path+IP, not per IP alone
**File:** `server/src/middleware/rateLimit.ts:27`

Rate limit key is `${ip}:${c.req.path}`. Attacker rotates between `/auth/login`, `/auth/register`, `/auth/me` to get 3x the limit.

**Fix:** Use IP-only key for auth routes.

---

### ISS-29: `c.req.json()` parse errors return 500
**Files:** All route files that call `c.req.json()` without try/catch

Invalid JSON body causes `c.req.json()` to throw → global error handler returns 500 instead of 400.

**Fix:** Wrap in try/catch or use a body-parsing middleware.

---

### ISS-30: Identity key is random bytes, not a real ECDH key pair
**File:** `client/src/stores/authStore.ts:32-35`

`authStore.register` generates 32 random bytes as `identityKey`. The real `generateIdentityKeyPair()` in `crypto/keys.ts` is never called. Key bundle fetches return cryptographically meaningless data.

---

## Low

### ISS-31: Space delete doesn't clean up `read_states` or `mls_groups`
**File:** `server/src/routes/spaces.ts:140-146`

Transaction deletes messages, channels, members, invites — but not `read_states` or `mls_groups`. Orphan rows accumulate.

---

### ISS-32: Channel delete doesn't clean up `read_states`
**File:** `server/src/routes/channels.ts:106-109`

Same as ISS-30 but for channel deletion.

---

### ISS-33: Missing database indexes
**File:** `server/src/db/schema.ts`

- `one_time_prekeys(user_id, used)` — hit on every key bundle fetch
- `space_members(user_id)` — hit in gateway identify

---

### ISS-34: `StrictMode` imported but not applied
**File:** `client/src/main.tsx:1,8`

`StrictMode` is imported but `<App />` is rendered without it. Development-time double-invoke detection disabled.

---

### ISS-35: `TIMESTAMP_SHIFT` hard-coded in client instead of shared
**File:** `client/src/lib/snowflake.ts:2`

Client and server both use `22n` but the client hard-codes it instead of importing from shared. Fragile coupling.

---

### ISS-36: `SESSION_TOKEN_LENGTH` naming is misleading
**File:** `server/src/lib/crypto.ts:4`

Constant is 64 (bytes), but base64url output is 86 characters. Name suggests character count.

---

### ISS-37: `signedPrekey` never sent during registration
**File:** `client/src/stores/authStore.ts`

Server schema and register endpoint accept `signedPrekey` and `signedPrekeySig`. Client never generates or sends them. DB stores `NULL` for both.

---

### ISS-38: `createRoot(document.getElementById("root")!)` non-null assertion
**File:** `client/src/main.tsx:8`

Suppresses TS error but causes runtime crash if `#root` element is missing from HTML.
