# ConnectHub — Encrypted Lease Protocol (Message Ownership)

## The Core Problem

In traditional E2EE messaging (Signal, Matrix, WhatsApp), once a message is delivered and decrypted, the sender loses control. The recipient's device has the plaintext, and the server has an encrypted blob the recipient can always decrypt. There is no revocation mechanism.

ConnectHub's defining feature is **cryptographically enforced message ownership** — the sender retains a key that is required to decrypt messages, and can destroy that key at any time (kill switch).

## How It Works (Option C: Server + Clients)

The Encrypted Lease Protocol adds a third encryption layer on top of standard E2EE. Messages are encrypted normally with the Signal Protocol or MLS, but the decryption keys are **wrapped** in an additional envelope that only the sender can control.

### Encryption Layers

```
Layer 1: Content encryption (Signal Protocol / MLS Sender Key)
  → Standard E2EE. Server can't read content.

Layer 2: LeaseKey envelope (ConnectHub's addition)
  → The key needed to unlock Layer 1 is wrapped in an envelope
  → The envelope is encrypted with the sender's LeaseWrappingKey
  → The envelope is pre-uploaded to the server alongside the message
  → Recipients unwrap the envelope using the MLS group key

Layer 3: LeaseWrappingKey (sender's master control)
  → Lives ONLY on the sender's client device(s)
  → Server NEVER sees this key
  → Destroying this key = permanently revoking all messages
```

### Message Send Flow

```
Alice sends "hey everyone" to #general:

Alice's Client                        Server                     Bob's Client
     │                                  │                             │
     │  1. Encrypt content with         │                             │
     │     SenderKey (MLS)              │                             │
     │     → EncryptedBlob              │                             │
     │                                  │                             │
     │  2. Generate MessageKey_N        │                             │
     │                                  │                             │
     │  3. Wrap MessageKey_N in         │                             │
     │     LeaseEnvelope using:         │                             │
     │     - Alice's LeaseWrappingKey   │                             │
     │     - MLS group key (so members  │                             │
     │       can unwrap)                │                             │
     │     → LeaseEnvelope              │                             │
     │                                  │                             │
     │  4. Upload both:                 │                             │
     │  ───────────────────────────────►│                             │
     │  { EncryptedBlob,                │  5. Store both.             │
     │    LeaseEnvelope,                │     Can't read either.      │
     │    channel_id, timestamp }       │                             │
     │                                  │  6. Route to Bob:           │
     │                                  │ ───────────────────────────►│
     │                                  │                             │
     │                                  │     7. Unwrap LeaseEnvelope │
     │                                  │        with MLS group key   │
     │                                  │        → get MessageKey_N   │
     │                                  │                             │
     │                                  │     8. Decrypt EncryptedBlob│
     │                                  │        → "hey everyone" ✅  │
```

### Kill Switch Flow

```
Alice activates kill switch:

Alice's Client                        Server                     Bob's Client
     │                                  │                             │
     │  1. Send REVOKE command          │                             │
     │  ───────────────────────────────►│                             │
     │                                  │  2. Delete all of Alice's   │
     │  3. Destroy LeaseWrappingKey     │     LeaseEnvelopes          │
     │     locally (permanent)          │                             │
     │                                  │  3. Broadcast REVOKE to     │
     │                                  │     all connected clients   │
     │                                  │ ───────────────────────────►│
     │                                  │                             │
     │                                  │     4. Invalidate cached    │
     │                                  │        LeaseKeys from Alice │
     │                                  │                             │
     │                                  │     5. Alice's messages     │
     │                                  │        now show as          │
     │                                  │        [message revoked]    │

State after kill switch:

  Server has: Alice's EncryptedBlobs (unreadable without LeaseEnvelopes)
  Server has: NO LeaseEnvelopes (deleted)
  Bob has:    NO valid LeaseKeys (expired/invalidated)
  Alice has:  NO LeaseWrappingKey (destroyed)

  Even if server kept LeaseEnvelopes (malicious):
    → They're encrypted with Alice's LeaseWrappingKey
    → That key is destroyed
    → Envelopes are permanently unreadable

  Double protection: cooperative deletion + cryptographic revocation
```

### What Users See

```
NORMAL:                              AFTER ALICE'S KILL SWITCH:

#general                             #general

  Alice: hey everyone                  [message revoked]
  Bob:   what's up                     Bob:   what's up
  Alice: anyone want to play?          [message revoked]
  Carol: I'm down                      Carol: I'm down
  Alice: let's go                      [message revoked]

Alice's messages: gone.
Bob's and Carol's messages: unaffected (their own LeaseWrappingKeys).
```

## Why This Works (Trust Model)

| Threat | Protection |
|---|---|
| Server operator reads database | E2EE — server has only encrypted blobs |
| Server ignores delete command | LeaseWrappingKey destroyed on client — envelopes unreadable regardless |
| Recipient caches LeaseKeys | Keys have TTL, expire naturally. Kill switch broadcast invalidates caches immediately. |
| Recipient screenshots/copies plaintext | Same limitation as ALL E2EE systems. You can't un-show something already displayed. |
| Attacker compromises server | Gets encrypted blobs + encrypted envelopes. Both useless without client keys. |

## Offline Delivery (No Sender Online Requirement)

**Critical design decision:** The sender does NOT need to be online for recipients to read messages. LeaseKey envelopes are pre-uploaded to the server at send time.

```
Alice sends message at 2:00 PM, goes to sleep.
Bob comes online at 5:00 AM (different timezone, 3 days later).

  1. Bob connects to server
  2. Server delivers queued: EncryptedBlob + LeaseEnvelope
  3. Bob unwraps LeaseEnvelope with MLS group key
  4. Bob decrypts message
  5. Bob reads "hey everyone" ✅

Alice was asleep the entire time. No interaction needed.
```

## Lease TTL Configuration

LeaseKey envelopes have a TTL (time-to-live) set by the Space admin at creation:

```
Space Settings → Lease TTL:

  "1h"    → high security (messages expire 1 hour after send)
  "24h"   → balanced
  "7d"    → casual community (DEFAULT)
  "30d"   → archive-friendly
  "none"  → no expiry (messages permanent until kill switch)

TTL applies to LeaseEnvelopes on the server.
After TTL expires, server auto-deletes the envelope.
EncryptedBlob becomes unreadable (no key).

Kill switch overrides TTL — immediate revocation regardless of setting.
```

## 1:1 Direct Messages

For DMs, the same lease model applies but using Signal Protocol instead of MLS:

```
Alice DMs Bob:

  1. Message encrypted with Signal Protocol (X3DH + Double Ratchet + PQXDH)
  2. LeaseKey envelope wraps the decryption key
  3. Both uploaded to server
  4. Bob decrypts as normal

  Kill switch on DMs:
  - Alice can revoke all DM messages sent to Bob (or all DMs to everyone)
  - Granular: per-conversation or global kill switch
```

## Media / Attachments

```
Alice shares a screenshot in #general:

  1. Generate random AES key for the file
  2. Encrypt file locally → upload encrypted blob to server
  3. Include file's AES key inside the message content
  4. Message is encrypted with Sender Key + LeaseKey as normal

  Server stores: encrypted file blob (opaque, can't read)
  Kill switch: message revoked → file key lost → file undecryptable

  Media follows the same ownership model as text.
```
