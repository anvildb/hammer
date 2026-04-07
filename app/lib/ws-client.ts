// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
/**
 * WebSocket client for GraphQL subscriptions (graphql-ws protocol).
 *
 * Supports:
 * - Connection initialization with optional auth token
 * - Subscribe/unsubscribe to GraphQL subscriptions
 * - Automatic reconnection with exponential backoff
 * - Connection state tracking
 */

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface SubscriptionOptions {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface WsClientOptions {
  url: string;
  authToken?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  onConnectionChange?: (state: ConnectionState) => void;
}

type MessageHandler = (data: unknown) => void;
type ErrorHandler = (error: unknown) => void;
type CompleteHandler = () => void;

interface Subscription {
  id: string;
  onData: MessageHandler;
  onError?: ErrorHandler;
  onComplete?: CompleteHandler;
}

export class WsClient {
  private url: string;
  private authToken?: string;
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private subscriptions = new Map<string, Subscription>();
  private nextId = 1;
  private reconnect: boolean;
  private maxReconnectAttempts: number;
  private initialReconnectDelay: number;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onConnectionChange?: (state: ConnectionState) => void;

  constructor(options: WsClientOptions) {
    this.url = options.url;
    this.authToken = options.authToken;
    this.reconnect = options.reconnect ?? true;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.initialReconnectDelay = options.initialReconnectDelay ?? 1000;
    this.onConnectionChange = options.onConnectionChange;
  }

  /** Current connection state. */
  get connectionState(): ConnectionState {
    return this.state;
  }

  /** Connect to the WebSocket server. */
  connect(): void {
    if (this.state === "connected" || this.state === "connecting") return;

    this.setState(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    this.ws = new WebSocket(this.url, "graphql-transport-ws");

    this.ws.onopen = () => {
      // Send connection_init per graphql-ws protocol.
      const payload: Record<string, unknown> = {};
      if (this.authToken) {
        payload.authToken = this.authToken;
      }
      this.send({ type: "connection_init", payload });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        this.handleMessage(msg);
      } catch {
        // Ignore malformed messages.
      }
    };

    this.ws.onclose = () => {
      this.setState("disconnected");
      if (this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror.
    };
  }

  /** Disconnect and stop reconnecting. */
  disconnect(): void {
    this.reconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.setState("disconnected");
  }

  /** Subscribe to a GraphQL subscription. Returns an unsubscribe function. */
  subscribe(
    options: SubscriptionOptions,
    onData: MessageHandler,
    onError?: ErrorHandler,
    onComplete?: CompleteHandler,
  ): () => void {
    const id = String(this.nextId++);

    this.subscriptions.set(id, { id, onData, onError, onComplete });

    this.send({
      id,
      type: "subscribe",
      payload: {
        query: options.query,
        variables: options.variables,
        operationName: options.operationName,
      },
    });

    return () => this.unsubscribe(id);
  }

  /** Unsubscribe from a subscription. */
  unsubscribe(id: string): void {
    if (this.subscriptions.has(id)) {
      this.send({ id, type: "complete" });
      this.subscriptions.delete(id);
    }
  }

  /** Number of active subscriptions. */
  get activeSubscriptions(): number {
    return this.subscriptions.size;
  }

  private handleMessage(msg: { type: string; id?: string; payload?: unknown }): void {
    switch (msg.type) {
      case "connection_ack":
        this.setState("connected");
        this.reconnectAttempts = 0;
        break;

      case "next":
        if (msg.id) {
          const sub = this.subscriptions.get(msg.id);
          sub?.onData(msg.payload);
        }
        break;

      case "error":
        if (msg.id) {
          const sub = this.subscriptions.get(msg.id);
          sub?.onError?.(msg.payload);
        }
        break;

      case "complete":
        if (msg.id) {
          const sub = this.subscriptions.get(msg.id);
          sub?.onComplete?.();
          this.subscriptions.delete(msg.id);
        }
        break;

      case "ping":
        this.send({ type: "pong" });
        break;
    }
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.onConnectionChange?.(state);
  }

  private scheduleReconnect(): void {
    const delay = this.initialReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, Math.min(delay, 30000));
  }
}
