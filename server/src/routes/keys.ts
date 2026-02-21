import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/database";
import { generateId } from "../lib/snowflake";
import { authMiddleware } from "../middleware/auth";

const uploadPrekeysSchema = z.object({
  prekeys: z.array(z.string()).min(1).max(100),
});

const keys = new Hono();
keys.use("/*", authMiddleware);

// Upload one-time prekeys
keys.post("/prekeys", async (c) => {
  const body = await c.req.json();
  const parsed = uploadPrekeysSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed" }, 400);
  }

  const user = c.get("user");
  const db = getDb();

  const insert = db.query(
    `INSERT INTO one_time_prekeys (id, user_id, prekey, used) VALUES (?, ?, ?, 0)`
  );

  db.transaction(() => {
    for (const prekey of parsed.data.prekeys) {
      insert.run(generateId(), user.id, prekey);
    }
  })();

  return c.json({ uploaded: parsed.data.prekeys.length });
});

// Fetch a user's key bundle (for initiating E2EE session)
keys.get("/bundle/:userId", async (c) => {
  const { userId } = c.req.param();
  const db = getDb();

  const user = db
    .query(
      "SELECT id, identity_key, signed_prekey, signed_prekey_sig FROM users WHERE id = ?"
    )
    .get(userId) as any;

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Claim one OTP (mark as used atomically)
  const opk = db
    .query(
      "SELECT id, prekey FROM one_time_prekeys WHERE user_id = ? AND used = 0 LIMIT 1"
    )
    .get(userId) as any;

  if (opk) {
    db.query("UPDATE one_time_prekeys SET used = 1 WHERE id = ?").run(opk.id);
  }

  return c.json({
    identityKey: user.identity_key,
    signedPrekey: user.signed_prekey,
    signedPrekeySig: user.signed_prekey_sig,
    oneTimePrekey: opk?.prekey || null,
  });
});

// Get count of remaining prekeys (so client knows when to upload more)
keys.get("/prekeys/count", async (c) => {
  const user = c.get("user");
  const db = getDb();

  const result = db
    .query("SELECT COUNT(*) as count FROM one_time_prekeys WHERE user_id = ? AND used = 0")
    .get(user.id) as any;

  return c.json({ count: result.count });
});

export default keys;
