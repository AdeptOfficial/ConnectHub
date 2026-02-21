import { createMiddleware } from "hono/factory";
import { getDb } from "../db/database";
import { hashToken } from "../lib/crypto";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
  identityKey: string;
  flags: number;
}

type Env = {
  Variables: {
    user: AuthUser;
    sessionId: string;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = header.slice(7);
  const tokenHash = await hashToken(token);
  const db = getDb();

  const session = db
    .query(
      `SELECT s.id, s.user_id, u.username, u.display_name, u.avatar_hash, u.identity_key, u.flags
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as any;

  if (!session) {
    return c.json({ error: "Invalid session" }, 401);
  }

  // Update last_used_at
  db.query("UPDATE sessions SET last_used_at = ? WHERE id = ?").run(
    Date.now(),
    session.id
  );

  c.set("user", {
    id: session.user_id,
    username: session.username,
    displayName: session.display_name,
    avatarHash: session.avatar_hash,
    identityKey: session.identity_key,
    flags: session.flags,
  });
  c.set("sessionId", session.id);

  await next();
});
