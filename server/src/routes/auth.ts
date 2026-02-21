import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/database";
import { generateId } from "../lib/snowflake";
import { generateSessionToken, hashToken } from "../lib/crypto";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import {
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "shared";

const registerSchema = z.object({
  username: z
    .string()
    .min(MIN_USERNAME_LENGTH)
    .max(MAX_USERNAME_LENGTH)
    .regex(/^[a-zA-Z0-9_]+$/, "Username must be alphanumeric or underscores"),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  displayName: z.string().max(64).optional(),
  identityKey: z.string(), // base64 public key
  signedPrekey: z.string().optional(),
  signedPrekeySig: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const auth = new Hono();

// Rate limit auth endpoints
auth.use("/*", rateLimit({ max: 20, windowMs: 60_000 }));

auth.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const { username, password, displayName, identityKey, signedPrekey, signedPrekeySig } = parsed.data;
  const db = getDb();

  // Check username uniqueness
  const existing = db.query("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return c.json({ error: "Username already taken" }, 409);
  }

  const id = generateId();
  const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
  const now = Date.now();

  db.query(
    `INSERT INTO users (id, username, password_hash, display_name, identity_key, signed_prekey, signed_prekey_sig, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, username, passwordHash, displayName || null, identityKey, signedPrekey || null, signedPrekeySig || null, now);

  // Create session
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const sessionId = generateId();

  db.query(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, last_used_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sessionId,
    id,
    tokenHash,
    now,
    now,
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || null,
    c.req.header("user-agent") || null
  );

  return c.json({
    token,
    user: {
      id,
      username,
      displayName: displayName || null,
      avatarHash: null,
      identityKey,
      createdAt: now,
      flags: 0,
    },
  }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Validation failed" }, 400);
  }

  const { username, password } = parsed.data;
  const db = getDb();

  const user = db
    .query(
      "SELECT id, username, password_hash, display_name, avatar_hash, identity_key, created_at, flags FROM users WHERE username = ?"
    )
    .get(username) as any;

  if (!user) {
    return c.json({ error: "Invalid username or password" }, 401);
  }

  const valid = await Bun.password.verify(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid username or password" }, 401);
  }

  const now = Date.now();
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const sessionId = generateId();

  db.query(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, last_used_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sessionId,
    user.id,
    tokenHash,
    now,
    now,
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || null,
    c.req.header("user-agent") || null
  );

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarHash: user.avatar_hash,
      identityKey: user.identity_key,
      createdAt: user.created_at,
      flags: user.flags,
    },
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarHash: user.avatarHash,
    identityKey: user.identityKey,
    flags: user.flags,
  });
});

auth.post("/logout", authMiddleware, async (c) => {
  const sessionId = c.get("sessionId");
  const db = getDb();
  db.query("DELETE FROM sessions WHERE id = ?").run(sessionId);
  return c.json({ success: true });
});

export default auth;
