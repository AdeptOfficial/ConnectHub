# ConnectHub — Competitive Landscape

## Executive Summary

No existing project implements all of ConnectHub's core pillars simultaneously: sender-owned messages with a kill switch, Discord-like UX, Signal Protocol E2EE, per-user Docker nodes, and mesh topology. The closest projects are Databag (self-hosted + federated), SimpleX (privacy architecture), and Nostr (content ownership), but none solve the kill switch problem.

## Detailed Analysis

### Matrix / Element

- **Architecture:** Federated homeservers. Messages replicated to every server in a room via Merkle-DAG.
- **Similar:** Self-hostable, channels, voice/video (Element Call/LiveKit), E2EE (MegOlm), multi-tenant.
- **Missing:** Messages are **copied everywhere**. Redaction is advisory — other servers can retain originals. No kill switch. Identity is server-bound (`@user:server`). Heavy resource footprint (Synapse needs 1+ GB RAM).
- **Status:** Very active. Used by 10+ governments. Matrix 2.0 shipped late 2024.
- **Lesson:** Federation = replication = loss of ownership. ConnectHub must invert this.

### SimpleX Chat

- **Architecture:** Anonymous relay queues (SMP servers). No user identifiers — not even UUIDs. Per-conversation keypairs.
- **Similar:** Self-hostable SMP servers, strongest metadata protection, Signal Protocol + post-quantum Kyber, Trail of Bits audited.
- **Missing:** No channels/Discord UX. No kill switch. Relays are dumb pipes, not identity nodes.
- **Status:** Very active. Most advanced privacy architecture in the space.
- **Lesson:** Study SimpleX's "no identifiers" model for metadata protection.

### Briar

- **Architecture:** True P2P over Tor. Each device is a Tor hidden service. No servers.
- **Similar:** No central infrastructure, strong E2EE, messages only on devices.
- **Missing:** Text only, no voice/video, no channels, small groups only, no kill switch. Mobile-centric.
- **Status:** Active, slow development. Android v1.5.15 (Dec 2025), desktop in beta.

### Session

- **Architecture:** Signal fork. Onion-routed through ~2,200 "Session Nodes" staked with SESH tokens on Ethereum L2.
- **Similar:** No phone number, onion routing, E2EE.
- **Missing:** Blockchain/token dependency, users don't self-host, no kill switch, limited group calls.
- **Status:** Active. Migrated to own network May 2025.

### Nostr

- **Architecture:** Signed events broadcast to relays. Keypair identity. `kind:5` deletion events (advisory, not enforced).
- **Similar:** **Closest to content ownership** — events are cryptographically signed by author. Self-hostable relays.
- **Missing:** Deletion is advisory (relays can ignore). No E2EE for public posts. No voice/video. No channels as first-class citizens.
- **Status:** Very active. $10M donation to development in 2025.
- **Lesson:** Study Nostr's signed-event model for provable authorship.

### XMPP / Jabber

- **Architecture:** Federated (like email). Prosody (Lua) or ejabberd (Erlang). OMEMO for E2EE.
- **Similar:** Fully self-hostable, federated, OMEMO (Signal Protocol Double Ratchet), lightweight.
- **Missing:** Same replication problem as Matrix. Archaic UX. Voice/video unreliable. Extension fragmentation.
- **Status:** Very active at protocol level. Client ecosystem fragmented.

### Keet / Holepunch

- **Architecture:** P2P over Hypercore (append-only signed logs). DHT for discovery. No servers.
- **Similar:** Full P2P, keypair identity, voice/video via WebRTC.
- **Missing:** **Append-only = can never delete.** Architecturally incompatible with kill switch. Closed source app.
- **Status:** Active. Backed by Tether/Bitfinex.

### SSB / Manyverse

- **Architecture:** Gossip protocol. Each user has an append-only cryptographically signed log.
- **Similar:** Keypair identity, gossip mesh, self-hostable pubs.
- **Missing:** Append-only (anti-kill-switch). No real-time messaging. No E2EE by default. No voice/video. Dying ecosystem.
- **Status:** Low activity. Maintained by one developer.

### Tox

- **Architecture:** P2P via Kademlia DHT. NaCl/libsodium encryption. No servers.
- **Similar:** Serverless P2P, strong E2EE, voice/video in some clients.
- **Missing:** Stagnant development. No offline delivery. No channels. No kill switch.
- **Status:** Maintenance mode. Not viable for new development.

### Retroshare

- **Architecture:** Friend-to-friend (F2F) PGP mesh. Only connects to manually added friends.
- **Similar:** No central servers, forums/channels concept, VoIP.
- **Missing:** Desktop-only, 2010-era UX, tiny community, no kill switch.
- **Status:** Slow but alive. Not suitable as a modern platform.

### Delta Chat

- **Architecture:** Uses email as transport. Links to IMAP/SMTP. OpenPGP encryption.
- **Similar:** Decentralized, E2EE (v2 mandatory), self-hostable Chatmail servers, 7-day auto-delete.
- **Missing:** Email latency. No voice/video. No channels. No kill switch.
- **Status:** Very active. v2 shipped August 2025.

### Databag

- **Architecture:** Lightweight self-hosted federated messenger. Public-private key identity. E2EE.
- **Similar:** **Most architecturally similar to ConnectHub.** Self-hosted Docker nodes, federation, E2EE, audio/video calls. Runs on Raspberry Pi Zero.
- **Missing:** No kill switch, no ephemeral message ownership, no Discord-like channels, small community.
- **Status:** Active. Worth studying closely.

### Chitchatter

- **Architecture:** Browser-based ephemeral P2P chat via WebRTC. No servers, no persistence.
- **Similar:** Messages truly ephemeral (RAM only). Voice/video, screen share.
- **Missing:** No persistence at all, no identity, no self-hosting.
- **Status:** Active.

### Veilid (Cult of the Dead Cow, 2023+)

- **Architecture:** Rust P2P framework. "Tor for apps." 256-bit public key = identity.
- **Similar:** No IP exposure, keypair identity, E2EE.
- **Missing:** Framework only — no messenger features. VeilidChat is proof-of-concept.
- **Status:** Active framework development.

## Feature Comparison Matrix

| Project | Self-Hosted Node | P2P/Federated | Signal E2EE | Kill Switch | Ephemeral | Discord UX | Voice/Video | Active |
|---|---|---|---|---|---|---|---|---|
| Matrix/Element | Yes | Federated | Yes (MegOlm) | No | No | **Best** | Yes | Very |
| SimpleX | Yes (relay) | Relay queues | Yes (+PQ) | Partial | No | No | Yes | Very |
| Briar | Partial | P2P | Custom | No | No | No | No | Yes |
| Session | No | Onion/P2P | Yes | No | No | No | Limited | Yes |
| Nostr | Yes (relay) | Relay mesh | Partial | Advisory | No | No | No | Very |
| XMPP | Yes | Federated | Yes (OMEMO) | No | No | Partial | Poor | Yes |
| Keet | No | P2P | Yes | No (append) | No | No | Yes | Yes |
| Databag | **Yes** | **Federated** | **Yes** | No | No | Partial | Partial | Yes |
| Chitchatter | No | P2P WebRTC | Yes | N/A (RAM) | Yes | No | Yes | Yes |
| **ConnectHub** | **Yes** | **Mesh** | **Yes (+PQ)** | **Yes** | **Yes** | **Yes** | **Yes** | — |

## Key Architectural Lessons

1. **Federation = replication = loss of ownership.** Data must stay at source and be fetched on-demand.
2. **The kill switch is unsolved everywhere.** Encrypted leases with sender-held keys would be a first.
3. **Voice/video always needs TURN infrastructure.** Plan for coturn in the Docker stack.
4. **`libsignal` exists with TS bindings.** Don't reimplement crypto.
5. **Nostr's signed events + SimpleX's privacy model** = study both for ConnectHub's protocol design.
6. **Databag is the closest existing project** but lacks the core differentiator (message ownership).
