import {
  ClientOpcode,
  ServerOpcode,
  HEARTBEAT_INTERVAL,
  type GatewayPayload,
  type SendMessagePayload,
} from "shared";

type EventHandler = (data: any) => void;

class GatewayClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private handlers = new Map<ServerOpcode, Set<EventHandler>>();
  private _connected = false;
  private _ready = false; // true after READY is received
  private pendingQueue: Array<{ op: ClientOpcode; data: unknown }> = [];

  get connected() {
    return this._connected;
  }

  get ready() {
    return this._ready;
  }

  connect(token: string) {
    this.token = token;
    this.reconnectAttempts = 0;
    this._ready = false;
    this.pendingQueue = [];
    this.doConnect();
  }

  disconnect() {
    this.token = null;
    this._ready = false;
    this.pendingQueue = [];
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }

  on(op: ServerOpcode, handler: EventHandler) {
    let set = this.handlers.get(op);
    if (!set) {
      set = new Set();
      this.handlers.set(op, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  send(op: ClientOpcode, data: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log(`[GW] send op=${op} dropped: ws not open`);
      return;
    }

    // Queue operations that require authentication until READY
    if (!this._ready && op !== ClientOpcode.Identify && op !== ClientOpcode.Heartbeat) {
      console.log(`[GW] send op=${op} queued (not ready yet)`);
      this.pendingQueue.push({ op, data });
      return;
    }

    console.log(`[GW] send op=${op}`, data);
    const payload: GatewayPayload = { op, d: data };
    this.ws.send(JSON.stringify(payload));
  }

  sendMessage(data: SendMessagePayload) {
    this.send(ClientOpcode.SendMessage, data);
  }

  subscribe(channelId: string) {
    this.send(ClientOpcode.Subscribe, { channelId });
  }

  unsubscribe(channelId: string) {
    this.send(ClientOpcode.Unsubscribe, { channelId });
  }

  startTyping(channelId: string) {
    this.send(ClientOpcode.StartTyping, { channelId });
  }

  private flushQueue() {
    const queue = this.pendingQueue;
    this.pendingQueue = [];
    for (const { op, data } of queue) {
      this.send(op, data);
    }
  }

  private doConnect() {
    if (this.ws) {
      this.ws.close();
    }

    // In dev, connect directly to the API server to bypass Vite proxy WS issues
    const wsBase = import.meta.env.DEV
      ? "ws://localhost:4000"
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
    const url = `${wsBase}/gateway`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectAttempts = 0;
      console.log("[GW] WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const payload: GatewayPayload = JSON.parse(event.data);
        this.handlePayload(payload);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[GW] WebSocket closed: code=${event.code} reason=${event.reason}`);
      this._connected = false;
      this._ready = false;
      this.cleanup();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private handlePayload(payload: GatewayPayload) {
    switch (payload.op) {
      case ServerOpcode.Hello:
        // Send IDENTIFY
        this.send(ClientOpcode.Identify, { token: this.token });
        this.startHeartbeat(
          (payload.d as any)?.heartbeatInterval || HEARTBEAT_INTERVAL
        );
        break;
      case ServerOpcode.Ready:
        this._ready = true;
        console.log(`[GW] READY received, flushing ${this.pendingQueue.length} queued ops`);
        // Flush any queued operations (subscribe, sendMessage, etc.)
        this.flushQueue();
        break;
      case ServerOpcode.InvalidSession:
        this.disconnect();
        break;
      default:
        break;
    }

    // Dispatch to registered handlers
    const handlers = this.handlers.get(payload.op as ServerOpcode);
    if (handlers) {
      for (const handler of handlers) {
        handler(payload.d);
      }
    }
  }

  private startHeartbeat(interval: number) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send(ClientOpcode.Heartbeat, null);
    }, interval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanup() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (!this.token) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
  }
}

export const gateway = new GatewayClient();
