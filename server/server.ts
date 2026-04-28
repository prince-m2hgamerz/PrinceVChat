/**
 * PrinceVChat - WebSocket Server (Vercel compatible)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);

interface Room {
  id: string;
  clients: Map<string, WebSocket>;
}

interface SignalingMessage {
  type: string;
  roomId?: string;
  userId?: string;
  targetUserId?: string;
  payload?: unknown;
}

const rooms = new Map<string, Room>();

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server: httpServer });

console.log('[Server] Starting on port', HTTP_PORT);

function send(ws: WebSocket, msg: SignalingMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(roomId: string, msg: SignalingMessage, excludeId?: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.clients.forEach((client, id) => {
    if (id !== excludeId) {
      send(client, msg);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  let clientId: string | null = null;
  let roomId: string | null = null;

  ws.on('message', (data) => {
    try {
      const msg: SignalingMessage = JSON.parse(data.toString());
      console.log('[Server]', msg.type);

      switch (msg.type) {
        case 'join': {
          roomId = msg.roomId!;
          clientId = msg.userId || 'user-' + Math.random().toString(36).substring(2, 10);

          if (!rooms.has(roomId)) {
            rooms.set(roomId, { id: roomId, clients: new Map() });
          }

          const room = rooms.get(roomId)!;
          room.clients.set(clientId, ws);

          console.log('[Server] User', clientId, 'joined', roomId);

          // Send existing users
          const users = Array.from(room.clients.keys()).filter(id => id !== clientId);
          send(ws, { type: 'room-users', roomId, userId: clientId, payload: users });

          // Notify others
          broadcast(roomId, { type: 'user-joined', roomId, userId: clientId }, clientId);
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          if (!roomId || !msg.targetUserId) break;
          
          const room = rooms.get(roomId);
          const target = room?.clients.get(msg.targetUserId!);
          
          if (target) {
            send(target, {
              type: msg.type,
              roomId,
              userId: clientId!,
              payload: msg.payload,
            });
          }
          break;
        }
      }
    } catch (e) {
      console.error('[Server] Error:', e);
    }
  });

  ws.on('close', () => {
    if (roomId && clientId) {
      const room = rooms.get(roomId);
      if (room) {
        room.clients.delete(clientId);
        broadcast(roomId, { type: 'user-left', roomId, userId: clientId });

        if (room.clients.size === 0) {
          rooms.delete(roomId);
        }
      }
    }
  });
});

httpServer.listen(HTTP_PORT, () => {
  console.log('[Server] Running on http://localhost:' + HTTP_PORT);
});

process.on('SIGINT', () => {
  wss.close(() => process.exit(0));
});