/**
 * PrinceVChat - Client WebSocket Module
 */

export interface SocketMessage {
  type: string;
  roomId?: string;
  userId?: string;
  targetUserId?: string;
  payload?: unknown;
  username?: string;
  raised?: boolean;
  message?: string;
  timestamp?: number;
}

export class SocketManager {
  private socket: WebSocket | null = null;
  private url: string;
  private userId: string;
  private handlers = new Map<string, ((message: SocketMessage) => void)[]>();
  private connected = false;

  constructor(url: string, userId?: string) {
    this.url = url;
    this.userId = userId || 'user-' + Math.random().toString(36).substring(2, 10);
  }

  get userIdValue(): string {
    return this.userId;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('[Socket] Connected');
          this.connected = true;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: SocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('[Socket] Parse error:', e);
          }
        };

        this.socket.onclose = (event) => {
          console.log('[Socket] Disconnected:', event.code);
          this.connected = false;
        };

        this.socket.onerror = (error) => {
          console.error('[Socket] Error:', error);
          if (!this.connected) reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
    this.connected = false;
  }

  send(message: Partial<SocketMessage>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[Socket] Not connected');
      return;
    }

    const fullMessage = {
      ...message,
      userId: this.userId,
    };

    this.socket.send(JSON.stringify(fullMessage));
  }

  // Broadcast message to room
  broadcast(message: Partial<SocketMessage>): void {
    this.send({
      ...message,
      type: 'broadcast'
    });
  }

  on(type: string, handler: (message: SocketMessage) => void): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  private handleMessage(message: SocketMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }
}