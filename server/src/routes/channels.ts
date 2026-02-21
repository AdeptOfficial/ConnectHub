import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/database";
import { generateId } from "../lib/snowflake";
import { authMiddleware } from "../middleware/auth";
import { Role, ChannelType } from "shared";

const createChannelSchema = z.object({
  spaceId: z.string(),
  type: z.nativeEnum(ChannelType).optional(),
  encryptedName: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

const channels = new Hono();
channels.use("/*", authMiddleware);

// List channels in a space
channels.get("/space/:spaceId", async (c) => {
  const user = c.get("user");
  const { spaceId } = c.req.param();
  const db = getDb();

  const member = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, user.id);
  if (!member) {
    return c.json({ error: "Not a member" }, 403);
  }

  const rows = db
    .query("SELECT * FROM channels WHERE space_id = ? ORDER BY position")
    .all(spaceId) as any[];

  return c.json(
    rows.map((r) => ({
      id: r.id,
      spaceId: r.space_id,
      type: r.type,
      encryptedName: r.encrypted_name,
      position: r.position,
      createdAt: r.created_at,
    }))
  );
});

// Create a channel
channels.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createChannelSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const user = c.get("user");
  const db = getDb();
  const { spaceId, type, encryptedName, position } = parsed.data;

  // Check admin/owner
  const member = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, user.id) as any;
  if (!member || member.role < Role.Admin) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const id = generateId();
  const now = Date.now();

  db.query(
    `INSERT INTO channels (id, space_id, type, encrypted_name, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, spaceId, type ?? ChannelType.Text, encryptedName ?? null, position ?? 0, now);

  return c.json(
    {
      id,
      spaceId,
      type: type ?? ChannelType.Text,
      encryptedName: encryptedName ?? null,
      position: position ?? 0,
      createdAt: now,
    },
    201
  );
});

// Delete a channel
channels.delete("/:channelId", async (c) => {
  const user = c.get("user");
  const { channelId } = c.req.param();
  const db = getDb();

  const channel = db.query("SELECT * FROM channels WHERE id = ?").get(channelId) as any;
  if (!channel) {
    return c.json({ error: "Channel not found" }, 404);
  }

  const member = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(channel.space_id, user.id) as any;
  if (!member || member.role < Role.Admin) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  db.transaction(() => {
    db.query("DELETE FROM messages WHERE channel_id = ?").run(channelId);
    db.query("DELETE FROM channels WHERE id = ?").run(channelId);
  })();

  return c.json({ success: true });
});

export default channels;
