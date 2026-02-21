# ConnectHub

A real-time chat platform built with Bun, designed for encrypted group communication. Think Discord-style spaces and channels, with an architecture ready for end-to-end encryption via MLS/Signal protocols.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Server | [Hono](https://hono.dev) + Bun native WebSocket |
| Database | bun:sqlite (WAL mode) |
| Client | React 19 + [Zustand](https://zustand.docs.pmnd.rs) + [Tailwind CSS 4](https://tailwindcss.com) + [Vite](https://vite.dev) |
| Shared | TypeScript types, constants, gateway opcodes |

## Project Structure

```
ConnectHub/
├── client/                 # React SPA
│   └── src/
│       ├── components/
│       │   ├── auth/       # Login, Register
│       │   ├── channel/    # ChannelView, Message, MessageList, MemberList
│       │   ├── layout/     # AppLayout, SpaceRail, SpaceSidebar, UserArea
│       │   └── space/      # CreateSpaceModal, InviteModal
│       ├── lib/
│       │   ├── crypto/     # E2EE stubs (keys, lease, e2ee)
│       │   ├── api.ts      # REST client
│       │   └── gateway.ts  # WebSocket client with queue + reconnect
│       └── stores/         # Zustand stores (auth, space, channel, message, gateway)
├── server/
│   └── src/
│       ├── db/             # SQLite schema + database init
│       ├── lib/            # Snowflake IDs, crypto helpers
│       ├── middleware/     # Auth, rate limiting
│       ├── routes/         # REST: auth, spaces, channels, messages, members, invites, keys
│       └── ws/             # WebSocket gateway, sessions, event broadcasting
├── shared/                 # Types, constants, gateway opcodes shared between client/server
├── docs/
│   ├── TODO.md             # Feature checklist & testing plan
│   ├── ISSUES.md           # Known bugs by severity
│   └── research/           # Design documents & architecture notes
├── Dockerfile
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Install

```bash
bun install
```

### Run (Development)

Start the server and client in separate terminals:

```bash
# Terminal 1 — Server (port 4000)
PORT=4000 bun run --hot server/src/index.ts

# Terminal 2 — Client (port 5173)
cd client && bun run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:4000`. The WebSocket gateway connects directly to `ws://localhost:4000/gateway` in dev mode.

### Build

```bash
cd client && bun run build
```

### Docker

```bash
docker compose up --build
```

## Architecture

### Gateway (WebSocket)

The gateway handles real-time communication using a custom binary-inspired protocol:

1. Client connects to `/gateway`
2. Server sends `Hello` with heartbeat interval
3. Client sends `Identify` with auth token
4. Server responds with `Ready` (user data, spaces, channels)
5. Client sends `Heartbeat` periodically to stay alive
6. Messages flow via `SendMessage` (client) / `MessageCreate` (server)

### REST API

All routes under `/api`, authenticated via Bearer token:

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login, get token |
| `GET /api/auth/me` | Get current user |
| `GET /api/spaces` | List user's spaces |
| `POST /api/spaces` | Create a space |
| `GET /api/channels/space/:id` | List channels in a space |
| `POST /api/channels` | Create a channel |
| `GET /api/messages/channel/:id` | Fetch messages (cursor pagination) |
| `PUT /api/messages/:id` | Edit a message |
| `DELETE /api/messages/:id` | Delete a message |
| `GET /api/members/space/:id` | List space members |
| `DELETE /api/members/space/:id/me` | Leave a space |
| `DELETE /api/members/space/:id/user/:uid` | Kick a member |
| `POST /api/invites` | Create an invite |
| `POST /api/invites/:code/join` | Join via invite code |

### Database

SQLite with WAL mode. Tables: `users`, `sessions`, `spaces`, `channels`, `messages`, `space_members`, `invites`, `one_time_prekeys`, `read_states`, `dm_channels`, `mls_groups`.

Data stored at `server/data/connecthub.db` (auto-created on first run).

## Tracking

- [docs/ISSUES.md](docs/ISSUES.md) — Known bugs (38 issues, ranked by severity)
- [docs/TODO.md](docs/TODO.md) — Feature checklist and testing plan

## License

Private — not yet licensed for distribution.
