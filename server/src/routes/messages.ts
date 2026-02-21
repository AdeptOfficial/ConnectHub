import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/database";
import { authMiddleware } from "../middleware/auth";
import { DEFAULT_MESSAGES_PER_FETCH, MAX_MESSAGES_PER_FETCH } from "shared";

const fetchMessagesSchema = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_MESSAGES_PER_FETCH)
    .default(DEFAULT_MESSAGES_PER_FETCH),
});

const messages = new Hono();
messages.use("/*", authMiddleware);

// Get messages in a channel (cursor-based pagination)
messages.get("/channel/:channelId", async (c) => {
  const user = c.get("user");
  const { channelId } = c.req.param();
  const db = getDb();

  // Verify user has access to this channel's space
  const channel = db.query("SELECT space_id FROM channels WHERE id = ?").get(channelId) as any;
  if (!channel) {
    return c.json({ error: "Channel not found" }, 404);
  }

  const member = db
    .query("SELECT 1 FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(channel.space_id, user.id);
  if (!member) {
    return c.json({ error: "Not a member" }, 403);
  }

  const query = fetchMessagesSchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }

  const { before, after, limit } = query.data;

  let sql = `
    SELECT m.*, u.username, u.display_name, u.avatar_hash
    FROM messages m
    JOIN users u ON m.author_id = u.id
    WHERE m.channel_id = ?
  `;
  const params: any[] = [channelId];

  if (before) {
    sql += " AND m.id < ?";
    params.push(before);
  }
  if (after) {
    sql += " AND m.id > ?";
    params.push(after);
  }

  sql += after ? " ORDER BY m.id ASC" : " ORDER BY m.id DESC";
  sql += " LIMIT ?";
  params.push(limit);

  const rows = db.query(sql).all(...params) as any[];

  // If fetching by "after", results are ASC — reverse isn't needed.
  // If fetching by "before" or default, results are DESC — reverse to chronological.
  if (!after) rows.reverse();

  return c.json(
    rows.map((r) => ({
      id: r.id,
      channelId: r.channel_id,
      authorId: r.author_id,
      encryptedContent: r.encrypted_content,
      leaseEnvelope: r.lease_envelope,
      type: r.type,
      flags: r.flags,
      createdAt: r.created_at,
      editedAt: r.edited_at,
      author: {
        id: r.author_id,
        username: r.username,
        displayName: r.display_name,
        avatarHash: r.avatar_hash,
      },
    }))
  );
});

// Edit a message (author only)
messages.put("/:messageId", async (c) => {
  const user = c.get("user");
  const { messageId } = c.req.param();
  const db = getDb();

  const message = db.query("SELECT * FROM messages WHERE id = ?").get(messageId) as any;
  if (!message) {
    return c.json({ error: "Message not found" }, 404);
  }
  if (message.author_id !== user.id) {
    return c.json({ error: "Cannot edit another user's message" }, 403);
  }

  const body = await c.req.json();
  const encryptedContent = body.encryptedContent;
  if (!encryptedContent || typeof encryptedContent !== "string") {
    return c.json({ error: "encryptedContent is required" }, 400);
  }

  const now = Date.now();
  db.query("UPDATE messages SET encrypted_content = ?, edited_at = ? WHERE id = ?").run(
    encryptedContent,
    now,
    messageId
  );

  return c.json({
    id: message.id,
    channelId: message.channel_id,
    authorId: message.author_id,
    encryptedContent,
    leaseEnvelope: message.lease_envelope,
    type: message.type,
    flags: message.flags,
    createdAt: message.created_at,
    editedAt: now,
  });
});

// Delete a message (author or admin/owner)
messages.delete("/:messageId", async (c) => {
  const user = c.get("user");
  const { messageId } = c.req.param();
  const db = getDb();

  const message = db.query("SELECT * FROM messages WHERE id = ?").get(messageId) as any;
  if (!message) {
    return c.json({ error: "Message not found" }, 404);
  }

  // Author can always delete their own messages
  if (message.author_id !== user.id) {
    // Check if user is admin/owner in the channel's space
    const channel = db.query("SELECT space_id FROM channels WHERE id = ?").get(message.channel_id) as any;
    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }
    const member = db
      .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
      .get(channel.space_id, user.id) as any;
    if (!member || member.role < 1) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
  }

  db.query("DELETE FROM messages WHERE id = ?").run(messageId);
  return c.json({ success: true });
});

export default messages;
