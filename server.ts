/**
 * PrinceVChat - Unified Server (WebSocket + Static Files)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Complete MIME types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript', 
  '.ts': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.scss': 'text/css',
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
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
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

// ALWAYS use dist in production - Railway persists build artifacts
const STATIC_DIR = process.env.STATIC_DIR || join(process.cwd(), 'dist');

// Check if we should serve static files
const shouldServeStatic = existsSync(STATIC_DIR) && statSync(STATIC_DIR).isDirectory();

console.log('[Server] Static dir:', STATIC_DIR, existsSync(STATIC_DIR) ? 'EXISTS' : 'MISSING');
console.log('[Server] Serve static:', shouldServeStatic);

// Create HTTP server
const server = createServer((req, res) => {
  // CORS for API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';
  
  // Health check
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', static: shouldServeStatic, staticDir: STATIC_DIR }));
    return;
  }

  // WS endpoint
  if (url === '/ws') {
    res.writeHead(400);
    res.end('Use WebSocket');
    return;
  }

  // Serve static files
  if (shouldServeStatic) {
    // Get the file path - remove query string
    let filePath = url.split('?')[0];
    
    // Root path goes to index.html
    if (filePath === '/') {
      filePath = '/index.html';
    }
    
    // Security - block directory traversal
    if (filePath.includes('..') || filePath.startsWith('/..') || filePath.includes('%2e')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Try to serve the file
    const fullPath = join(STATIC_DIR, filePath);
    
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      const ext = extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      
      console.log('[Server] 200:', filePath, mime);
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(fullPath));
      return;
    }

    // SPA fallback - serve index.html for client-side routing
    const indexPath = join(STATIC_DIR, 'index.html');
    if (existsSync(indexPath) && filePath.startsWith('/')) {
      console.log('[Server] SPA:', filePath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(readFileSync(indexPath));
      return;
    }
  }

  // 404
  console.log('[Server] 404:', url);
  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket server on /ws
const wss = new WebSocketServer({ server, path: '/ws' });

console.log('[Server] PrinceVChat starting on port', PORT);
console.log('[Server] Mode:', shouldServeStatic ? 'production' : 'dev');

function send(ws: WebSocket, msg: Msg): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(roomId: string, msg: Msg, excludeId?: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.clients.forEach((client, id) => {
    if (id !== excludeId) send(client, msg);
  });
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
          
          console.log('[Server] Join:', clientId, roomId, '| Users:', room.clients.size);
          
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
        if (room.clients.size === 0) rooms.delete(roomId);
        console.log('[Server] Leave:', clientId, roomId, '| Users:', room.clients.size || 0);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('[Server] Running http://localhost:' + PORT);
});

process.on('SIGINT', () => {
  wss.close(() => process.exit(0));
});