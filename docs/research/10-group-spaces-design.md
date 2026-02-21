# ConnectHub — Group Spaces Design

## Overview

Spaces are ConnectHub's equivalent of Discord servers — communities with text channels, voice channels, roles, and permissions. The key difference: the server storing Space data cannot read any content. All Space metadata (name, channel names, topics) and messages are end-to-end encrypted.

## Creating a Space

```
Alice creates "Gaming Group":

Alice's Client:
  1. Generate SpaceID (random UUID)
  2. Generate Space Master Key (SMK) — 32-byte random key
  3. Create Space config:
     { name: "Gaming Group", description: "GG", channels: [#general, #memes] }
  4. Encrypt config with SMK → EncryptedConfig
  5. Initialize MLS group (Alice is first leaf in the tree)
  6. Send to server:
     { SpaceID, EncryptedConfig, MLS initial state, Alice's public key }

Server:
  7. Creates Space record
  8. Stores EncryptedConfig (can't read it)
  9. Stores MLS tree state (public keys only)
  10. Creates channel routing (knows channel IDs, not names)
```

### What the Server Knows About a Space

```
Server sees:                          Server CANNOT see:
─────────────                         ──────────────────
SpaceID: "abc-123-def"                Name: "Gaming Group"
Channel IDs: ["ch1", "ch2"]          Channel names: ["#general", "#memes"]
Members: [pubkey_alice, pubkey_bob]   Description, icon, topics
Creation date                         Any message content
Message counts per channel            What members are discussing
```

## Inviting Members

```
Alice invites Bob:

  1. Alice creates invite token on server
  2. Alice shares invite link: https://chat.server.com/invite/xyz789
     (out of band: text message, email, QR code, etc.)

  3. Bob clicks link → registers on server (if not already) → joins Space

  4. Server adds Bob's public key to Space membership
  5. Server notifies Alice: "Bob joined"

  6. Alice's client sends to Bob via 1:1 E2EE (Signal Protocol):
     - Space Master Key (SMK)
     - Current MLS Welcome message (adds Bob to MLS group)

  7. Bob's client:
     - Decrypts Space config with SMK → sees "Gaming Group", #general, #memes
     - Joins MLS group → can now participate in group encryption
     - Receives Sender Keys from all existing members (via MLS)

  8. History access (per Space setting):
     - "from_join": Bob sees only new messages
     - "7d" (default): existing members re-encrypt their last 7 days of
       message keys so Bob can read them
     - "30d": last 30 days
     - "full": all history (admin re-encrypts all historical keys for Bob)
```

## Group Encryption: MLS + Sender Keys

### Why MLS (RFC 9420)?

Naive group encryption requires every member to exchange keys with every other member: O(n²). For a 500-member Space, that's 248,502 pairwise key exchanges on every membership change.

MLS uses a **TreeKEM** structure — a binary tree of keys where each leaf is a member. Membership changes only update the path from the affected leaf to the root: **O(log n)**.

```
MLS Key Tree (8 members):

                        Group Key
                       /          \
                  Left              Right
                 /    \            /     \
               /\      /\        /\      /\
              A  B    C  D      E  F    G  H

Member D is banned:
  → Update path: D → (C,D) → Left → Group Key
  → That's 3 key updates, broadcast once
  → Not 7 × 6 = 42 pairwise exchanges

500 members, 1 ban:
  → ~9 key updates (log₂ 500 ≈ 9)
  → 1 broadcast message (~1-2 KB)
```

### Sender Keys (Per-Message Encryption)

On top of the MLS group key, each member has a Sender Key:

```
1. Alice generates SenderKey_Alice (symmetric key + ratchet state)
2. Distributes SenderKey_Alice to all members via MLS
   (one MLS message, not n pairwise messages)
3. Each message Alice sends:
   - Encrypted with SenderKey_Alice (ratchets forward)
   - SenderKey provides forward secrecy per message
4. Server fans out the same ciphertext to all members
   (encrypt once, not once per recipient)
```

### LeaseKey Layer (Kill Switch)

On top of Sender Keys, the LeaseKey layer adds sender ownership:

```
Full encryption stack per message:

  Plaintext
    → Encrypted with SenderKey_Alice (Layer 2: forward secrecy)
    → MessageKey wrapped in LeaseEnvelope (Layer 3: sender ownership)
    → LeaseEnvelope encrypted with Alice's LeaseWrappingKey
    → Both EncryptedBlob + LeaseEnvelope uploaded to server

  To read: need SenderKey (from MLS) + LeaseKey (from envelope)
  To revoke: destroy LeaseWrappingKey → envelopes unreadable
```

## Member Lifecycle

### Member Joins

```
1. Invited member joins Space
2. Added as new leaf in MLS tree
3. MLS commit message updates tree (O(log n))
4. All members update their local MLS state
5. New member receives:
   - Space Master Key (SMK) via 1:1 E2EE
   - MLS Welcome message
   - Sender Keys from all existing members (via MLS)
   - Historical message keys (per history_visibility setting)
6. New member generates their own Sender Key, distributes via MLS
```

### Member Leaves Voluntarily

```
1. Member sends "leave" to server
2. Server removes member from Space
3. MLS tree updated, member's leaf removed
4. MLS commit broadcast to remaining members (O(log n))
5. ALL remaining members generate new Sender Keys (via MLS)
6. Departed member:
   - Can't read new messages (doesn't have new Sender Keys)
   - Cached LeaseKeys for old messages expire naturally (TTL)
   - Can't request new LeaseKeys (no longer a member, server won't route)
```

### Member Banned

```
1. Admin sends "ban user X" to server
2. Server removes member immediately + blocks re-join
3. Same MLS re-key process as voluntary leave
4. Additionally: server can immediately stop routing any queued messages
5. Banned member loses access to both new and old messages (LeaseKeys expire)
```

### Member Hits Kill Switch

```
1. Alice activates kill switch
2. Alice's LeaseWrappingKey destroyed
3. Server deletes Alice's LeaseEnvelopes
4. REVOKE broadcast to all members
5. Only Alice's messages are affected
6. Other members' messages remain fully readable
7. Space continues to function normally
8. Alice is effectively removed from the Space
```

## History Visibility

Configured per Space at creation (admin can change later):

| Setting | New Member Sees | How It Works |
|---|---|---|
| `from_join` | Nothing before join date | No historical keys shared |
| `7d` (DEFAULT) | Last 7 days | Existing members re-encrypt last 7d of message keys for new member |
| `30d` | Last 30 days | Same, 30 day window |
| `full` | Everything | All historical message keys re-encrypted for new member |

### How History Re-encryption Works

```
Eve joins Space with history_visibility: 7d

  Server tells existing members: "Eve joined, share 7d history keys"

  Alice's client:
    → Looks at her messages from last 7 days in this Space
    → Re-wraps those MessageKeys so Eve can decrypt them
    → Sends re-wrapped key bundle to Eve via MLS

  Bob's client: same for his messages
  Carol's client: same for her messages

  Eve's client:
    → Receives key bundles from all active members
    → Can now decrypt messages from the last 7 days
    → Messages older than 7 days: no keys, can't read

  Cost: each member re-wraps only THEIR OWN recent messages.
        Not every message ever sent.
```

## Moderation

### Admin Tools

| Action | What Happens | Cryptographic? |
|---|---|---|
| **Hide message** | Server marks message as hidden. All official clients stop displaying it. Encrypted blob persists. | No — UI-level only. Modified clients could ignore. |
| **Ban member** | Server removes member. MLS re-key. Member loses all access. | Yes — MLS re-key means banned member cryptographically cannot read new messages. LeaseKeys for old messages expire. |
| **Mute member** | Server stops routing messages from muted member to channel. | No — server-level routing block. |
| **Change roles** | Server updates role metadata. Clients enforce permission checks. | No — role enforcement is server + client side. |

### What Admins CANNOT Do

- Read encrypted message content (E2EE)
- Delete another user's encrypted blobs (ownership model)
- Bypass another user's kill switch
- Forge messages as another user
- Access another user's private keys

### Moderation Philosophy

Admins control **visibility and access** (who can post, who can see, who is banned). They do NOT control **content** (can't read, can't modify, can't truly delete). This is a feature, not a limitation — it means the admin can't be compelled to hand over message content they don't have.

## Channel Types

### Text Channels
- E2EE with MLS + Sender Keys + LeaseKeys
- Persistent message history (within lease TTL)
- Media sharing (encrypted, lease-controlled)
- Threaded replies (V2)

### Voice Channels
- Standard WebRTC with DTLS-SRTP
- No E2EE lease layer (real-time, ephemeral)
- Join/leave model (persistent channel, temporary participation)
- Mesh for small groups, LiveKit SFU for 5+ (V2)
- No recording, no persistence

### Announcement Channels (V2)
- Only admins/specific roles can post
- Members can read (with valid LeaseKeys)
- Same encryption model as text channels
