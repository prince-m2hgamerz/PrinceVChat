/**
 * PrinceVChat - Unified Server (WebSocket + Static Files)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const PORT = parseInt(process.env.PORT || '3000', 10);

// MIME types - complete list
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

// Room storage
interface Room {
  id: string;
  clients: Map<string, WebSocket>;
}

interface Msg {
  type: string;
  roomId?: string;
  userId?: string;
  targetUserId?: string;
  payload?: unknown;
}

const rooms = new Map<string, Room>();

// Detect production
const isProduction = process.env.NODE_ENV === 'production' || existsSync(join(process.cwd(), 'dist'));
const STATIC_DIR = join(process.cwd(), 'dist');

// Create HTTP server
const server = createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let url = req.url || '/';
  
  // Health
  if (url === '/health' || url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }

  // WS endpoint
  if (url === '/ws') {
    res.writeHead(400);
    res.end('Use WebSocket connection');
    return;
  }

  // Serve static files in production
  if (isProduction) {
    let filePath = url === '/' ? '/index.html' : url;
    filePath = filePath.split('?')[0];
    
    // Security - prevent directory traversal
    if (filePath.includes('..') || filePath.includes('%2e')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const fullPath = join(STATIC_DIR, filePath);
    
    // Check if file exists and is a file
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      const ext = extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      
      console.log('[Server] Serving:', filePath, '->', mime);
      
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(fullPath));
      return;
    }

    // SPA fallback for routes like /room/xxx
    const indexPath = join(STATIC_DIR, 'index.html');
    if (existsSync(indexPath)) {
      console.log('[Server] SPA fallback for:', url);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(readFileSync(indexPath));
      return;
    }
  }

  console.log('[Server] 404:', url);
  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

console.log('[Server] PrinceVChat starting on port', PORT);
console.log('[Server] Mode:', isProduction ? 'production' : 'development');
console.log('[Server] Static dir:', isProduction ? STATIC_DIR : 'disabled');

function send(ws: WebSocket, msg: Msg): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(roomId: string, msg: Msg, excludeId?: string): void {
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
      const msg: Msg = JSON.parse(data.toString());
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

          console.log('[Server] User', clientId, 'joined', roomId, '| Total:', room.clients.size);

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
          console.log('[Server] Room deleted:', roomId);
        }
        console.log('[Server] User', clientId, 'left', roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('[Server] Running on http://localhost:' + PORT);
});

process.on('SIGINT', () => {
  wss.close(() => process.exit(0));
});