/**
 * PrinceVChat - Unified Server
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

interface Client {
  id: string;
  ws: WebSocket;
  username: string;
}

interface Room {
  id: string;
  clients: Map<string, Client>;
}

const rooms = new Map<string, Room>();

const STATIC_DIR = join(process.cwd(), 'dist');
const hasStatic = existsSync(STATIC_DIR) && statSync(STATIC_DIR).isDirectory();

console.log('[Server] Static:', STATIC_DIR, 'EXISTS:', hasStatic);

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url || '/';
  
  // Health
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', static: hasStatic }));
    return;
  }

  // Room count API
  if (url === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ count: rooms.size, rooms: Array.from(rooms.keys()) }));
    return;
  }

  // WS
  if (url === '/ws') { res.writeHead(400); res.end('WebSocket'); return; }

  if (hasStatic) {
    // Get clean path
    let filePath = url.split('?')[0];
    
    // If requesting root, serve index.html
    if (filePath === '/') {
      filePath = '/index.html';
    }
    
    // SECURITY: block traversal
    if (filePath.includes('..')) { res.writeHead(403); res.end('Forbidden'); return; }

    const fullPath = join(STATIC_DIR, filePath);
    
    // Check if file exists
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      const ext = extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(fullPath));
      return;
    }

    // KEY FIX: Only do SPA fallback for route-like paths, NOT for file requests
    // SPA fallback for routes that should be client-side (like /room/xxx)
    const isRoute = filePath.startsWith('/room') || filePath.startsWith('/#');
    
    if (isRoute) {
      const indexPath = join(STATIC_DIR, 'index.html');
      if (existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(readFileSync(indexPath));
        return;
      }
    }
  }

  // 404 for API or unknown
  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server, path: '/ws' });

console.log('[Server] Port:', PORT);

function send(ws: WebSocket, msg: any) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, msg: any, excludeId?: string) {
  room.clients.forEach((client, id) => {
    if (id !== excludeId) send(client.ws, msg);
  });
}

function getRoomUsers(room: Room): { id: string; username: string }[] {
  const users: { id: string; username: string }[] = [];
  room.clients.forEach((client, id) => {
    users.push({ id, username: client.username });
  });
  return users;
}

wss.on('connection', (ws: WebSocket) => {
  let clientId: string | null = null;
  let roomId: string | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'join') {
        roomId = msg.roomId;
        clientId = msg.userId || 'user-' + Math.random().toString(36).substring(2, 10);
        const username = msg.username || 'User-' + clientId.slice(-4);
        
        if (!rooms.has(roomId)) rooms.set(roomId, { id: roomId, clients: new Map() });
        const room = rooms.get(roomId)!;
        room.clients.set(clientId, { id: clientId, ws, username });
        
        console.log('[Server] Join:', username, clientId, roomId);
        
        // Send existing users
        send(ws, { 
          type: 'room-users', 
          roomId, 
          userId: clientId, 
          payload: getRoomUsers(room).filter(c => c.id !== clientId) 
        });
        
        // Notify others
        broadcast(room, { 
          type: 'user-joined', 
          roomId, 
          userId: clientId, 
          username 
        }, clientId);
      }
      else if (msg.type === 'set-username') {
        // Update username
        if (roomId && clientId) {
          const room = rooms.get(roomId);
          const client = room?.clients.get(clientId);
          if (client) {
            client.username = msg.username;
            broadcast(room, { 
              type: 'user-updated', 
              roomId, 
              userId: clientId, 
              username: msg.username 
            }, clientId);
          }
        }
      }
      else if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
        if (roomId && msg.targetUserId) {
          const room = rooms.get(roomId);
          const target = room?.clients.get(msg.targetUserId);
          if (target) send(target.ws, { type: msg.type, roomId, userId: clientId!, payload: msg.payload });
        }
      }
      else if (msg.type === 'chat') {
        // Chat message
        if (roomId) {
          const room = rooms.get(roomId);
          if (room) {
            const client = room.clients.get(clientId!);
            broadcast(room, { 
              type: 'chat', 
              roomId, 
              userId: clientId, 
              username: client?.username,
              message: msg.message,
              timestamp: Date.now()
            }, clientId);
          }
        }
      }
      else if (msg.type === 'raise-hand') {
        // Raise/lower hand
        if (roomId) {
          const room = rooms.get(roomId);
          const client = room?.clients.get(clientId!);
          if (client) {
            broadcast(room, { 
              type: 'raise-hand', 
              roomId, 
              userId: clientId,
              username: client.username,
              raised: msg.raised
            }, clientId);
          }
        }
      }
    } catch (e) { console.error('[Server] Error:', e); }
  });

  ws.on('close', () => {
    if (roomId && clientId) {
      const room = rooms.get(roomId);
      if (room) {
        room.clients.delete(clientId);
        broadcast(room, { type: 'user-left', roomId, userId: clientId });
        if (room.clients.size === 0) rooms.delete(roomId);
        console.log('[Server] Leave:', clientId, roomId);
      }
    }
  });
});

server.listen(PORT, () => console.log('[Server] http://localhost:' + PORT));
process.on('SIGINT', () => wss.close(() => process.exit(0)));