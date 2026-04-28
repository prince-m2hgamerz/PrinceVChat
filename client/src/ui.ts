/**
 * PrinceVChat - Vercel-inspired Modern UI
 * Clean, minimal design with excellent UX
 */

// Export icons for use in UI
export const ICONS = {
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  micOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  link: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  phoneOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.31 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.31-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  volume2: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  volumeX: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  loading: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`,
};

interface UIState {
  roomId: string | null;
  userCount: number;
  isMuted: boolean;
  isConnected: boolean;
}

export class UIManager {
  private state: UIState = {
    roomId: null,
    userCount: 1,
    isMuted: false,
    isConnected: false,
  };

  private elements: Record<string, HTMLElement | HTMLInputElement> = {} as Record<string, HTMLElement | HTMLInputElement>;
  private callbacks: Record<string, (() => void) | null> = {
    onCreateRoom: null,
    onCopyLink: null,
    onToggleMute: null,
    onLeave: null,
  };

  constructor() {
    this.init();
  }

  private init(): void {
    const app = document.getElementById('app');
    if (!app) return;

    this.injectStyles();
    this.createLandingPage();
    this.createRoomPage();
    this.createToast();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      *, *::before, *::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      :root {
        --bg: #0c0c0c;
        --bg-secondary: #171717;
        --bg-tertiary: #222222;
        --border: #2e2e2e;
        --border-hover: #3e3e3e;
        --text: #e5e5e5;
        --text-secondary: #a3a3a3;
        --text-tertiary: #737373;
        --accent: #fff;
        --accent-bg: #262626;
        --success: #10b981;
        --error: #ef4444;
        --warning: #f59e0b;
        --radius: 8px;
        --radius-lg: 12px;
      }

      html, body {
        height: 100%;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      #app {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .hidden { display: none !important; }
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .gap-2 { gap: 8px; }
      .gap-3 { gap: 12px; }
      .gap-4 { gap: 16px; }
      .gap-6 { gap: 24px; }

      /* Main container */
      .main-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      /* Card */
      .card {
        width: 100%;
        max-width: 420px;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 32px;
      }

      .card-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .logo {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .logo-icon {
        width: 40px;
        height: 40px;
        background: var(--accent);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo-icon svg {
        width: 22px;
        height: 22px;
        color: var(--bg);
      }

      .logo-text {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }

      .tagline {
        color: var(--text-secondary);
        font-size: 14px;
      }

      /* Form elements */
      .form-group {
        margin-bottom: 16px;
      }

      .form-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }

      .input {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .input:focus {
        border-color: var(--text-tertiary);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.05);
      }

      .input:read-only {
        cursor: pointer;
        background: var(--bg);
      }

      .link-row {
        display: flex;
        gap: 8px;
      }

      .link-row .input {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 13px;
      }

      /* Buttons */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: var(--radius);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
        outline: none;
        text-decoration: none;
      }

      .btn-primary {
        width: 100%;
        background: var(--accent);
        color: var(--bg);
      }

      .btn-primary:hover {
        background: #f5f5f5;
      }

      .btn-primary:active {
        transform: scale(0.98);
      }

      .btn-secondary {
        background: var(--accent-bg);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .btn-secondary:hover {
        background: var(--bg-tertiary);
        border-color: var(--border-hover);
      }

      .btn-ghost {
        background: transparent;
        color: var(--text-secondary);
      }

      .btn-ghost:hover {
        color: var(--text);
        background: var(--accent-bg);
      }

      .btn-danger {
        background: rgba(239, 68, 68, 0.1);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }

      .btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
      }

      .btn-icon {
        padding: 0;
        width: 36px;
        height: 36px;
      }

      .btn svg {
        flex-shrink: 0;
      }

      /* User list */
      .user-list {
        margin: 24px 0;
      }

      .user-list-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .user-list-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-secondary);
      }

      .user-count {
        background: var(--accent-bg);
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
      }

      .user-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .user-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--bg);
        border-radius: var(--radius);
        transition: background 0.15s;
      }

      .user-item:hover {
        background: var(--bg-tertiary);
      }

      .user-avatar {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        flex-shrink: 0;
      }

      .user-info {
        flex: 1;
        min-width: 0;
      }

      .user-name {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-status {
        font-size: 12px;
        color: var(--text-tertiary);
      }

      .speaking {
        width: 8px;
        height: 8px;
        background: var(--success);
        border-radius: 50%;
        animation: pulse 1s ease-in-out infinite;
        flex-shrink: 0;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.3); }
      }

      /* Controls */
      .controls {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }

      .controls .btn {
        flex: 1;
      }

      /* Toast */
      .toast-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
      }

      .toast {
        padding: 10px 16px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-size: 13px;
        color: var(--text);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.2s ease;
      }

      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .toast.success {
        border-color: var(--success);
        color: var(--success);
      }

      .toast.error {
        border-color: var(--error);
        color: var(--error);
      }

      /* Loading */
      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--border);
        border-top-color: var(--text);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 24px;
        color: var(--text-tertiary);
        font-size: 13px;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .card {
          padding: 24px;
        }

        .controls {
          flex-direction: column;
        }

        .controls .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createLandingPage(): void {
    const container = document.createElement('div');
    container.id = 'landing-page';
    container.className = 'main-container';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="logo">
            <div class="logo-icon">${ICONS.mic}</div>
            <span class="logo-text">PrinceVChat</span>
          </div>
          <p class="tagline">Free group voice chat. No signup. No download.</p>
        </div>
        <button id="btn-create-room" class="btn btn-primary">
          ${ICONS.plus}
          Create Voice Room
        </button>
      </div>
    `;

    document.getElementById('app')?.appendChild(container);
    (this.elements as any)['btn-create-room'] = container.querySelector('#btn-create-room')!;
  }

  private createRoomPage(): void {
    const container = document.createElement('div');
    container.id = 'room-page';
    container.className = 'main-container hidden';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="logo">
            <div class="logo-icon">${ICONS.mic}</div>
            <span class="logo-text">PrinceVChat</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">INVITE LINK</label>
          <div class="link-row">
            <input id="room-link" class="input" type="text" readonly />
            <button id="btn-copy-link" class="btn btn-secondary btn-icon" title="Copy link">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="user-list">
          <div class="user-list-header">
            <span class="user-list-title">${ICONS.users} Participants</span>
            <span id="user-count" class="user-count">1</span>
          </div>
          <div id="user-items" class="user-items"></div>
        </div>

        <div class="controls">
          <button id="btn-mute" class="btn btn-secondary">
            <span id="mic-icon">${ICONS.volume2}</span>
            <span id="mute-text">Mute</span>
          </button>
          <button id="btn-leave" class="btn btn-danger">
            ${ICONS.phoneOff}
            Leave
          </button>
        </div>
      </div>
    `;

    document.getElementById('app')?.appendChild(container);
    (this.elements as any)['room-link'] = container.querySelector('#room-link')!;
    (this.elements as any)['btn-copy-link'] = container.querySelector('#btn-copy-link')!;
    (this.elements as any)['user-count'] = container.querySelector('#user-count')!;
    (this.elements as any)['user-items'] = container.querySelector('#user-items')!;
    (this.elements as any)['btn-mute'] = container.querySelector('#btn-mute')!;
    (this.elements as any)['btn-leave'] = container.querySelector('#btn-leave')!;
    (this.elements as any)['mic-icon'] = container.querySelector('#mic-icon')!;
    (this.elements as any)['mute-text'] = container.querySelector('#mute-text')!;
  }

  private createToast(): void {
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.innerHTML = `<div id="toast" class="toast"></div>`;
    document.getElementById('app')?.appendChild(container);
    (this.elements as any)['toast'] = container.querySelector('#toast')!;
  }

  showLandingPage(): void {
    document.getElementById('landing-page')?.classList.remove('hidden');
    document.getElementById('room-page')?.classList.add('hidden');
  }

  showRoomPage(roomId: string): void {
    document.getElementById('landing-page')?.classList.add('hidden');
    document.getElementById('room-page')?.classList.remove('hidden');

    const link = `${window.location.origin}/room/${roomId}`;
    (this.elements['room-link'] as HTMLInputElement).value = link;
    this.state.roomId = roomId;
  }

  updateUserCount(count: number): void {
    const el = document.getElementById('user-count');
    if (el) el.textContent = count.toString();
    this.state.userCount = count;
  }

  addUser(peerId: string, isSelf: boolean = false): void {
    const userItems = this.elements['user-items'] as HTMLElement;
    if (!userItems) return;

    const name = isSelf ? 'You' : peerId.substring(0, 8);
    const initials = name.substring(0, 2).toUpperCase();

    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.id = `user-${peerId}`;
    userItem.innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${name}</div>
        <div class="user-status">${isSelf ? 'Host' : 'Connected'}</div>
      </div>
      <div class="speaking hidden"></div>
    `;

    userItems.appendChild(userItem);
    this.updateUserCount(this.state.userCount + 1);
  }

  removeUser(peerId: string): void {
    const userItem = document.getElementById(`user-${peerId}`);
    if (userItem) userItem.remove();
    this.updateUserCount(Math.max(1, this.state.userCount - 1));
  }

  setUserSpeaking(peerId: string, speaking: boolean): void {
    const userItem = document.getElementById(`user-${peerId}`);
    if (!userItem) return;

    const indicator = userItem.querySelector('.speaking');
    if (indicator) {
      indicator.classList.toggle('hidden', !speaking);
    }

    const status = userItem.querySelector('.user-status');
    if (status) {
      status.textContent = speaking ? 'Speaking...' : 'Connected';
    }
  }

  setMuted(muted: boolean): void {
    this.state.isMuted = muted;
    const micIcon = document.getElementById('mic-icon');
    const muteText = document.getElementById('mute-text');

    if (micIcon) {
      micIcon.innerHTML = muted ? ICONS.volumeX : ICONS.volume2;
    }
    if (muteText) {
      muteText.textContent = muted ? 'Unmute' : 'Mute';
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast visible ${type}`;

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }

  setOnCreateRoom(callback: () => void): void {
    this.callbacks.onCreateRoom = callback;
    const btn = document.getElementById('btn-create-room');
    if (btn) {
      btn.onclick = () => this.callbacks.onCreateRoom?.();
    }
  }

  setOnCopyLink(callback: () => void): void {
    this.callbacks.onCopyLink = callback;
    const btn = document.getElementById('btn-copy-link');
    if (btn) {
      btn.onclick = () => {
        const input = document.getElementById('room-link') as HTMLInputElement;
        if (input) {
          input.select();
          navigator.clipboard.writeText(input.value);
          this.showToast('Link copied!', 'success');
        }
        this.callbacks.onCopyLink?.();
      };
    }
  }

  setOnToggleMute(callback: () => void): void {
    this.callbacks.onToggleMute = callback;
    const btn = document.getElementById('btn-mute');
    if (btn) {
      btn.onclick = () => this.callbacks.onToggleMute?.();
    }
  }

  setOnLeave(callback: () => void): void {
    this.callbacks.onLeave = callback;
    const btn = document.getElementById('btn-leave');
    if (btn) {
      btn.onclick = () => this.callbacks.onLeave?.();
    }
  }
}