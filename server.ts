/**
 * PrinceVChat - Unified Server with Supabase & Security
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

// Environment - Railway env vars take priority
const PORT = parseInt(process.env.PORT || '3000', 10);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Debug
console.log('[Server] PORT:', PORT);
console.log('[Server] SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('[Server] SUPABASE_KEY:', SUPABASE_KEY ? 'SET (' + SUPABASE_KEY.length + ' chars)' : 'NOT SET');

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
  isHost: boolean;
  handRaised: boolean;
  videoOn: boolean;
}

interface Room {
  id: string;
  hostId: string;
  hostName: string;
  clients: Map<string, Client>;
  chatHistory: { userId: string; username: string; message: string; timestamp: number }[];
  isLocked: boolean;
}

const rooms = new Map<string, Room>();
const STATIC_DIR = join(process.cwd(), 'dist');
const hasStatic = existsSync(STATIC_DIR) && statSync(STATIC_DIR).isDirectory();

// ============ SUPABASE CLIENT ============
async function supabaseRequest(table: string, method: string, body?: unknown, query?: string): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[Supabase] Skipping - no credentials configured');
    return null;
  }
  
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (query) url += '?' + query;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    };
    
    // Add upsert header for POST with on_conflict
    if (method === 'POST' && query?.includes('on_conflict')) {
      headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    
    if (!res.ok) {
      console.log(`[Supabase] Error ${method} ${table}:`, res.status, text);
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    console.error('[Supabase] Request failed:', e);
    return null;
  }
}

// Save room to Supabase
async function saveRoom(roomId: string, hostName: string, hostId: string) {
  const result = await supabaseRequest('rooms', 'POST', {
    id: roomId,
    name: `${hostName}'s Room`,
    is_active: true,
    created_at: new Date().toISOString()
  }, 'on_conflict=id');
  console.log('[Supabase] Room saved:', roomId, result ? 'OK' : 'FAILED');
}

// Save participant to Supabase
async function saveParticipant(roomId: string, clientId: string, username: string, isHost: boolean) {
  const result = await supabaseRequest('room_participants', 'POST', {
    room_id: roomId,
    user_id: clientId,
    username: username,
    is_host: isHost,
    joined_at: new Date().toISOString(),
  }, 'on_conflict=room_id,user_id');
  console.log('[Supabase] Participant saved:', username, result ? 'OK' : 'FAILED');
}

// Mark participant as left
async function markParticipantLeft(roomId: string, clientId: string) {
  await supabaseRequest('room_participants', 'PATCH', {
    left_at: new Date().toISOString(),
  }, `room_id=eq.${roomId}&user_id=eq.${clientId}`);
}

// Update hand raised status
async function updateHandRaised(roomId: string, clientId: string, raised: boolean) {
  await supabaseRequest('room_participants', 'PATCH', {
    is_hand_raised: raised,
  }, `room_id=eq.${roomId}&user_id=eq.${clientId}`);
}

// Deactivate room
async function deactivateRoom(roomId: string) {
  await supabaseRequest('rooms', 'PATCH', { is_active: false }, `id=eq.${roomId}`);
}

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
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(self), display-capture=(self)');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' wss: https:; img-src 'self' data: blob:; media-src 'self' blob:; frame-ancestors 'none';");
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
    res.end(JSON.stringify({ 
      status: 'ok', 
      rooms: rooms.size, 
      static: hasStatic, 
      supabase: !!SUPABASE_KEY,
      dev: 'm2hgamerz' 
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
      const headers: Record<string, string> = { 'Content-Type': mime };
      // Cache static assets (JS/CSS) for 1 day, HTML never cached
      if (ext !== '.html') {
        headers['Cache-Control'] = 'public, max-age=86400, immutable';
      } else {
        headers['Cache-Control'] = 'no-cache';
      }
      res.writeHead(200, headers);
      res.end(readFileSync(fullPath));
      return;
    }

    // SPA fallback for routes
    if (filePath.startsWith('/room') || filePath.startsWith('/changelog')) {
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

function send(ws: WebSocket, msg: any) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcastToAll(room: Room, msg: any) {
  room.clients.forEach((client) => {
    send(client.ws, msg);
  });
}

function broadcastToOthers(room: Room, msg: any, excludeId: string) {
  room.clients.forEach((client, id) => {
    if (id !== excludeId) send(client.ws, msg);
  });
}

wss.on('connection', (ws: WebSocket) => {
  let clientId: string | null = null;
  let roomId: string | null = null;
  let lastMessageTime = 0;
  const MESSAGE_RATE_LIMIT_MS = 100; // 10 messages per second max
  const MAX_PAYLOAD_SIZE = 16384; // 16KB max per message

  ws.on('message', async (data) => {
    try {
      // Security: Payload size check
      if (data.toString().length > MAX_PAYLOAD_SIZE) {
        console.log('[Security] Payload too large');
        ws.close();
        return;
      }

      // Security: Rate limiting
      const now = Date.now();
      if (now - lastMessageTime < MESSAGE_RATE_LIMIT_MS) {
        return; // Silently drop spam
      }
      lastMessageTime = now;

      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'join') {
        // Security: Validate Room ID
        if (!msg.roomId || typeof msg.roomId !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(msg.roomId)) {
          console.log('[Security] Invalid Room ID:', msg.roomId);
          return;
        }

        roomId = msg.roomId;
        clientId = msg.userId || 'u-' + Math.random().toString(36).substring(2, 10);
        
        // Security: Sanitize username
        let username = (msg.username || 'User-' + clientId.slice(-4)).substring(0, 20).replace(/[<>]/g, '');
        
        // Create/get room
        const isNewRoom = !rooms.has(roomId!);
        if (isNewRoom) {
          rooms.set(roomId!, { 
            id: roomId!, 
            hostId: clientId, 
            hostName: username, 
            clients: new Map(),
            chatHistory: [],
            isLocked: false
          });
        }
        const room = rooms.get(roomId!)!;

        // Security: Check if room is locked
        const isHost = isNewRoom || room.clients.size === 0;
        if (room.isLocked && !isHost) {
          send(ws, { type: 'error', message: 'Room is locked by host' });
          return;
        }
        
        if (isHost) {
          room.hostId = clientId;
          room.hostName = username;
        }
        
        room.clients.set(clientId, { 
          id: clientId, ws, username, 
          isHost, 
          handRaised: false,
          videoOn: false
        });
        
        console.log('[Server] Join:', username, clientId, roomId, isHost ? '(HOST)' : '');
        
        // Save to Supabase
        if (isHost) {
          saveRoom(roomId!, username, clientId);
        }
        saveParticipant(roomId!, clientId, username, isHost);
        
        // Send participant list WITH host info and hand states
        const participants = Array.from(room.clients.values()).map(c => ({
          id: c.id,
          username: c.username,
          isHost: c.isHost,
          handRaised: c.handRaised,
          videoOn: c.videoOn
        }));
        
        send(ws, { 
          type: 'room-users', 
          roomId, 
          userId: clientId, 
          hostName: room.hostName,
          payload: participants 
        });
        
        // Send recent chat history to new user
        if (room.chatHistory.length > 0) {
          for (const chatMsg of room.chatHistory.slice(-50)) {
            send(ws, { 
              type: 'chat', 
              roomId, 
              userId: chatMsg.userId, 
              username: chatMsg.username, 
              message: chatMsg.message, 
              timestamp: chatMsg.timestamp 
            });
          }
        }
        
        // Notify others about new user
        broadcastToOthers(room, { 
          type: 'user-joined', roomId, userId: clientId, username 
        }, clientId);
        
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
        if (roomId && clientId) {
          const room = rooms.get(roomId);
          if (room) {
            const client = room.clients.get(clientId);
            if (client) {
              client.handRaised = !!msg.raised;
            }
            
            console.log('[Server] Hand raise:', clientId, msg.raised);
            
            // Broadcast to ALL users including sender
            broadcastToAll(room, { 
              type: 'raise-hand', 
              roomId, 
              userId: clientId, 
              raised: !!msg.raised 
            });
            
            // Update Supabase
            updateHandRaised(roomId, clientId, !!msg.raised);
          }
        }
      }
      else if (msg.type === 'chat') {
        if (roomId && clientId) {
          const room = rooms.get(roomId);
          if (room) {
            const client = room.clients.get(clientId);
            // Security: Sanitize chat message - strip HTML, limit length
            const rawMsg = (msg.message || '').substring(0, 500).replace(/[<>]/g, '');
            const chatMsg = {
              userId: clientId,
              username: client?.username || 'User',
              message: rawMsg,
              timestamp: Date.now(),
            };
            
            console.log('[Server] Chat:', chatMsg.username, ':', chatMsg.message);
            
            // Store in room history
            room.chatHistory.push(chatMsg);
            if (room.chatHistory.length > 100) {
              room.chatHistory = room.chatHistory.slice(-100);
            }
            
            // Broadcast to ALL users including sender
            broadcastToAll(room, { 
              type: 'chat', 
              roomId, 
              ...chatMsg
            });
          }
        }
      }
      else if (msg.type === 'reaction') {
        if (roomId && clientId) {
          const room = rooms.get(roomId);
          if (room) {
            console.log('[Server] Reaction:', clientId, msg.emoji);
            // Broadcast to others (sender already shows it locally)
            broadcastToOthers(room, {
              type: 'reaction',
              roomId,
              userId: clientId,
              emoji: msg.emoji
            }, clientId);
          }
        }
      }
      else if (msg.type === 'video-toggle') {
        if (roomId && clientId) {
          const room = rooms.get(roomId);
          const client = room?.clients.get(clientId);
          if (room && client) {
            client.videoOn = !!msg.enabled;
            broadcastToOthers(room, {
              type: 'video-toggle',
              roomId,
              userId: clientId,
              enabled: client.videoOn
            }, clientId);
          }
        }
      }
      else if (msg.type === 'toggle-lock') {
        if (roomId && clientId) {
          const room = rooms.get(roomId);
          const client = room?.clients.get(clientId);
          if (room && client && client.isHost) {
            room.isLocked = !!msg.locked;
            broadcastToAll(room, {
              type: 'room-locked',
              roomId,
              locked: room.isLocked
            });
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
        broadcastToOthers(room, { type: 'user-left', roomId, userId: clientId }, '');
        
        // Update Supabase
        markParticipantLeft(roomId, clientId);
        
        if (room.clients.size === 0) {
          rooms.delete(roomId);
          deactivateRoom(roomId);
        }
        console.log('[Server] Leave:', clientId, roomId);
      }
    }
  });
});

server.listen(PORT, () => console.log('[Server] Ready on port:', PORT));
process.on('SIGINT', () => wss.close(() => process.exit(0)));