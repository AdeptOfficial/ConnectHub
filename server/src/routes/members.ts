import { Hono } from "hono";
import { getDb } from "../db/database";
import { authMiddleware } from "../middleware/auth";
import { Role } from "shared";

const members = new Hono();
members.use("/*", authMiddleware);

// List members of a space
members.get("/space/:spaceId", async (c) => {
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
    .query(
      `SELECT sm.role, sm.joined_at, u.id, u.username, u.display_name, u.avatar_hash
       FROM space_members sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.space_id = ?
       ORDER BY sm.role DESC, sm.joined_at`
    )
    .all(spaceId) as any[];

  return c.json(
    rows.map((r) => ({
      userId: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarHash: r.avatar_hash,
      role: r.role,
      joinedAt: r.joined_at,
    }))
  );
});

// Leave a space
members.delete("/space/:spaceId/me", async (c) => {
  const user = c.get("user");
  const { spaceId } = c.req.param();
  const db = getDb();

  const member = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, user.id) as any;
  if (!member) {
    return c.json({ error: "Not a member" }, 404);
  }
  if (member.role === Role.Owner) {
    return c.json({ error: "Owner cannot leave. Transfer ownership or delete the space." }, 400);
  }

  db.query("DELETE FROM space_members WHERE space_id = ? AND user_id = ?").run(spaceId, user.id);
  return c.json({ success: true });
});

// Kick a member
members.delete("/space/:spaceId/user/:userId", async (c) => {
  const user = c.get("user");
  const { spaceId, userId } = c.req.param();
  const db = getDb();

  const actor = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, user.id) as any;
  if (!actor || actor.role < Role.Admin) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const target = db
    .query("SELECT role FROM space_members WHERE space_id = ? AND user_id = ?")
    .get(spaceId, userId) as any;
  if (!target) {
    return c.json({ error: "User is not a member" }, 404);
  }
  if (target.role >= actor.role) {
    return c.json({ error: "Cannot kick a member with equal or higher role" }, 403);
  }

  db.query("DELETE FROM space_members WHERE space_id = ? AND user_id = ?").run(spaceId, userId);
  return c.json({ success: true });
});

export default members;
