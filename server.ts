/**
 * PrinceVChat - Unified Server
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Complete MIME types - including all variants
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.ts': 'application/typescript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.less': 'text/x-less',
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
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

// Room storage
interface Room { id: string; clients: Map<string, WebSocket>; }
interface Msg { type: string; roomId?: string; userId?: string; targetUserId?: string; payload?: unknown; }
const rooms = new Map<string, Room>();

// Static directory
const STATIC_DIR = join(process.cwd(), 'dist');
const hasStatic = existsSync(STATIC_DIR) && statSync(STATIC_DIR).isDirectory();

console.log('[Server] Static dir:', STATIC_DIR, 'EXISTS:', hasStatic);

const server = createServer((req, res) => {
  // CORS
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

  // WS
  if (url === '/ws') { res.writeHead(400); res.end('Use WebSocket'); return; }

  // Serve static only if exists
  if (hasStatic) {
    let filePath = url.split('?')[0];
    
    // Root -> index.html
    if (filePath === '/') filePath = '/index.html';
    
    // Block traversal
    if (filePath.includes('..')) { res.writeHead(403); res.end('Forbidden'); return; }

    const fullPath = join(STATIC_DIR, filePath);
    
    // Log what we're looking for
    console.log('[Server] Looking for:', fullPath, 'EXISTS:', existsSync(fullPath), 'ISFILE:', existsSync(fullPath) && statSync(fullPath).isFile());

    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      const ext = extname(fullPath).toLowerCase();
      let mime = MIME_TYPES[ext];
      
      // Handle files with no extension or unknown extension
      if (!mime) {
        // If it looks like JS (has no extension), serve as JS
        if (filePath.endsWith('.js') || !extname(filePath)) {
          mime = 'application/javascript';
        } else {
          mime = 'application/octet-stream';
        }
      }
      
      console.log('[Server] Serving:', filePath, '->', mime);
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(fullPath));
      return;
    }

    // SPA fallback ONLY for root or paths starting with /room
    if (filePath === '/' || filePath.startsWith('/room')) {
      const indexPath = join(STATIC_DIR, 'index.html');
      if (existsSync(indexPath)) {
        console.log('[Server] SPA fallback for:', filePath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(readFileSync(indexPath));
        return;
      }
    }
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server, path: '/ws' });

console.log('[Server] Starting on port', PORT, '| Static:', hasStatic);

function send(ws: WebSocket, msg: Msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(roomId: string, msg: Msg, excludeId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.clients.forEach((client, id) => { if (id !== excludeId) send(client, msg); });
}

wss.on('connection', (ws: WebSocket) => {
  let clientId: string | null = null;
  let roomId: string | null = null;

  ws.on('message', (data) => {
    try {
      const msg: Msg = JSON.parse(data.toString());
      
      switch (msg.type) {
        case 'join':
          roomId = msg.roomId!;
          clientId = msg.userId || 'user-' + Math.random().toString(36).substring(2, 10);
          if (!rooms.has(roomId)) rooms.set(roomId, { id: roomId, clients: new Map() });
          const room = rooms.get(roomId)!;
          room.clients.set(clientId, ws);
          console.log('[Server] Join:', clientId, roomId);
          const users = Array.from(room.clients.keys()).filter(id => id !== clientId);
          send(ws, { type: 'room-users', roomId, userId: clientId, payload: users });
          broadcast(roomId, { type: 'user-joined', roomId, userId: clientId }, clientId);
          break;
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          if (roomId && msg.targetUserId) {
            const room = rooms.get(roomId);
            const target = room?.clients.get(msg.targetUserId!);
            if (target) send(target, { type: msg.type, roomId, userId: clientId!, payload: msg.payload });
          }
          break;
      }
    } catch (e) { console.error('[Server] Error:', e); }
  });

  ws.on('close', () => {
    if (roomId && clientId) {
      const room = rooms.get(roomId);
      if (room) {
        room.clients.delete(clientId);
        broadcast(roomId, { type: 'user-left', roomId, userId: clientId });
        if (room.clients.size === 0) rooms.delete(roomId);
        console.log('[Server] Leave:', clientId, roomId);
      }
    }
  });
});

server.listen(PORT, () => console.log('[Server] Running http://localhost:' + PORT));
process.on('SIGINT', () => { wss.close(() => process.exit(0)); });