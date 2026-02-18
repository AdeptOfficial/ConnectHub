# ConnectHub — Encrypted Lease Protocol (Message Ownership)

## The Core Problem

In traditional federated/P2P messaging, once a message is sent, the sender loses control. The recipient's server/device holds a copy and the sender cannot revoke it. ConnectHub's defining feature is **cryptographically enforced message ownership** — the sender retains control even after delivery.

## The Encrypted Lease Model

This is ConnectHub's core invention. No existing project implements this.

### How It Works

```
Alice's Node                          Bob's Node
┌─────────────┐    encrypted blob    ┌─────────────┐
│ SQLite DB   │ ──────────────────►  │ SQLite DB    │
│ (permanent) │                      │ (encrypted   │
│ + holds     │    lease renewal     │  blobs only) │
│   decrypt   │ ──────────────────►  │ + needs key  │
│   keys      │                      │   from Alice │
└─────────────┘                      └──────────────┘
```

1. **Alice sends a message** — it's encrypted with a per-message key and sent as an opaque blob to Bob's node
2. **Bob's node stores the blob** — but cannot decrypt it without Alice's cooperation
3. **Decryption keys are "leased"** — Alice's node must be reachable for Bob to decrypt
4. **Alice kills switch** → keys stop being served → blobs become unreadable
5. **Bob's node auto-deletes** expired/unreadable blobs after a grace period

### Key Architecture

```
Per-message encryption:
  MessageKey_N = HKDF(SenderMasterKey, message_id, "content")
  EncryptedBlob = AES-256-GCM(MessageKey_N, plaintext)

Lease mechanism:
  - Bob's client requests decryption key from Alice's node per-message (or per-batch)
  - Alice's node validates Bob's session, checks kill switch status
  - If active: returns MessageKey_N (encrypted via the Double Ratchet session)
  - If killed: returns nothing / connection refused
  - Keys can be cached on Bob's device for a TTL (e.g., 5 minutes)
  - Cache expiry forces re-fetch from Alice's node

Kill switch:
  1. Alice triggers kill switch on her node
  2. Node broadcasts REVOKE to all connected peers
  3. Node stops serving lease keys
  4. All cached keys on peer devices expire
  5. Encrypted blobs become unreadable
```

### What Bob Sees

```
CONNECTED STATE:                    KILL SWITCH ACTIVATED:

Bob's screen:                       Bob's screen:

  Alice: Hey how's it going?          [Alice is disconnected]
  Alice: Check out this pic           [No message history visible]
  You:   Looks great!                 You:   Looks great!
  Alice: Thanks!
                                    Alice's messages = GONE
                                    Bob keeps only HIS own messages
```

### Why This Works (Trust Model)

- Bob **cannot** read Alice's messages without Alice's active cooperation
- This is NOT "trust Bob to delete" — it's "Bob literally cannot decrypt without Alice"
- Even if Bob patches his node to ignore revoke commands, he still can't read the blobs
- The only attack vector is Bob screenshotting/copying plaintext while the lease is active (same limitation as any E2EE system — you can't prevent screenshots)

### Comparison to Other Approaches

**Approach 1: Live Stream (RAM only)**
- Messages never stored on peer, only displayed in real-time
- Problem: Bob can't see history when Alice is offline
- Too restrictive for Discord-like UX

**Approach 2: Encrypted Lease (our choice)**
- Blobs stored on peer, keys served on-demand
- Bob sees history while Alice is online
- Kill switch = stop serving keys
- Best balance of UX and privacy

**Approach 3: Revocable Storage**
- Messages stored on peer with revoke commands
- Problem: requires trusting peer to honor revoke
- Bob could patch his node to ignore revokes

## Edge Cases

### Alice's Node Goes Down Temporarily
- Bob's cached keys continue working for their TTL
- After TTL expiry, Alice's messages show as "sender offline — messages temporarily unavailable"
- When Alice comes back, keys are re-served and messages reappear
- This distinguishes a kill switch (intentional) from downtime (temporary)

### Grace Period for Temporary Outages
- Lease keys can have a longer TTL for "trusted" contacts
- Configurable per-contact: "allow 1 hour offline grace" vs "immediate revoke"
- Kill switch overrides all grace periods (immediate revoke signal)

### Group Spaces
- Each member's messages are independently leased
- If Alice kills switch in a group, only her messages vanish
- Other members' messages remain readable
- The Space config itself is replicated and persists

### Media/Attachments
- Media encrypted with a separate content key (like Signal's CDN model)
- Content key is included in the leased message payload
- Kill switch = media also becomes undecryptable
- Peer nodes can choose to cache encrypted media blobs or fetch on-demand
