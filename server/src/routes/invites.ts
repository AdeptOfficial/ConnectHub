import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/database";
import { authMiddleware } from "../middleware/auth";
import { generateInviteCode } from "../lib/crypto";
import { Role } from "shared";

const createInviteSchema = z.object({
  spaceId: z.string(),
  maxUses: z.number().int().positive().optional(),
  expiresInMs: z.number().int().positive().optional(),
});

const invites = new Hono();
invites.use("/*", authMiddleware);

// Create an invite
invites.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const user = c.get("user");
  const db = getDb();
  const { spaceId, maxUses, expiresInMs } = parsed.data;

  const member = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, user.id) as any;
  if (!member) {
    return c.json({ error: "Not a member" }, 403);
  }

  const code = generateInviteCode();
  const now = Date.now();
  const expiresAt = expiresInMs ? now + expiresInMs : null;

  db.query(
    `INSERT INTO invites (code, space_id, creator_id, max_uses, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(code, spaceId, user.id, maxUses || null, expiresAt, now);

  return c.json({ code, spaceId, expiresAt, maxUses: maxUses || null }, 201);
});

// Use an invite (join space)
invites.post("/:code/join", async (c) => {
  const user = c.get("user");
  const { code } = c.req.param();
  const db = getDb();

  const invite = db.query("SELECT * FROM invites WHERE code = ?").get(code) as any;
  if (!invite) {
    return c.json({ error: "Invalid invite" }, 404);
  }

  if (invite.expires_at && invite.expires_at < Date.now()) {
    return c.json({ error: "Invite expired" }, 410);
  }

  if (invite.max_uses && invite.use_count >= invite.max_uses) {
    return c.json({ error: "Invite has reached max uses" }, 410);
  }

  // Check if already a member
  const existing = db
    .query("SELECT 1 FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(invite.space_id, user.id);
  if (existing) {
    return c.json({ error: "Already a member" }, 409);
  }

  const now = Date.now();
  db.transaction(() => {
    db.query(
      `INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`
    ).run(invite.space_id, user.id, Role.Member, now);

    db.query("UPDATE invites SET use_count = use_count + 1 WHERE code = ?").run(code);
  })();

  return c.json({ spaceId: invite.space_id, joined: true });
});

// Get invite info
invites.get("/:code", async (c) => {
  const { code } = c.req.param();
  const db = getDb();

  const invite = db.query("SELECT * FROM invites WHERE code = ?").get(code) as any;
  if (!invite) {
    return c.json({ error: "Invalid invite" }, 404);
  }

  return c.json({
    code: invite.code,
    spaceId: invite.space_id,
    expiresAt: invite.expires_at,
    maxUses: invite.max_uses,
    useCount: invite.use_count,
  });
});

export default invites;
