# PrinceVChat

A modern, free group voice chat web app.

## Features

- 🎤 Real-time group voice chat (WebRTC)
- 🔗 Shareable invite links (`/room/xyz123`)
- 👤 No signup required
- 📱 Works on all modern browsers
- 🌍 No database (in-memory rooms)

---

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (Vite)
npm run dev

# Open http://localhost:5173
```

### Build & Run Production

```bash
# Build client
npm run build

# Start production server
npm start
```

---

## Railway Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "PrinceVChat"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PrinceVChat.git
git push -u origin main
```

### 2. Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select PrinceVChat repo
5. Click "Deploy"

### 3. Done!

- Get your URL: `https://your-app.railway.app`
- Share the link with friends!

---

## Architecture

Single Railway instance runs:
- **Static Files** → Built client `/dist`
- **WebSocket** → Signaling at `/ws`

```
┌─────────────────────────────────────┐
│         Railway Instance             │
│  ┌─────────────────────────────┐  │
│  │  Static UI (HTML/JS/CSS)   │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │  WebSocket (/ws)             │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Project Structure

```
PrinceVChat/
├── server.ts          # Unified server (static + WebSocket)
├── vite.config.ts    # Vite build config
├── package.json    # Dependencies & scripts
├── tsconfig.json   # TypeScript config
├── client/
│   ├── index.html  # Entry point
│   ├── favicon.svg # Icon
│   └── src/
│       ├── main.ts    # Entry
│       ├── app.ts    # Main app
│       ├── socket.ts  # WebSocket client
│       ├── webrtc.ts # WebRTC (audio)
│       └── ui.ts    # UI (Vercel-style)
└── DEPLOY.md       # Deploy guide
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | Vite + TypeScript |
| Server | Node.js (ws) |
| Voice | WebRTC (peer-to-peer) |
| Deploy | Railway |