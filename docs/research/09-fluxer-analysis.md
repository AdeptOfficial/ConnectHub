# ConnectHub — Fluxer.app Analysis

## What Is Fluxer?

Fluxer is a free, open-source (AGPLv3), self-hostable **Discord clone** built by a Swedish independent developer (~5 years of solo development), now in public beta. It is the closest feature-complete replication of Discord's UX in the open-source space.

- Free forever, no ads, no data selling
- Self-hostable backend under AGPLv3
- Hosted instance at `fluxer.app` (Sweden, EU jurisdiction)
- Optional premium tier **Plutonium** ($4.99/month) for cosmetic perks — self-hosters get all premium features free
- No phone number required

Gained significant traction on Lemmy and Product Hunt in late 2025/early 2026, driven by growing Discord distrust.

## Architecture & Tech Stack

Fluxer is **centralized-by-default** — traditional server/client architecture where one server serves many users. Self-hosting is an option, not the default.

| Component | Technology | Role |
|---|---|---|
| Primary API | Node.js / TypeScript | Main HTTP + WebSocket API |
| Database | PostgreSQL (SQLite planned) | Primary persistence |
| Gateway | **Erlang** | Real-time WebSocket routing (separate service) |
| Voice/Video | **LiveKit** | SFU for calls and screen sharing |
| Metrics | ClickHouse | Time-series analytics and anomaly detection |
| Object Storage | S3-compatible | File attachments, client binaries |
| Background Jobs | API Worker (canary) | Async email and push notification delivery |
| Desktop | Electron | 6 platform/arch combinations, stable + canary channels |

**Notable:** The Erlang gateway is a deliberate choice — BEAM VM excels at massive concurrency and fault tolerance for WebSocket connections. Same reason WhatsApp and Discord use Erlang/Elixir.

### Self-Hosting

Docker Compose-based: `fluxer-server` (TypeScript), `fluxer-gateway` (Erlang), LiveKit (optional for voice). SQLite mode planned to reduce operational complexity.

### Federation (Planned, Not Shipped)

Planned model uses **distributed relay nodes** — other instances don't store data from outside their own instance, only routing metadata passes through relays.

## Features

### Shipped
- Real-time text messaging, typing indicators, read states
- Communities (Discord's "Servers") with channels, categories
- Granular roles and permissions
- Voice/video calls via LiveKit (noise suppression, echo cancellation, per-user volume)
- Screen sharing
- Reactions, markdown, link previews, GIF search
- File/image/video attachments
- Message search
- Custom emoji per community
- Custom CSS theming
- Moderation tools: audit logs, ban, mute
- Admin dashboard (separate app)

### Encryption (Current)
- TLS in transit, encrypted at rest on server
- **No end-to-end encryption** — server operator can read messages

### Planned: Opt-in "Secret Chats" (E2EE)
- All participants must be online simultaneously (no async)
- Messages + attachments E2EE, nothing written to database
- No history, no search, no offline delivery
- Session ends → all content disappears
- Explicitly rejected platform-wide E2EE, citing Matrix's broken UX as cautionary tale

## Direct Comparison: Fluxer vs ConnectHub

| Dimension | Fluxer | ConnectHub |
|---|---|---|
| Architecture | Centralized server, multi-user | Each user IS a node (Docker container) |
| Data Ownership | Server operator owns all messages | Sender owns messages cryptographically |
| E2EE | Transit/rest only; opt-in secret chat planned | Signal Protocol + PQXDH, mandatory, all messages |
| Kill Switch | Not implemented, not planned | Core feature — stop serving lease keys |
| Message Persistence | Stored on server permanently | Encrypted blobs leased from sender |
| Identity | Username + password on a server | Cryptographic keypair |
| Self-Hosting | Optional (shared instance) | Mandatory (per-user node) |
| Voice/Video | Yes, LiveKit SFU (shipped) | Planned V2 — WebRTC + SFU |
| Discord UX | Yes, primary goal (shipped) | Yes, design goal |
| Database | PostgreSQL (SQLite planned) | SQLCipher (encrypted SQLite) |
| Tech Stack | Node.js + Erlang gateway + LiveKit | Bun + libsignal + WebRTC |
| Threat Model | Trust the server operator | Zero-trust: peers can't read your messages |

### The Fundamental Divide

**Fluxer:** "Trust us (or your operator) not to read your messages."

**ConnectHub:** "You cannot read my messages even if you're running the node that holds them."

## What ConnectHub Can Learn From Fluxer

### Architecture

1. **Erlang Gateway Pattern** — Separating the WebSocket real-time layer (Erlang/BEAM) from the app API is worth studying. BEAM's lightweight process model excels at managing thousands of concurrent connections with fault isolation. Worth benchmarking against Bun's native WebSocket support at scale.

2. **SQLite Simplification Validates Our Choice** — Fluxer is moving from PostgreSQL to SQLite to reduce self-hosting friction. ConnectHub's SQLCipher choice is already aligned with this trend.

3. **Stable/Canary Release Channels** — S3-based distribution with two channels for desktop clients. Plan this from day one for any Electron/desktop distribution.

4. **LiveKit for Group Voice/Video** — LiveKit is open-source (Apache 2.0), self-hostable, Docker-native. Used by both Fluxer and Element/Matrix. ConnectHub's V2 voice plan should evaluate LiveKit as a drop-in SFU rather than building from scratch.

5. **Admin Dashboard is Essential** — For multi-tenant hosting (friends hosting for friends), an operator dashboard showing per-tenant storage, connections, and resource usage is a V2 requirement, not a V3 luxury.

### UX & Features

6. **"Why No Default E2EE" is a Cautionary Tale** — Fluxer cites Matrix's broken E2EE UX as the reason they won't default to E2EE. This validates ConnectHub's approach: E2EE must be invisible to users. The node handles all Signal Protocol state; devices are thin clients that never touch keys. Key management failures must never surface to users.

7. **Ephemeral Secret Chats Confirm Demand** — Even a convenience-first platform plans opt-in ephemeral sessions. ConnectHub offers this for ALL messages, asynchronously, with persistent history while sender is online. This is a marketing differentiator.

8. **Custom CSS / Theming** — Low-effort, high-value customization. Plan CSS variables in the frontend from V1.

9. **Per-User Volume Controls** — Small feature, huge quality-of-life in group calls. Plan for V2 voice from the start (WebAudio gain nodes — trivial to add upfront, painful to retrofit).

### Strategic

10. **Fluxer Validates the Market But Doesn't Compete on Our Core** — Discord distrust is real and growing. That tailwind benefits ConnectHub. But users who distrust ALL server operators — not just Discord — are not served by Fluxer. ConnectHub should not compete on convenience. Compete on the dimension where Fluxer cannot follow: **cryptographic ownership**.

## Sources

- [GitHub - fluxerapp/fluxer](https://github.com/fluxerapp/fluxer)
- [Fluxer Official Site](https://fluxer.app)
- [Roadmap 2026 - Fluxer Blog](https://blog.fluxer.app/roadmap-2026/)
- [How I built Fluxer - Fluxer Blog](https://blog.fluxer.app/how-i-built-fluxer-a-discord-like-chat-app/)
- [fluxerapp/fluxer - DeepWiki](https://deepwiki.com/fluxerapp/fluxer)
- [Fluxer on Product Hunt](https://www.producthunt.com/products/fluxer)
- [Fluxer: Swedish Discord alternative - Lemmy](https://lemmy.world/post/43178970)
- [Fluxer - Cloudron Forum](https://forum.cloudron.io/topic/15092/fluxer.app)
- [Discord Alternatives Ranked - Taggart Tech](https://taggart-tech.com/discord-alternatives/)
