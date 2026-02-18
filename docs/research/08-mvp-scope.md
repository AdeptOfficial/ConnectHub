# ConnectHub — MVP Scope

## V1 Goal

A working self-hosted node that can connect to other nodes, send encrypted messages with sender ownership, and provide a modern chat UX. Prove the encrypted lease model works.

## V1 Features (Must Have)

### Core
- [ ] Single-user Docker node (`docker run connecthub`)
- [ ] Keypair-based identity (generated on first run)
- [ ] Passphrase-sealed node (SQLCipher encrypted database)
- [ ] Node-to-node WebSocket connections
- [ ] Signal Protocol E2EE (X3DH + Double Ratchet via libsignal)
- [ ] PQXDH (post-quantum key exchange)

### Messaging
- [ ] Direct messages (1:1)
- [ ] Encrypted lease protocol (sender holds decryption keys)
- [ ] Kill switch (revoke all messages from all peers)
- [ ] Ephemeral messages (auto-delete timer, configurable per message or per conversation)
- [ ] Message queueing for offline peers (deliver when they reconnect)

### Spaces (Groups)
- [ ] Create/join Spaces with channels (text only for v1)
- [ ] Basic role system (admin, member)
- [ ] Sender Keys for group encryption
- [ ] Space config replicated across member nodes

### Media
- [ ] Image sharing (encrypted, stored on sender's node)
- [ ] File sharing (encrypted, with size limits)
- [ ] Media decryption keys included in leased message payload

### Frontend
- [ ] Web-based client (TypeScript + Tailwind CSS)
- [ ] Responsive design (works on mobile browsers)
- [ ] Real-time updates via WebSocket
- [ ] Channel list, message view, member list
- [ ] Contact management (add by public key or node address)

### Deployment
- [ ] Single Docker image
- [ ] Docker Compose for easy setup
- [ ] Volume mount for persistent encrypted data
- [ ] Environment variable configuration

## V2 Features (After MVP)

### Communication
- [ ] Voice calls (1:1 WebRTC)
- [ ] Video calls (1:1 WebRTC)
- [ ] Group voice/video (mesh for small groups, SFU for larger)
- [ ] Voice channels (persistent, join/leave like Discord)
- [ ] Screen sharing

### Multi-Tenant
- [ ] ConnectHub Manager (orchestrator for hosting multiple tenant nodes)
- [ ] Tenant provisioning CLI (`connecthub add-tenant <name>`)
- [ ] Reverse proxy with per-tenant subdomains
- [ ] Resource limits per tenant

### Mobile
- [ ] Progressive Web App (PWA) with offline support
- [ ] Push notifications (UnifiedPush for Android, Web Push for iOS)

### Social Features
- [ ] Stories/Status (ephemeral posts, 24h default)
- [ ] Reactions/emoji
- [ ] Threaded replies
- [ ] User profiles with avatars
- [ ] Typing indicators, read receipts (opt-in)

### Privacy Enhancements
- [ ] Sealed sender between nodes (hide social graph)
- [ ] Optional relay/proxy nodes (hide IP addresses)
- [ ] Configurable lease TTLs per contact
- [ ] Trust levels (different grace periods for different contacts)

### Administration
- [ ] Space moderation tools (ban, mute, hide messages)
- [ ] Node admin dashboard (storage usage, connected peers, resource monitoring)
- [ ] Backup/restore (encrypted export/import)
- [ ] Node migration tool (move identity between hosts)

## V3 Features (Future)

- [ ] React Native mobile app
- [ ] Sealed sender with optional relay network
- [ ] Web of trust / reputation system
- [ ] Plugin/bot system for Spaces
- [ ] Custom emoji/sticker packs
- [ ] Bandwidth optimization (lazy-load media, thumbnail previews)
- [ ] Federated Space discovery (opt-in directory)
