# ConnectHub — Architecture

## Overview

ConnectHub uses a **traditional server/client architecture** where the server is a **zero-knowledge relay**. The server routes encrypted messages, manages membership, and stores encrypted blobs — but cannot read any message content. All encryption and decryption happens on clients. The sender retains cryptographic control over their messages via the Encrypted Lease Protocol.

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   ConnectHub SERVER                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Server (Bun + Hono/Elysia)                  │   │
│  │  - REST API for account, Space, channel mgmt     │   │
│  │  - WebSocket gateway for real-time messaging     │   │
│  │  - Prekey distribution (for E2EE session setup)  │   │
│  │  - MLS group state management                    │   │
│  │  - Stores encrypted blobs + LeaseKey envelopes   │   │
│  │  - CANNOT decrypt any content                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   SQLite     │  │   coturn     │  │   LiveKit    │  │
│  │   (data)     │  │   (TURN)     │  │   (SFU)      │  │
│  │              │  │              │  │              │  │
│  │  Encrypted   │  │  NAT         │  │  Voice/video │  │
│  │  blobs,      │  │  traversal   │  │  group calls │  │
│  │  metadata,   │  │  for WebRTC  │  │  (V2)        │  │
│  │  public keys │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└──────────────────────────┬───────────────────────────────┘
                           │ TLS + WebSocket
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
       ┌────────┐    ┌────────┐    ┌────────┐
       │ Alice  │    │  Bob   │    │ Carol  │
       │ Client │    │ Client │    │ Client │
       │        │    │        │    │        │
       │ Keys:  │    │ Keys:  │    │ Keys:  │
       │ - IK   │    │ - IK   │    │ - IK   │
       │ - MLS  │    │ - MLS  │    │ - MLS  │
       │ - Lease│    │ - Lease│    │ - Lease│
       │   Wrap │    │   cache│    │   cache│
       └────────┘    └────────┘    └────────┘
```

## What the Server Stores vs. Cannot Read

| Server Stores | Server CANNOT Read |
|---|---|
| Member public keys | Message content |
| Channel IDs | Channel names, topics |
| SpaceIDs | Space names, descriptions, icons |
| Encrypted message blobs | Anything decrypted |
| LeaseKey envelopes (encrypted) | LeaseKeys themselves |
| MLS tree state (public keys only) | MLS group secrets |
| Prekeys (public, for E2EE setup) | Private keys (never leave client) |
| Routing metadata (who, when, which channel) | Plaintext of any content |
| Encrypted media blobs | Media content |

**Even with full database access and root on the server, an operator sees only encrypted blobs and routing metadata.**

## Encryption Layers

Three layers protect messages in a Space:

```
Layer 1: MLS Group Key (RFC 9420)
  - Manages group membership cryptographically
  - O(log n) cost for member join/leave/ban (TreeKEM)
  - All current members share a group key
  - Server holds only public tree state

Layer 2: Sender Keys (per-member, per-Space)
  - Each member has a Sender Key for encrypting their messages
  - Distributed via MLS (not pairwise — scales to large groups)
  - Ratchets forward per message (forward secrecy)
  - Re-keyed when a member leaves/is banned

Layer 3: LeaseKey (ConnectHub's kill switch layer)
  - Sender encrypts the message with a MessageKey
  - MessageKey is wrapped in a LeaseKey envelope
  - LeaseKey envelope is encrypted with sender's LeaseWrappingKey
  - LeaseKey envelope is pre-uploaded to server alongside the message
  - Server stores the envelope but cannot unwrap it
  - Kill switch = destroy LeaseWrappingKey → envelopes become unreadable

For 1:1 DMs: Signal Protocol (X3DH + Double Ratchet + PQXDH) + LeaseKey layer
For Spaces:  MLS + Sender Keys + LeaseKey layer
```

## Message Flow

### Sending a Message

```
Alice sends "gg ez" to #general:

Alice's Client:
  1. Encrypt "gg ez" with SenderKey_Alice (ratchets forward)
     → produces EncryptedBlob

  2. Generate MessageKey for this message
  3. Wrap MessageKey in LeaseKey envelope
     (encrypted with Alice's LeaseWrappingKey)
     → produces LeaseEnvelope

  4. Send to server:
     { channel_id, EncryptedBlob, LeaseEnvelope, timestamp }

Server:
  5. Stores EncryptedBlob + LeaseEnvelope in SQLite
  6. Routes to all online members via WebSocket
  7. Queues for offline members (delivered when they reconnect)

Bob's Client:
  8. Receives EncryptedBlob + LeaseEnvelope
  9. Unwraps LeaseEnvelope using MLS group key
     → gets MessageKey
  10. Decrypts EncryptedBlob using SenderKey_Alice + MessageKey
     → sees "gg ez" ✅
```

### Kill Switch

```
Alice hits kill switch:

Alice's Client:
  1. Sends REVOKE command to server
  2. Destroys her LeaseWrappingKey locally

Server (cooperative):
  3. Deletes all of Alice's LeaseEnvelopes
  4. Broadcasts REVOKE event to all members

All other clients:
  5. Invalidate any cached LeaseKeys from Alice
  6. Alice's EncryptedBlobs remain on server but are
     now permanently undecryptable (no LeaseEnvelope = no key)

Even if server is malicious and keeps LeaseEnvelopes:
  - They're encrypted with Alice's LeaseWrappingKey
  - Alice destroyed that key
  - Envelopes are unreadable regardless
```

### Offline Delivery

```
Alice sends message, Bob is offline:

  1. Alice's client encrypts + sends to server (same as above)
  2. Server stores EncryptedBlob + LeaseEnvelope
  3. Server notes: "Bob hasn't received msg_42 yet"

  3 days later, Bob comes online:

  4. Bob's client connects via WebSocket
  5. Server delivers all queued messages (encrypted blobs + envelopes)
  6. Bob decrypts as normal ✅

  Alice did NOT need to be online. The LeaseEnvelope was
  pre-uploaded at send time. Bob has everything he needs.
```

## Tech Stack

| Component | Tech | Role |
|-----------|------|------|
| API Server | Bun + Hono/Elysia | HTTP API + WebSocket gateway |
| Database | SQLite (WAL mode) | Encrypted blobs, metadata, public keys |
| Frontend | TypeScript + Tailwind CSS | Web client, holds all crypto keys |
| E2EE (1:1) | 2key-ratchet (pure TS, WebCrypto) | X3DH + Double Ratchet for DMs |
| E2EE (groups) | ts-mls (pure TS, WebCrypto) | MLS (RFC 9420) for group key management |
| Frontend UI | React | Discord-like SPA, component library |
| Lease layer | Custom (AES-256-GCM + HKDF) | LeaseKey wrapping/unwrapping |
| Real-time | WebSockets (native Bun) | Live message delivery, presence |
| Voice/Video | WebRTC + coturn | Standard DTLS-SRTP, P2P or relayed |
| Group calls | LiveKit (V2) | SFU for 5+ participants |
| Deployment | Docker Compose | Server + coturn + (optional) LiveKit |

## Voice & Video

Voice and video are real-time and ephemeral — no lease keys, no ownership layer. Standard WebRTC encryption (DTLS-SRTP) is sufficient, same as Discord.

```
1:1 Calls:
  - WebRTC peer connection between clients
  - STUN for direct connection when possible
  - coturn TURN relay for NAT traversal
  - Signaling via server WebSocket (SDP offer/answer exchange)
  - DTLS-SRTP encrypted media stream

Voice Channels (persistent, join/leave):
  - Same as 1:1 but with multiple participants
  - Mesh topology for 2-4 participants
  - LiveKit SFU for 5+ participants (V2)
  - No recording, no persistence — call ends, data is gone

V1: 1:1 voice calls + voice channels (mesh, small groups)
V2: LiveKit SFU for large group calls, video, screen sharing
```

## Multi-Device Support

```
Alice has phone + desktop + tablet:

  All devices connect to the same ConnectHub server
  with the same account (public key identity).

  Each device is a separate E2EE session target:
  - Each device has its own prekeys on the server
  - Messages are encrypted per-device and fanned out
  - Signal Protocol handles per-device key management

  For MLS groups:
  - Each device is a separate leaf in the MLS tree
  - MLS handles multi-device natively

  Limit: 5 devices per account (same as Signal)
```

## Deployment

### Self-Hosted Community Server

```yaml
# docker-compose.yml
services:
  connecthub:
    image: connecthub/server
    ports:
      - "443:443"
      - "3478:3478/udp"   # coturn STUN/TURN
    volumes:
      - ./data:/data       # SQLite database
    environment:
      - DOMAIN=chat.mycommunity.com
      - REGISTRATION=invite  # or "open"

  coturn:
    image: coturn/coturn
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/turnserver.conf
```

### Server Admin Powers and Limits

```
Server admin CAN:
  ✅ Create/delete Spaces and channels
  ✅ Manage registration (open, invite-only, closed)
  ✅ Set resource limits (storage quotas, rate limits)
  ✅ Ban users from the server
  ✅ View metadata (who is a member, when they connected)
  ✅ Hide messages in Spaces (moderation)

Server admin CANNOT:
  ❌ Read message content (E2EE)
  ❌ Read channel or Space names (encrypted config)
  ❌ Forge messages from other users
  ❌ Bypass the kill switch (LeaseWrappingKey is client-side)
  ❌ Access users' private keys
```
