# ConnectHub — Open Questions & Decisions Needed

## Critical Path Questions

### 1. Offline Message Delivery

**Problem:** If Bob's node is down when Alice sends a message, what happens?

**Options:**
- **Queue on Alice's node** — deliver when Bob comes back online. Alice's node holds the encrypted blob until Bob's node is reachable. Simple but requires Alice's node to track delivery state.
- **Relay through a mutual peer** — if Alice and Bob share a Space with Carol, Carol's node could relay. Adds complexity and trust questions.
- **Optional lightweight relay service** — a "dead drop" relay that holds encrypted blobs temporarily. Like Signal's server-side queue but decentralized.

**Recommendation:** Queue on sender's node for v1. Simple, no additional infrastructure, consistent with "sender owns everything" model.

### 2. NAT Traversal & Discovery

**Problem:** Not everyone can expose a public port. Home routers, CGNAT, firewalls.

**Options:**
- **UPnP/NAT-PMP** — automatic port forwarding (works on many home routers)
- **Reverse tunnel** — services like Cloudflare Tunnel, Tailscale, or a custom relay
- **DHT-based discovery** — like BitTorrent trackers, for finding node addresses
- **Optional signaling server** — lightweight relay for initial connection, then direct

**Recommendation:** Support multiple strategies. UPnP for easy cases, Cloudflare Tunnel or Tailscale for harder ones, and a community signaling relay for bootstrapping.

### 3. Node Uptime & Availability

**Problem:** Running Docker 24/7 isn't feasible for everyone. If your node is down, you're invisible and your leased messages go dark on other nodes.

**Options:**
- **Accept the limitation** — "your node, your uptime"
- **Grace period for leases** — cached keys survive N hours of downtime
- **"Bring your own VPS" guides** — $5/month VPS running ConnectHub
- **Multi-tenant hosting** — friends host for friends (already planned)
- **Paid hosted-node service** — "ConnectHub Cloud" where someone runs your node (you still own it cryptographically)

**Recommendation:** Grace periods + multi-tenant hosting cover most cases. VPS guides for power users. Hosted service is a future option.

### 4. Trust Model for Groups

**Problem:** In a group Space, messages from each member are leased blobs on every other member's node. Do you trust all members' nodes to properly handle lease expiry?

**Answer:** You don't need to trust them. The encrypted lease model means they **can't** read expired messages regardless of whether their node honors the protocol. The only trust question is: will they delete the unreadable blobs, or will they accumulate dead data? That's a storage concern, not a privacy concern.

### 5. Registration & Identity

**Problem:** No phone number, no email — how do users find each other?

**Options:**
- **Public key / fingerprint** — share out of band (QR code, copy-paste)
- **Username@node-address** — like email (`alice@alice-node.duckdns.org`)
- **Vanity names on optional directory** — opt-in searchable directory
- **QR code scan** — in-person contact exchange (like Briar)

**Recommendation:** Primary identity is public key. Support `username@node-address` for human-readable sharing. Optional directory for discoverability. QR codes for in-person.

### 6. Moderation in Spaces

**Problem:** Discord-like Spaces need moderation (ban, mute, delete messages). But "delete messages" conflicts with "sender owns messages."

**Resolution:**
- **Admins can remove a member** — their leased blobs become inaccessible (equivalent to kill switch from the Space's perspective)
- **Admins can hide messages** — mark as hidden in the Space view, even if the sender's node still serves them
- **Admins cannot delete from sender's node** — consistent with ownership model
- **Banned users' nodes stop receiving Space updates**

### 7. Abuse Prevention

**Problem:** If there's no central authority, how do you prevent spam, harassment, abuse?

**Options:**
- **Contact request model** — must accept before someone can message you (like Signal)
- **Space invitations** — must be invited to join a Space
- **Block at node level** — refuse all connections from a specific public key
- **Reputation/trust scores** — earned through mutual contacts (web of trust)
- **Rate limiting** — per-connection message rate limits

### 8. Legal & Compliance

**Problem:** If users can make messages disappear, how does this interact with legal retention requirements?

**Answer:** This is the user's responsibility. ConnectHub provides the tool. Users in regulated industries should configure retention policies accordingly. The node admin controls their own retention settings. This is no different from Signal's disappearing messages.

## Technical Decisions Needed

### Database: SQLite Concurrency

SQLite has write concurrency limits (WAL mode helps, but still single-writer). For a single-user node this is fine. For multi-tenant hosting with many active users, this could bottleneck.

**Mitigation:** Each tenant gets their own SQLite file. The manager process doesn't share databases across tenants.

### WebRTC: Group Call Architecture

For 5+ person calls, full mesh is impractical. Options:
- **One node acts as temporary SFU** — the "host" node forwards streams
- **Dedicated SFU container** — run Signal's open-source Calling Service
- **External SFU service** — LiveKit, Janus, or mediasoup

**Recommendation:** Start with mesh for small groups (2-4). Add SFU capability for 5+ using Signal's open-source Calling Service or mediasoup.

### Mobile App Strategy

The node must be running for the phone app to work. Phone can't BE the node.

**Options:**
- **Progressive Web App (PWA)** — works on all platforms, no app store needed
- **React Native** — native feel, shared codebase
- **Capacitor** — wrap the web app in a native shell

**Recommendation:** PWA for v1 (fastest to ship, no app store gatekeepers). React Native for v2 if native features are needed (push notifications, background sync).

### Push Notifications (Mobile)

Without a central server, how does a mobile thin client know there's a new message?

**Options:**
- **Web Push API** — works for PWAs, no app store needed
- **UnifiedPush** — open-source push notification protocol (self-hostable)
- **Keep WebSocket alive** — background connection (battery impact)
- **Polling** — check periodically (latency tradeoff)

**Recommendation:** UnifiedPush for Android (self-hostable, privacy-friendly). Web Push for iOS PWA. WebSocket for desktop.
