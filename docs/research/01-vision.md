# ConnectHub — Vision & Core Concept

## What Is ConnectHub?

A privacy-first, self-hosted messaging platform where **every user runs their own node**. Think Discord meets Snapchat, but you own everything — your messages, your data, your identity.

## Core Philosophy

- Users **own their messages**. Messages are stored on the sender's node, not replicated across the network.
- **Kill switch**: disconnect and your messages vanish from every other node instantly.
- **No central authority**. Each node is sovereign. Nodes connect to each other in a mesh topology.
- **Self-hosted by design**. One Docker container = one identity.

## What We Take From Discord

- **Spaces** (like servers) — communities with channels (text, voice, media)
- **Roles & permissions** — granular control over who can do what
- **Real-time messaging** — WebSocket-based live chat
- **Threaded conversations** — reply chains within channels

## What We Take From Snapchat

- **Ephemeral messages** — auto-delete after configurable time (or after being read)
- **Stories/Status** — temporary posts visible to contacts for a set duration
- **Direct messaging** — private 1:1 conversations with disappearing message support
- **Media-first** — rich support for images, short video, voice messages

## What Makes ConnectHub Different

- **End-to-end encryption (E2EE)** — Signal Protocol with post-quantum (PQXDH)
- **Self-hosted = self-owned** — each node is a Docker container on your hardware
- **Message ownership** — sender holds decryption keys; peers only hold encrypted blobs
- **Kill switch** — revoke all your messages from the network instantly
- **No phone number required** — keypair = identity
- **Multi-tenant hosting** — friends can host nodes for friends who lack resources
- **Node migration** — move your identity between hosts without losing anything

## Mental Model

```
Traditional Discord/Matrix:        ConnectHub:

   ┌──────────┐                  ┌──────┐   ┌──────┐
   │  SERVER   │                  │ User │◄─►│ User │
   │          │                  │ Node │   │ Node │
   │ All data │                  └──┬───┘   └──┬───┘
   │ lives    │                     │          │
   │ here     │                     ▼          ▼
   └────┬─────┘                  ┌──────┐   ┌──────┐
        │                        │ User │◄─►│ User │
   ┌────┴─────┐                  │ Node │   │ Node │
   │ clients  │                  └──────┘   └──────┘
   └──────────┘
                                 Every user IS a server.
                                 No central authority.
```

## Identity Model

**Identity = cryptographic keypair.** Your public key is your address on the network. Your node is where that identity currently lives. The node can move between hosts without losing anything — to other nodes, you just changed IP. Your identity (public key) stays the same.
