/**
 * PrinceVChat - Unified Server with Supabase & Security
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

// Environment
const PORT = parseInt(process.env.PORT || '3000', 10);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nyixcwollfqiojulsznw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// MIME Types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

// In-memory storage
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

// ============ SUPABASE CLIENT ============
async function supabaseRequest(table: string, method: string, body?: unknown, query?: string) {
  if (!SUPABASE_KEY) {
    console.log('[Supabase] No key configured, skipping...');
    return null;
  }
  
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (query) url += '?' + query;

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': method === 'POST' ? 'return=minimal' : 'return=minimal',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Supabase] Error:', res.status, errorText);
      return { error: errorText };
    }
    
    return await res.json();
  } catch (e) {
    console.error('[Supabase] Exception:', e);
    return null;
  }
}

// ============ INIT SUPABASE TABLES ============
async function initSupabaseTables() {
  console.log('[Supabase] Initializing tables...');
  console.log('[Supabase] URL:', SUPABASE_URL);
  console.log('[Supabase] Key exists:', !!SUPABASE_KEY);
  
  // Create rooms table
  await supabaseRequest('rooms', 'POST', {
    id: 'init_check',
    name: 'init_check',
    is_active: false,
  }, 'on_conflict=id');
  
  // Create room_participants table  
  await supabaseRequest('room_participants', 'POST', {
    room_id: 'init_check',
    user_id: 'init_check',
    is_host: false,
  }, 'on_conflict=room_id,user_id');
  
  console.log('[Supabase] Tables initialized');
}

// Run init
initSupabaseTables();

// ============ HTTP SERVER ============
const server = createServer((req, res) => {
  // Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self)');
  res.removeHeader('X-Powered-By');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  // Health check
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, static: hasStatic }));
    return;
  }
  
  // Debug - check Supabase data
  if (url === '/debug-supabase') {
    const rooms = await supabaseRequest('rooms', 'GET', undefined, 'select=*&limit=20');
    const participants = await supabaseRequest('room_participants', 'GET', undefined, 'select=*&limit=20');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      supabaseKeyConfigured: !!SUPABASE_KEY,
      rooms: rooms, 
      participants: participants 
    }));
    return;
  }

  // Static files
  if (hasStatic) {
    let filePath = url.split('?')[0];
    if (filePath === '/') filePath = '/index.html';
    if (filePath.includes('..')) { res.writeHead(403); res.end('Forbidden'); return; }

    const fullPath = join(STATIC_DIR, filePath);
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      const ext = extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(fullPath));
      return;
    }

    // SPA fallback for routes
    if (filePath.startsWith('/room')) {
      const indexPath = join(STATIC_DIR, 'index.html');
      if (existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(readFileSync(indexPath));
        return;
      }
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

// ============ WEBSOCKET SERVER ============
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

wss.on('connection', (ws: WebSocket) => {
  let clientId: string | null = null;
  let roomId: string | null = null;

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'join') {
        roomId = msg.roomId;
        clientId = msg.userId || 'u-' + Math.random().toString(36).substring(2, 10);
        const username = msg.username || 'User-' + clientId.slice(-4);
        
        // Create/get room
        if (!rooms.has(roomId)) rooms.set(roomId, { id: roomId, clients: new Map() });
        const room = rooms.get(roomId)!;
        room.clients.set(clientId, { id: clientId, ws, username });
        
        console.log('[Server] Join:', username, clientId, roomId);
        
        // First, ensure room exists in Supabase
        supabaseRequest('rooms', 'POST', {
          id: roomId,
          name: `Room ${roomId}`,
          is_active: true,
          created_at: new Date().toISOString(),
        }, 'on_conflict=id');

        // Save/Update participant in Supabase (upsert)
        const participantResult = await supabaseRequest('room_participants', 'POST', {
          room_id: roomId,
          user_id: clientId,
          username: username,
          is_host: room.clients.size === 1,
          joined_at: new Date().toISOString(),
          is_hand_raised: false,
          left_at: null,
        }, 'on_conflict=room_id,user_id');
        
        console.log('[Supabase] Participant saved:', participantResult);
        
        // Send participant list
        const participants = Array.from(room.clients.values()).map(c => ({
          id: c.id,
          username: c.username,
        }));
        
        send(ws, { type: 'room-users', roomId, userId: clientId, payload: participants });
        
        // Notify others about new user
        broadcast(room, { type: 'user-joined', roomId, userId: clientId, username }, clientId);
        console.log('[Server] Broadcast user-joined to', room.clients.size - 1, 'clients');
      }
      else if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
        if (roomId && msg.targetUserId) {
          const room = rooms.get(roomId);
          const target = room?.clients.get(msg.targetUserId);
          if (target) send(target.ws, { type: msg.type, roomId, userId: clientId!, payload: msg.payload });
        }
      }
      else if (msg.type === 'raise-hand') {
        // Broadcast raise hand
        if (roomId) {
          const room = rooms.get(roomId);
          if (room) {
            broadcast(room, { type: 'raise-hand', roomId, userId: clientId, raised: msg.raised }, clientId);
            
            // Update Supabase
            supabaseRequest('room_participants', 'PATCH', {
              is_hand_raised: msg.raised,
            }, `room_id=eq.${roomId}&user_id=eq.${clientId}`);
          }
        }
      }
      else if (msg.type === 'chat') {
        if (roomId) {
          const room = rooms.get(roomId);
          if (room) {
            const client = room.clients.get(clientId!);
            broadcast(room, { type: 'chat', roomId, userId: clientId, username: client?.username, message: msg.message, timestamp: Date.now() }, clientId);
          }
        }
      }
    } catch (e) { console.error('[Server] Error:', e); }
  });

  ws.on('close', async () => {
    if (roomId && clientId) {
      const room = rooms.get(roomId);
      if (room) {
        room.clients.delete(clientId);
        broadcast(room, { type: 'user-left', roomId, userId: clientId });
        
        // Update Supabase
        supabaseRequest('room_participants', 'PATCH', {
          left_at: new Date().toISOString(),
        }, `room_id=eq.${roomId}&user_id=eq.${clientId}`);
        
        if (room.clients.size === 0) {
          rooms.delete(roomId);
          supabaseRequest('rooms', 'PATCH', { is_active: false }, `id=eq.${roomId}`);
        }
        console.log('[Server] Leave:', clientId, roomId);
      }
    }
  });
});

server.listen(PORT, () => console.log('[Server] Ready on port:', PORT));
process.on('SIGINT', () => wss.close(() => process.exit(0)));