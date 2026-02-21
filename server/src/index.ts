import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import spaces from "./routes/spaces";
import channels from "./routes/channels";
import messages from "./routes/messages";
import members from "./routes/members";
import invites from "./routes/invites";
import keys from "./routes/keys";
import { handleOpen, handleMessage, handleClose } from "./ws/gateway";
import { getDb } from "./db/database";
import type { WsData } from "./ws/sessions";

const app = new Hono();

// Global error handler — log actual errors
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

// CORS for dev
app.use(
  "/*",
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// REST routes under /api
const api = new Hono();
api.route("/auth", auth);
api.route("/spaces", spaces);
api.route("/channels", channels);
api.route("/messages", messages);
api.route("/members", members);
api.route("/invites", invites);
api.route("/keys", keys);
app.route("/api", api);

// Initialize DB on startup
getDb();

const port = Number(process.env.PORT) || 3000;

// Use Bun.serve directly with native WebSocket support
const server = Bun.serve<WsData>({
  port,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade for /gateway
    if (url.pathname === "/gateway") {
      const upgraded = server.upgrade(req, {
        data: { sessionId: "" },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Handle all other routes via Hono
    return app.fetch(req, { ip: server.requestIP(req) });
  },
  websocket: {
    open(ws) {
      handleOpen(ws);
    },
    message(ws, message) {
      // handleMessage is async — call it and catch errors
      handleMessage(ws, message).catch((err) => {
        console.error("WS message handler error:", err);
      });
    },
    close(ws) {
      handleClose(ws);
    },
  },
});

console.log(`ConnectHub server listening on http://localhost:${server.port}`);
