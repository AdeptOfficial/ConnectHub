# ConnectHub — Architecture

## Node Architecture

Each user runs a **ConnectHub node** — a Docker container that acts as both server and data store.

### Node-to-Node Communication

```
┌──────────┐    WebSocket tunnel    ┌──────────┐
│ Alice's  │◄──────────────────────►│  Bob's   │
│  Node    │   Signal Protocol E2EE │  Node    │
│          │                        │          │
│ SQLCipher│    Encrypted blobs     │ Temp     │
│ DB       │ ──────────────────────►│ Cache    │
│ (owns    │                        │ (leased  │
│  data)   │◄── lease renewal ────  │  blobs)  │
└──────────┘                        └──────────┘
```

### Discovery & Connection Flow

1. User A wants to chat with User B
2. User A adds User B's node address (e.g., `user-b.duckdns.org:9090` or a public key)
3. Signal Protocol handshake — keys exchange (X3DH / PQXDH)
4. Persistent WebSocket tunnel opens between nodes
5. They can now see each other's presence, send messages, join shared spaces

### Shared Spaces ("Servers" / Groups)

Since there's no central server, group chats work as a shared definition across member nodes:

```
         ┌─────────────────────────┐
         │   "Gaming Group" Space  │  ← Logical concept, not a server
         │                         │
         │  Exists as a shared     │
         │  definition across      │
         │  all member nodes       │
         └─────────────────────────┘
              │        │        │
         ┌────┴──┐ ┌───┴───┐ ┌─┴─────┐
         │Alice's│ │ Bob's │ │Carol's│
         │ Node  │ │ Node  │ │ Node  │
         └───────┘ └───────┘ └───────┘
         Has her    Has his   Has her
         messages   messages  messages
         + others   + others  + others
         as leased  as leased as leased
         blobs      blobs     blobs
```

- A "Space" is a shared config (name, channels, roles) replicated across member nodes
- Each member's messages are owned by their node
- If Alice leaves and kills switch → her messages vanish from Bob's and Carol's views
- The Space itself survives as long as at least one member remains

## Tech Stack

| Component | Tech | Role |
|-----------|------|------|
| Node server | Bun + Hono/Elysia | Each user's personal server |
| Database | SQLite (SQLCipher encrypted) | Local message store, keys, config |
| Frontend | TypeScript + Tailwind CSS | Web client (thin client to own node) |
| Mobile | React Native or Capacitor | Thin client pointing at own node |
| E2EE | libsignal (Rust core, TS bindings) | Full Signal Protocol + PQXDH |
| Real-time | WebSockets (native Bun support) | Node-to-node + node-to-client |
| Voice/Video | WebRTC + coturn (TURN relay) | P2P between nodes, SFU for groups |
| Deployment | Docker image | `docker run connecthub` and you're live |

## Multi-Device Sync

```
┌──────────────────────────────────────┐
│           Alice's Node (Docker)       │
│           ┌──────────────┐           │
│           │   SQLite DB  │           │
│           │   Signal Keys│           │
│           │   All Data   │           │
│           └──────┬───────┘           │
│                  │                    │
│           WebSocket sync             │
│           ┌──────┴───────┐           │
│           │    │    │    │           │
└───────────┼────┼────┼────┼───────────┘
            ▼    ▼    ▼    ▼
          Phone  Web  Desktop  Tablet
```

- The node is the source of truth
- Devices are thin clients that connect TO their own node
- Signal Protocol ratchet state lives on the node, not the device
- Devices authenticate to their own node with a session token
- This simplifies multi-device E2EE — devices don't hold keys, the node does

## Voice/Video via WebRTC

```
1:1 Calls:
  Alice's Node ◄──── WebRTC P2P ────► Bob's Node
                  (direct connection)
                  (SRTP encrypted)

Group Calls (mesh for small groups):
  Alice ◄──► Bob
  Alice ◄──► Carol
  Bob   ◄──► Carol

Group Calls (5+ people):
  One node acts as a temporary SFU (Selective Forwarding Unit)
  Or use a dedicated coturn/SFU container
```

Since every user IS a server with public-facing ports, WebRTC peer connections go directly between nodes. A coturn container in the Docker stack handles NAT traversal when needed.
