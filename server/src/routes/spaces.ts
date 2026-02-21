import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/database";
import { generateId } from "../lib/snowflake";
import { authMiddleware } from "../middleware/auth";
import { Role } from "shared";

const createSpaceSchema = z.object({
  encryptedConfig: z.string(), // base64 encrypted name/description/icon
  historyVisibility: z.string().optional(),
  leaseTtl: z.string().optional(),
});

const spaces = new Hono();
spaces.use("/*", authMiddleware);

// Create a space
spaces.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const user = c.get("user");
  const db = getDb();
  const id = generateId();
  const now = Date.now();

  const tx = db.transaction(() => {
    db.query(
      `INSERT INTO spaces (id, owner_id, encrypted_config, history_visibility, lease_ttl, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      user.id,
      parsed.data.encryptedConfig,
      parsed.data.historyVisibility || "7d",
      parsed.data.leaseTtl || "7d",
      now
    );

    // Add creator as owner
    db.query(
      `INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`
    ).run(id, user.id, Role.Owner, now);

    // Create default #general channel
    const channelId = generateId();
    db.query(
      `INSERT INTO channels (id, space_id, type, encrypted_name, position, created_at)
       VALUES (?, ?, 0, NULL, 0, ?)`
    ).run(channelId, id, now);

    return { channelId };
  });

  const result = tx();

  return c.json({
    id,
    ownerId: user.id,
    encryptedConfig: parsed.data.encryptedConfig,
    historyVisibility: parsed.data.historyVisibility || "7d",
    leaseTtl: parsed.data.leaseTtl || "7d",
    createdAt: now,
    defaultChannelId: result.channelId,
  }, 201);
});

// Get user's spaces
spaces.get("/", async (c) => {
  const user = c.get("user");
  const db = getDb();

  const rows = db
    .query(
      `SELECT s.* FROM spaces s
       JOIN space_members sm ON s.id = sm.space_id
       WHERE sm.user_id = ?
       ORDER BY s.created_at`
    )
    .all(user.id) as any[];

  return c.json(
    rows.map((r) => ({
      id: r.id,
      ownerId: r.owner_id,
      encryptedConfig: r.encrypted_config,
      historyVisibility: r.history_visibility,
      leaseTtl: r.lease_ttl,
      createdAt: r.created_at,
    }))
  );
});

// Get a single space
spaces.get("/:spaceId", async (c) => {
  const user = c.get("user");
  const { spaceId } = c.req.param();
  const db = getDb();

  // Verify membership
  const member = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, user.id) as any;
  if (!member) {
    return c.json({ error: "Not a member of this space" }, 403);
  }

  const space = db.query("SELECT * FROM spaces WHERE id = ?").get(spaceId) as any;
  if (!space) {
    return c.json({ error: "Space not found" }, 404);
  }

  return c.json({
    id: space.id,
    ownerId: space.owner_id,
    encryptedConfig: space.encrypted_config,
    historyVisibility: space.history_visibility,
    leaseTtl: space.lease_ttl,
    createdAt: space.created_at,
  });
});

// Delete a space (owner only)
spaces.delete("/:spaceId", async (c) => {
  const user = c.get("user");
  const { spaceId } = c.req.param();
  const db = getDb();

  const member = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, user.id) as any;

  if (!member || member.role !== Role.Owner) {
    return c.json({ error: "Only the owner can delete a space" }, 403);
  }

  db.transaction(() => {
    db.query("DELETE FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE space_id = ?)").run(spaceId);
    db.query("DELETE FROM channels WHERE space_id = ?").run(spaceId);
    db.query("DELETE FROM space_members WHERE space_id = ?").run(spaceId);
    db.query("DELETE FROM invites WHERE space_id = ?").run(spaceId);
    db.query("DELETE FROM spaces WHERE id = ?").run(spaceId);
  })();

  return c.json({ success: true });
});

export default spaces;
