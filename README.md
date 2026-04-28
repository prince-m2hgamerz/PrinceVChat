# PrinceVChat

A modern, minimal group voice chat web app.

## Quick Start

### Prerequisites
- Node.js 18+

### Local Development

```bash
# Install dependencies
npm run install:all

# Start both client & server
npm run dev
```

- Client: http://localhost:5173
- Server: ws://localhost:3001

### Production

1. **Deploy WebSocket server separately** (Railway, Render, Fly.io, or AWS):
   ```bash
   cd server
   npm run build
   npm start
   ```

2. **Deploy client to Vercel**:
   ```bash
   cd client
   npm run build
   ```

3. Set `VITE_WS_URL` to your WebSocket server URL

## Usage

1. Open http://localhost:5173
2. Click "Create Voice Room"
3. Share the invite link
4. Others join and talk via WebRTC

## Tech Stack

- **Client**: TypeScript, Vite
- **Server**: Node.js, WebSocket (ws)
- **Audio**: WebRTC peer-to-peer

## Features

- Real-time voice chat (mesh network)
- No signup/login required
- No database (in-memory rooms)
- Speaking indicators
- Mute/unmute
- Copy invite link

## Package Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev servers |
| `npm run dev:client` | Start Vite dev server |
| `npm run dev:server` | Start WebSocket server |
| `npm run build` | Build client |
| `npm run install:all` | Install all dependencies |