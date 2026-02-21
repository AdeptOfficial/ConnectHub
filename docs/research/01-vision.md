# ConnectHub — Vision & Core Concept

## What Is ConnectHub?

A privacy-first, self-hostable messaging platform with **cryptographic message ownership**. Think Discord meets Snapchat, but the server can't read your messages — and you can make your messages disappear from everywhere with a kill switch.

## Core Philosophy

- Users **own their messages** cryptographically. The server stores only encrypted blobs it cannot read.
- **Kill switch**: revoke your messages from the server and all other users instantly. Not a "please delete" request — a cryptographic guarantee.
- **Self-hostable**. Anyone can run a ConnectHub server for their community, like running a Minecraft server or a Discord bot server.
- **Zero-knowledge server**. The server operator cannot read messages, even with full database access. E2EE is mandatory, not opt-in.

## What We Take From Discord

- **Spaces** (like servers) — communities with text and voice channels
- **Roles & permissions** — granular control over who can do what
- **Real-time messaging** — WebSocket-based live chat
- **Threaded conversations** — reply chains within channels
- **Familiar UX** — users sign up, join Spaces, chat. No Docker knowledge needed.

## What We Take From Snapchat

- **Ephemeral messages** — auto-delete after configurable time (or after being read)
- **Stories/Status** — temporary posts visible to contacts for a set duration
- **Direct messaging** — private 1:1 conversations with disappearing message support
- **Media-first** — rich support for images, short video, voice messages

## What Makes ConnectHub Different

- **End-to-end encryption (E2EE)** — Signal Protocol with post-quantum (PQXDH), mandatory for all messages
- **Sender-owned messages** — sender holds a LeaseWrappingKey the server never sees. Without it, stored messages are unreadable gibberish.
- **Kill switch** — sender revokes their LeaseWrappingKey, server deletes LeaseKey envelopes. Even if the server keeps the blobs, they're permanently undecryptable.
- **Zero-knowledge server** — server sees encrypted blobs, member public keys, and routing metadata. It cannot read message content, channel names, or Space names.
- **Self-hostable** — one Docker Compose stack = a community server
- **No phone number required** — keypair = identity

## Mental Model

```
Discord / Fluxer:                   ConnectHub:

┌──────────────┐                    ┌──────────────┐
│    SERVER     │                    │    SERVER     │
│              │                    │  (zero-       │
│  Stores ALL  │                    │  knowledge    │
│  messages in │                    │  relay)       │
│  plaintext   │                    │              │
│              │                    │  Stores only  │
│  Server can  │                    │  encrypted    │
│  read        │                    │  blobs it     │
│  everything  │                    │  CANNOT read  │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
  ┌────┴────┐                         ┌────┴────┐
  │ clients │                         │ clients │
  │ (dumb)  │                         │ (smart) │
  └─────────┘                         │ hold all│
                                      │ keys    │
                                      └─────────┘

The server is a dumb relay. Clients hold the crypto.
Server operator cannot read messages even with root access.
```

## Identity Model

**Identity = cryptographic keypair.** Generated on first registration. Your public key is your identity on the network. No phone number, no email required. Users can share their identity via public key, username@server-address, or QR code.

## Architecture Decision: Server + Clients (Option C)

We chose a traditional server/client architecture with a novel encryption layer on top, rather than a peer-to-peer or user-as-node model. Reasons:

1. **Proven, familiar UX** — users sign up and join Spaces, no Docker knowledge needed
2. **Offline delivery works** — server queues encrypted blobs for offline users
3. **Kill switch still works** — sender controls LeaseWrappingKey that the server never has
4. **Self-hosting is for communities** — one admin runs a server for their group, not every user running their own
5. **Scales with proven patterns** — traditional server infrastructure, SQLite, WebSockets

See `02-architecture.md` for full technical details.
