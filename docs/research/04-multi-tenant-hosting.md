# ConnectHub — Multi-Tenant Hosting

## The Problem

Not everyone has the resources to self-host. Some users need a friend with a homelab to host their node. This introduces a trust boundary: the host has physical access to the hardware.

## Deployment Modes

ConnectHub supports three deployment modes from a single Docker image:

### Mode 1: Solo Self-Host

```yaml
# docker-compose.yml (simple single-user)
services:
  connecthub:
    image: connecthub/node
    ports:
      - "9090:9090"
    volumes:
      - ./data:/data  # encrypted SQLite lives here
```

You run it. You own it. Full control.

### Mode 2: Hosted by a Friend

```
Friend runs the container for you.
SQLCipher encrypted DB on disk.
Passphrase-sealed on restart.
Friend sees nothing readable.
```

### Mode 3: Homelab Multi-Tenant

```yaml
# docker-compose.yml (on Dave's homelab)
services:
  manager:
    image: connecthub/manager
    ports:
      - "443:443"
    volumes:
      - ./tenants:/tenants
    environment:
      - DOMAIN=connecthub.daves-homelab.net

  # Tenants auto-provisioned by manager CLI:
  #   connecthub add-tenant emma
  #   connecthub add-tenant frank
  # Each gets their own container, volume, subdomain
```

## Multi-Tenant Architecture

```
Dave's Homelab
┌──────────────────────────────────────────────────┐
│                                                  │
│  ConnectHub Manager (lightweight orchestrator)   │
│  ┌────────────────────────────────────────────┐  │
│  │  - Provisions new tenant nodes             │  │
│  │  - Reverse proxy (routes traffic)          │  │
│  │  - Resource limits per tenant              │  │
│  │  - Does NOT hold any tenant keys           │  │
│  └──────────────┬────────────────────────────┘   │
│                 │                                 │
│        ┌────────┼────────┐                       │
│        ▼        ▼        ▼                       │
│  ┌─────────┐┌─────────┐┌─────────┐              │
│  │ Dave    ││ Emma    ││ Frank   │              │
│  │ :9001   ││ :9002   ││ :9003   │              │
│  │         ││         ││         │              │
│  │ Own DB  ││ Own DB  ││ Own DB  │              │
│  │ Own keys││ Own keys││ Own keys│              │
│  │ Own vol ││ Own vol ││ Own vol │              │
│  └─────────┘└─────────┘└─────────┘              │
│                                                  │
│  Reverse Proxy:                                  │
│  dave.connecthub.local   → :9001                 │
│  emma.connecthub.local   → :9002                 │
│  frank.connecthub.local  → :9003                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

Each tenant gets:
- Isolated Docker container (or process with cgroups)
- Own SQLCipher-encrypted SQLite volume
- Own subdomain or port
- Resource limits (CPU, RAM, storage quotas)
- Complete data isolation from other tenants and the host

## Passphrase-Sealed Nodes (Solving the Trust Problem)

The host (Dave) has root access. He can open any file on disk. The solution: **nothing readable exists on disk without the user's passphrase**.

### Seal/Unseal Flow

```
Emma's Node Startup:

1. Docker container starts
2. Node is in SEALED state (nothing works)
3. Emma opens her phone/web app
4. Enters her passphrase (never stored on disk)
5. Passphrase derives the master key (Argon2id KDF)
6. Master key unseals:
   - Signal Protocol identity keys
   - SQLCipher database encryption key
   - Message lease keys
7. Node is now UNSEALED and operational
8. Master key lives in memory only
```

### What the Host Sees

```
Dave snoops on Emma's volume:

  data/
  ├── node.db          ← SQLCipher encrypted (AES-256, looks like random bytes)
  ├── config.enc       ← encrypted config blob
  └── nothing else readable

Dave would need to dump container RAM to get anything.
That's a very deliberate, detectable attack.
```

This is the same trust model as self-hosted Bitwarden (Vaultwarden). Good enough for friends.

## Kill Switch in Hosted Scenarios

```
EMMA HITS KILL SWITCH:

1. Emma's client sends KILL command to her node
2. Node broadcasts REVOKE to all connected peers
3. Lease keys stop being served
4. Node enters SEALED state
5. All in-memory keys are wiped

What Emma CANNOT do:
- Delete the encrypted SQLite file from Dave's disk
  (Dave controls the hardware)

What this means:
- The encrypted blob still exists on Dave's server
- But without Emma's passphrase, it's random bytes
- Emma can change her passphrase on a new node,
  making the old blob permanently unrecoverable
```

## Node Migration

```
Emma moves from Dave's server to her own:

  Dave's Server              Emma's New Server
  ┌───────────┐              ┌───────────┐
  │ Emma's    │  encrypted   │ Emma's    │
  │ Old Node  │──migration──►│ New Node  │
  │           │   bundle     │           │
  └───────────┘              └───────────┘
       │                          │
    self-wipe              peers update
                           address to
                           new location

Migration steps:
1. Emma unseals her node one last time
2. Exports identity + message history (encrypted backup)
3. Imports into a new node (her own hardware, or another friend)
4. Old node self-wipes and shuts down
5. All peer connections re-establish to new address

To other nodes, Emma just changed IP.
Her identity (public key) stays the same.
No message history is lost.
```
