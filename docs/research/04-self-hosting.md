# ConnectHub — Self-Hosting & Deployment

## Overview

ConnectHub is designed for community self-hosting. One person (the server admin) runs a ConnectHub server for their community — like running a Minecraft server or a Discord bot server. Users join the server with client apps (web, desktop, mobile). The server admin manages infrastructure; users just sign up and chat.

**Key difference from Discord/Fluxer:** Even though the server admin hosts the infrastructure, they **cannot read any messages** thanks to E2EE. The server is a zero-knowledge relay.

## Deployment

### Simple Community Server

```yaml
# docker-compose.yml
services:
  connecthub:
    image: connecthub/server
    ports:
      - "443:443"
      - "3478:3478/udp"   # STUN/TURN for voice
    volumes:
      - ./data:/data       # SQLite database + encrypted blobs
    environment:
      - DOMAIN=chat.mycommunity.com
      - REGISTRATION=invite    # invite | open | closed
      - ADMIN_KEY=<generated>  # admin access key

  coturn:
    image: coturn/coturn
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/turnserver.conf
```

### With Voice/Video SFU (V2)

```yaml
# docker-compose.yml (with LiveKit for group calls)
services:
  connecthub:
    image: connecthub/server
    ports:
      - "443:443"
    volumes:
      - ./data:/data
    environment:
      - DOMAIN=chat.mycommunity.com
      - LIVEKIT_URL=http://livekit:7880

  coturn:
    image: coturn/coturn
    network_mode: host

  livekit:
    image: livekit/livekit-server
    ports:
      - "7880:7880"
      - "7881:7881"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
```

## Server Admin: Powers and Limits

### What the Admin CAN Do

- Manage registration (open, invite-only, closed)
- Create invite links / registration tokens
- Ban users from the server entirely
- Set storage quotas and rate limits
- View server metrics (connection count, storage usage, bandwidth)
- Perform server maintenance (backups, updates)
- Hide messages in Spaces they admin (moderation)

### What the Admin CANNOT Do

- Read any message content (E2EE)
- Read Space names, channel names, or topics (encrypted config)
- Forge messages from other users (signed with sender's key)
- Bypass the kill switch (LeaseWrappingKey is client-side only)
- Access any user's private keys
- Decrypt media/file attachments

### What the Admin CAN See (Metadata)

- Which public keys are registered
- Which users are in which Spaces (membership, not content)
- When users connect/disconnect
- Message counts and sizes per channel (not content)
- IP addresses of connected clients

This metadata exposure is the same as Signal's server. Full metadata protection (hiding who talks to whom) is a future enhancement via sealed sender.

## Trust Model

```
                    Discord/Fluxer        ConnectHub
                    ─────────────         ──────────
Message content:    Server reads it       Server CANNOT read it
Kill switch:        Honor system          Cryptographic guarantee
Server compromised: All data exposed      Only encrypted blobs + metadata
Admin reads DB:     Sees everything       Sees encrypted blobs only
User leaves:        Data stays forever    Kill switch wipes their messages
```

The practical reality: you're trusting the server admin for **availability** (keeping the server running) and **not doing traffic analysis** (metadata). You are NOT trusting them for message content or deletion.

## Registration Options

### Invite-Only (Default, Recommended)

```
Admin generates invite links:
  connecthub invite create --uses 10 --expires 7d

Output: https://chat.mycommunity.com/invite/abc123def

Users click link → register with username + passphrase → done.
No email, no phone number. Keypair generated on first registration.
```

### Open Registration

Anyone can sign up. Rate-limited. Good for public communities.

### Closed Registration

Admin creates accounts manually. Good for private groups.

## Backup & Recovery

```
Server data (SQLite) contains:
  - Encrypted message blobs (unreadable without client keys)
  - LeaseKey envelopes (unreadable without LeaseWrappingKeys)
  - Member public keys and prekeys
  - Space/channel metadata (encrypted)
  - MLS tree state (public keys only)

Backing up the server = backing up encrypted data.
Even if a backup leaks, the attacker gets only ciphertext.

Standard backup:
  sqlite3 /data/connecthub.db ".backup /backups/connecthub-$(date +%Y%m%d).db"

Or volume-level snapshots if using Docker volumes.
```

## Scaling Considerations

### SQLite Limits

SQLite with WAL mode handles a single-writer, many-reader workload well. For a community server:

- **Small community (10-50 members):** SQLite is perfect. No issues.
- **Medium community (50-500 members):** SQLite handles this fine with WAL mode. Tens of thousands of messages per day is trivial.
- **Large community (500+):** May hit write concurrency limits during peak activity. Consider PostgreSQL as an alternative backend at this scale (V2/V3 consideration).

### Server Requirements (Estimated)

```
Small community (10-50 users):
  - 1 CPU core, 512 MB RAM, 10 GB storage
  - Raspberry Pi 4 is sufficient

Medium community (50-500 users):
  - 2 CPU cores, 2 GB RAM, 50 GB storage
  - Any $5-10/month VPS

Large community (500+ users):
  - 4+ CPU cores, 4+ GB RAM, 100+ GB storage
  - Dedicated server or larger VPS
```
