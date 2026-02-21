# ConnectHub — MVP Scope

## V1 Goal

A self-hosted community server with text channels, voice channels, and 1:1 DMs — all end-to-end encrypted with the kill switch. Prove the Encrypted Lease Protocol works in a Discord-like UX.

**Priority order: Text channels → Voice channels → DMs → Everything else.**

## V1 Features (Must Have)

### Core Infrastructure
- [ ] ConnectHub server (Bun + Hono/Elysia)
- [ ] SQLite database (WAL mode)
- [ ] WebSocket gateway for real-time messaging
- [ ] Docker Compose deployment
- [ ] Environment variable configuration
- [ ] Volume mount for persistent data

### Authentication & Identity
- [ ] Keypair-based identity (generated on registration)
- [ ] Username + passphrase registration
- [ ] Invite-only registration (admin generates invite links)
- [ ] Session tokens for client authentication
- [ ] Prekey upload/distribution for E2EE session setup

### E2EE — Text Channels (Priority 1)
- [ ] MLS group key management (RFC 9420, via openmls WASM)
- [ ] Sender Keys per member (distributed via MLS)
- [ ] Encrypted Lease Protocol (LeaseKey envelopes, LeaseWrappingKey)
- [ ] Kill switch (revoke LeaseWrappingKey, delete envelopes, broadcast REVOKE)
- [ ] PQXDH for post-quantum key exchange
- [ ] Message queuing for offline members (server stores encrypted blobs + envelopes)

### E2EE — Direct Messages
- [ ] Signal Protocol (X3DH + Double Ratchet via libsignal)
- [ ] LeaseKey layer on DMs (same kill switch as Spaces)
- [ ] PQXDH for DM session establishment

### Spaces (Communities)
- [ ] Create Spaces with encrypted config (name, description)
- [ ] Text channels within Spaces
- [ ] Voice channels within Spaces
- [ ] Role system (owner, admin, member)
- [ ] Invite links for Spaces
- [ ] Member join/leave with MLS re-keying (O(log n))
- [ ] Member ban with MLS re-keying
- [ ] History visibility setting (from_join, 7d default, 30d, full)
- [ ] Lease TTL setting per Space (1h, 24h, 7d default, 30d, none)

### Voice Channels (Priority 2)
- [ ] WebRTC voice with DTLS-SRTP encryption
- [ ] coturn TURN relay for NAT traversal
- [ ] Signaling via server WebSocket
- [ ] Join/leave voice channels (persistent, like Discord)
- [ ] Mesh topology for small groups (2-4 participants)
- [ ] Mute/deafen controls
- [ ] Voice activity indicators

### Moderation
- [ ] Admin: hide messages (UI-level, blob persists)
- [ ] Admin: ban members (MLS re-key, full lockout)
- [ ] Admin: manage roles

### Media
- [ ] Image sharing (encrypted, stored on server)
- [ ] File sharing (encrypted, with size limits)
- [ ] Media encryption keys inside LeaseKey envelope (kill switch applies to media)

### Frontend (Web Client)
- [ ] TypeScript + Tailwind CSS
- [ ] Responsive design (desktop + mobile browser)
- [ ] Real-time updates via WebSocket
- [ ] Space sidebar, channel list, message view, member list
- [ ] Contact/DM list
- [ ] Voice channel UI (join, leave, mute, participants)
- [ ] Kill switch button in settings
- [ ] Theme support (CSS variables for customization)

### Deployment
- [ ] Docker Compose (server + coturn)
- [ ] Setup guide for self-hosters
- [ ] Admin CLI for invite generation, user management

## V2 Features (After MVP)

### Voice/Video Enhancements
- [ ] LiveKit SFU for group calls 5+ participants
- [ ] Video calls (1:1 and group)
- [ ] Screen sharing
- [ ] Per-user volume controls

### Data Export
- [ ] Export per Space, per channel, or date range
- [ ] Standalone HTML viewer (open in browser, no server needed)
- [ ] JSON export (machine-readable)
- [ ] Markdown export (human-readable)
- [ ] Include/exclude media option

### Social Features
- [ ] Stories/Status (ephemeral posts, 24h default)
- [ ] Reactions/emoji
- [ ] Threaded replies
- [ ] User profiles with avatars
- [ ] Typing indicators, read receipts (opt-in)

### Client Distribution
- [ ] Electron desktop app (stable + canary channels)
- [ ] Progressive Web App (PWA) with install prompt
- [ ] Push notifications (UnifiedPush for Android, Web Push for iOS)

### Administration
- [ ] Admin dashboard (web-based)
- [ ] Storage usage, connection metrics, bandwidth monitoring
- [ ] Backup/restore tools
- [ ] Server health checks

### Privacy Enhancements
- [ ] Sealed sender between clients (hide who messages whom from server)
- [ ] Configurable lease TTL per conversation (DMs)
- [ ] Key backup/recovery (passphrase-derived, stored encrypted on server)

## V3 Features (Future)

- [ ] Federation (cross-server communication)
- [ ] React Native mobile app
- [ ] Web of trust / reputation system
- [ ] Plugin/bot system for Spaces
- [ ] Custom emoji/sticker packs
- [ ] Bandwidth optimization (lazy-load media, thumbnail previews)
- [ ] Federated Space discovery (opt-in directory)
- [ ] PostgreSQL backend option (for large deployments)
