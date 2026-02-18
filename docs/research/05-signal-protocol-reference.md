# ConnectHub — Signal Protocol Reference

## Overview

The Signal Protocol is the gold standard for asynchronous E2EE messaging. ConnectHub will use `libsignal` (Rust core with TypeScript bindings) rather than implementing crypto from scratch.

This document captures how Signal works for reference during implementation.

## Protocol Components

### X3DH — Extended Triple Diffie-Hellman (Session Setup)

Allows Alice to establish an encrypted session with Bob **even if Bob is offline**.

**Key types per identity:**

```
IK  — Identity Key      (long-term Curve25519, persistent)
SPK — Signed PreKey      (medium-term Curve25519, rotated ~weekly, signed by IK)
OPK — One-Time PreKey    (single-use Curve25519, batch uploaded)
EK  — Ephemeral Key      (generated fresh per session by sender)
```

**Key agreement (Alice → Bob):**

```
Alice fetches from Bob's node:
  Bob's IK_B, SPK_B (verified signature), OPK_B (if available)

Alice generates: EK_A

4 DH operations:
  DH1 = DH(IK_A,  SPK_B)   — mutual authentication
  DH2 = DH(EK_A,  IK_B)    — mutual authentication
  DH3 = DH(EK_A,  SPK_B)   — forward secrecy
  DH4 = DH(EK_A,  OPK_B)   — per-session uniqueness (optional)

Master Secret = KDF(DH1 || DH2 || DH3 || DH4)
```

**ConnectHub adaptation:** In Signal, prekeys are uploaded to a central server. In ConnectHub, each node serves its own prekeys. When Alice wants to connect to Bob, she fetches prekeys directly from Bob's node.

### PQXDH — Post-Quantum Extension (2023)

Adds ML-KEM-1024 (Kyber) key encapsulation on top of X3DH:

```
Additional prekey: PQSPK (ML-KEM-1024 key pair, signed by IK)
Additional operation: (CT, SS_pq) = ML-KEM.Encapsulate(PQSPK_B)

Final master: KDF(DH1 || DH2 || DH3 || DH4 || SS_pq)
```

Protects against "harvest now, decrypt later" quantum attacks. We should include this from day one.

### Double Ratchet (Ongoing Encryption)

Every message uses a unique key via two interlocked ratchets:

**Symmetric ratchet (per-message keys):**

```
For each message:
  MessageKey_N = HMAC(ChainKey_N, 0x01)   — encrypt message N
  ChainKey_N+1 = HMAC(ChainKey_N, 0x02)   — advance chain

Delete MessageKey_N after use → forward secrecy
```

**DH ratchet (per-exchange keys):**

```
On each reply:
  New DH exchange with fresh ephemeral keys
  NewRootKey, NewChainKey = KDF(RootKey, DH(my_ephemeral, their_ephemeral))

→ break-in recovery (post-compromise security)
```

| Property | Mechanism |
|---|---|
| Forward secrecy (past messages safe) | Symmetric ratchet — old keys deleted |
| Break-in recovery (future safe) | DH ratchet — new keys from fresh DH |
| Out-of-order handling | Skipped-message key buffer |

### Sender Keys (Group Optimization)

For groups, individual Double Ratchet per member is O(n*d). Sender Keys reduce this:

```
1. Each sender generates a Sender Key (symmetric key + ratchet)
2. Distributes Sender Key to all members via 1:1 E2EE (once per session)
3. Group messages encrypted once with Sender Key
4. All members decrypt with that key
5. Sender Key ratchets forward per message (forward secrecy)
6. On member departure → all remaining members re-key
```

**Trade-off:** Sender Keys provide forward secrecy but NOT break-in recovery within a session. Re-keying on member departure restores security.

### Sealed Sender (Metadata Protection)

Hides sender identity from routing infrastructure:

```
Normal envelope:     FROM: Alice, TO: Bob, PAYLOAD: [ciphertext]
Sealed envelope:     TO: Bob, PAYLOAD: [opaque blob containing encrypted sender identity]
```

**ConnectHub adaptation:** Node-to-node traffic could reveal social graph (who talks to whom). Consider sealed sender for node-to-node connections, or route through optional relay nodes.

## Cipher Suite

```
Key agreement:     Curve25519 + ML-KEM-1024
KDF:               HKDF-SHA256
Message AEAD:      AES-256-GCM or ChaCha20-Poly1305
Header encryption: AES-CBC
MAC:               HMAC-SHA256
```

## Key Storage

Signal uses SQLCipher-encrypted SQLite for key storage on all platforms. ConnectHub does the same — the node's SQLCipher DB holds all Signal Protocol state.

```
Android:  SQLCipher DB, key sealed by Android Keystore
iOS:      Keychain (IK) + SQLCipher DB
Desktop:  SQLCipher DB, key from OS credential store
ConnectHub Node: SQLCipher DB, key derived from user passphrase (Argon2id)
```

## What Signal's Server Stores vs. Doesn't

| Stores | Doesn't Store |
|---|---|
| Phone→UUID mapping | Message content |
| Public prekeys | Who messages whom (Sealed Sender) |
| Encrypted profile blobs | Conversation history |
| Queued encrypted messages (until delivered) | Contact lists |
| Account metadata | Group membership (Groups v2 encrypted) |

Signal has responded to federal subpoenas and could only provide: registration timestamp + last connection date. The architecture enforces this.

## Media/Attachments (Signal's Approach)

```
Upload:
1. Generate random AES key + HMAC key
2. Encrypt attachment locally
3. Upload ciphertext to CDN
4. Include attachment ID + decryption key inside E2EE message

Download:
1. Decrypt message → extract attachment ID + key
2. Fetch encrypted blob from CDN
3. Decrypt with key

CDN sees: opaque blobs. No plaintext, no association to users.
Retention: 30 days, then deleted.
```

**ConnectHub adaptation:** Each node acts as its own "CDN" for media. Encrypted media blobs stored on sender's node, decryption key included in leased message payload. Kill switch = media also undecryptable.

## Open Source Libraries We Can Use

| Library | Language | What It Does |
|---|---|---|
| `signalapp/libsignal` | Rust + TS/Kotlin/Swift bindings | Full protocol implementation |
| `signalapp/Signal-Calling-Service` | Rust | SFU for group calls |
| `signalapp/ringrtc` | Rust/C++ | WebRTC wrapper |

## Key Design Decisions for ConnectHub

1. **Use `libsignal` directly** — don't reimplement crypto
2. **Nodes serve their own prekeys** — no central key distribution server
3. **Include PQXDH from day one** — ML-KEM-1024 is NIST standardized
4. **Sender Keys for groups** — re-key on member departure
5. **SQLCipher for all key/data storage** — passphrase-derived encryption key
6. **Plan for sealed sender** between nodes to protect social graph metadata

## References

- X3DH spec: signal.org/docs/specifications/x3dh/
- Double Ratchet spec: signal.org/docs/specifications/doubleratchet/
- PQXDH spec: signal.org/docs/specifications/pqxdh/
- SESAME (multi-device): signal.org/docs/specifications/sesame/
- XEdDSA: signal.org/docs/specifications/xeddsa/
- libsignal source: github.com/signalapp/libsignal
- Signal-Server source: github.com/signalapp/Signal-Server
- Signal Calling Service: github.com/signalapp/Signal-Calling-Service
- NIST FIPS 203 (ML-KEM): csrc.nist.gov/pubs/fips/203/final
- zkgroup paper: "The Signal Private Group System" (IEEE S&P 2022)
