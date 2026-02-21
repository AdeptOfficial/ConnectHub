# ConnectHub — Open Questions & Remaining Decisions

## Decided (Locked In)

These questions have been answered through our design discussions:

- **Architecture:** Option C — traditional server/client with zero-knowledge relay + Encrypted Lease Protocol
- **Offline delivery:** Server queues encrypted blobs + pre-uploaded LeaseKey envelopes. Sender does NOT need to be online.
- **History visibility:** 7 days default for new members, admin configurable (from_join, 7d, 30d, full)
- **Lease TTL:** Per-Space configurable (1h, 24h, 7d default, 30d, none)
- **Group key management:** MLS (RFC 9420) with TreeKEM — O(log n) for member changes
- **Voice/video:** Standard WebRTC with DTLS-SRTP, no lease keys needed. coturn for NAT traversal, LiveKit SFU for large groups (V2).
- **Moderation:** Admins can hide messages (UI-level), ban members (MLS re-key). Admins cannot read or delete message content.
- **Kill switch:** Sender destroys LeaseWrappingKey + server deletes LeaseEnvelopes. Double protection (cooperative + cryptographic).

## Open Questions

### 1. Registration & Identity Discovery

**Problem:** No phone number, no email — how do users find each other?

**Options under consideration:**
- **Username@server-address** — human-readable, like email (`alice@chat.mycommunity.com`)
- **Public key fingerprint** — share via QR code or copy-paste for verification
- **In-server discovery** — search for users within the same server by username
- **Cross-server discovery** — future consideration if/when federation is added

**Leaning:** Username@server for sharing, public key fingerprint for verification (Safety Numbers like Signal). In-server username search for V1.

### 2. Cross-Server Communication (Federation)

**Problem:** If Alice is on `server-a.com` and Bob is on `server-b.com`, can they chat?

**Options:**
- **V1: No federation** — users must be on the same server. Simple, proven.
- **V2+: Federation** — servers relay messages between each other. Complex but powerful.
- **DMs across servers** — even without full federation, allow 1:1 DMs across server boundaries

**Leaning:** No federation for V1. Focus on making a single server great. Federation is a V3 feature.

### 3. Client-Side Key Backup & Recovery

**Problem:** If a user loses their device, they lose their private keys and all ability to decrypt messages.

**Options:**
- **Passphrase-derived key backup** — encrypt private keys with a user-chosen passphrase, store encrypted backup on server (like Signal's SVR)
- **Recovery codes** — generate a one-time recovery code at registration
- **Multi-device as backup** — if you have 2+ devices linked, losing one isn't catastrophic
- **Accept the loss** — "you lose your device, you start fresh" (most private, worst UX)

**Leaning:** Passphrase-derived backup stored (encrypted) on server. Similar to Signal's PIN-based backup. User enters passphrase to recover keys on new device. Server cannot decrypt the backup.

### 4. Abuse Prevention

**Problem:** How to prevent spam, harassment, and abuse?

**Decided mechanisms:**
- Contact/friend request model for DMs (must accept before someone can message you)
- Space invitations (must be invited to join)
- Server-level bans (admin removes user entirely)
- Rate limiting on the server

**Open:**
- Should there be a report mechanism? To whom — the server admin?
- Block at client level (hide user) vs server level (prevent routing)?
- How to handle abuse in open-registration servers?

### 5. Client Distribution

**Problem:** How do users get the ConnectHub client?

**Options:**
- **Web client** — just visit `chat.mycommunity.com` in a browser. No install needed. (V1)
- **Electron desktop app** — installable, better notifications, persistent connection (V2)
- **PWA** — installable from browser, works on mobile (V1)
- **React Native mobile app** — native mobile experience (V3)

**Leaning:** Web client + PWA for V1. Electron for V2. React Native for V3.

### 6. MLS Implementation Choice — DECIDED

**Decision:** `ts-mls` — pure TypeScript MLS (RFC 9420) implementation.

- Runs on both Bun server and browser client (same codebase)
- Uses WebCrypto API (`crypto.subtle`)
- Supports post-quantum cipher suites (ML-KEM, ML-DSA, X-Wing)
- npm published, actively maintained
- **Risk:** No formal security audit. Plan for third-party audit before production launch.

`openmls` was rejected — no published npm/WASM package, no JS bindings. `@signalapp/libsignal-client` was rejected — N-API native addon, doesn't work in browser, unreliable in Bun.

For 1:1 DMs (Signal Protocol): `2key-ratchet` — pure TypeScript X3DH + Double Ratchet on WebCrypto. Uses P-256 instead of Curve25519 (acceptable since we're not federating with Signal).

### 7. Database Schema Design

**Problem:** How to structure the SQLite database for the server?

**Key tables needed:**
- `users` — public keys, prekeys, registration metadata
- `spaces` — encrypted config blobs, membership
- `channels` — encrypted metadata, SpaceID reference
- `messages` — encrypted blobs, LeaseEnvelopes, channel reference, timestamps
- `mls_state` — MLS tree state per Space
- `media` — encrypted file blobs, referenced by messages

**Open:** Exact schema design. To be finalized during implementation.

## Technical Risks

### 1. MLS at Scale
MLS (RFC 9420) is standardized but relatively new in production. Large-group behavior (1000+ members) may have edge cases. Mitigation: start with smaller communities, test thoroughly.

### 2. LeaseKey Envelope Size
Adding a LeaseEnvelope to every message increases per-message overhead. Need to measure actual size impact. Mitigation: LeaseEnvelopes are small (< 256 bytes typically).

### 3. Kill Switch Latency
When a user triggers a kill switch, there's a propagation delay — the server must delete envelopes and broadcast REVOKE to all connected clients. Offline clients won't know until they reconnect. Mitigation: TTL-based expiry as a fallback; kill switch is the fast path.

### 4. SQLite Write Contention
High-traffic servers with many concurrent message sends may hit SQLite's single-writer limitation. Mitigation: WAL mode, write batching, and consider PostgreSQL option for large deployments.
