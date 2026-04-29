/**
 * PrinceVChat - UI Manager (Vercel Style Enhanced)
 */

export class UIManager {
  private currentScreen: 'landing' | 'username' | 'room' = 'landing';
  private users = new Map<string, { id: string; name: string; isHost: boolean; speaking: boolean; handRaised: boolean }>();
  private localUserId: string | null = null;
  private roomId: string = '';
  private isMuted = false;
  private isHandRaised = false;
  
  // Callbacks
  private onCreateRoom: (() => void) | null = null;
  private onJoinRoom: (() => void) | null = null;
  private onMute: (() => void) | null = null;
  private onLeave: (() => void) | null = null;
  private onRaiseHand: (() => void) | null = null;

  render(): void {
    this.showLanding();
  }

  // Setters
  setOnCreateRoom(cb: () => void): void { this.onCreateRoom = cb; }
  setOnJoinRoom(cb: () => void): void { this.onJoinRoom = cb; }
  setOnMute(cb: () => void): void { this.onMute = cb; }
  setOnLeave(cb: () => void): void { this.onLeave = cb; }
  setOnRaiseHand(cb: () => void): void { this.onRaiseHand = cb; }
  setLocalUserId(id: string): void { this.localUserId = id; }

  // ==================== LANDING ====================
  showLanding(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;

    const plusIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    const joinIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4v4M10 17l5-5-5-5M15 12H3"/></svg>`;
    const boltIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    const lockIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    const micIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>`;

    app.innerHTML = `
      <div class="page">
        <nav class="navbar">
          <a href="/" class="nav-brand">
            <span class="brand-icon">🎙️</span>
            <span class="brand-text">PrinceVChat</span>
          </a>
        </nav>
        
        <main class="content">
          <section class="hero">
            <div class="hero-visual">
              <div class="mic-circle">
                ${micIcon}
              </div>
            </div>
            <h1 class="hero-title">Voice chat for teams</h1>
            <p class="hero-desc">Free, instant group voice chat. No downloads, no signups.</p>
            
            <div class="action-buttons">
              <button class="btn btn-primary" id="create-room-btn">
                ${plusIcon}
                Create Room
              </button>
              <button class="btn btn-outline" id="join-room-btn">
                ${joinIcon}
                Join Room
              </button>
            </div>
          </section>
          
          <section class="features">
            <div class="feature">
              <div class="feature-icon">${boltIcon}</div>
              <h3>Instant</h3>
              <p>Create a room and share the link</p>
            </div>
            <div class="feature">
              <div class="feature-icon">${lockIcon}</div>
              <h3>Private</h3>
              <p>End-to-end encrypted</p>
            </div>
            <div class="feature">
              <div class="feature-icon">${micIcon}</div>
              <h3>Clear Audio</h3>
              <p>WebRTC powered</p>
            </div>
          </section>
        </main>
        
        <footer class="site-footer">
          <div class="footer-main">
            <div class="footer-brand">🎙️ PrinceVChat</div>
            <p class="footer-desc">Free group voice chat for everyone</p>
          </div>
          <div class="footer-bottom">
            <span>v<span class="version">1.0.21</span></span>
            <span>•</span>
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </footer>
      </div>
    `;

    // Events
    document.getElementById('create-room-btn')?.addEventListener('click', () => this.showUsernameModal('create'));
    document.getElementById('join-room-btn')?.addEventListener('click', () => this.showUsernameModal('join'));
  }

  // ==================== USERNAME MODAL ====================
  private modalAction: 'create' | 'join' = 'create';

  showUsernameModal(action: 'create' | 'join'): void {
    this.modalAction = action;
    const app = document.getElementById('app');
    if (!app) return;

    // Check for existing room if joining
    let roomId = '';
    if (action === 'join') {
      const match = window.location.pathname.match(/\/room\/([^/]+)/);
      roomId = match ? match[1] : '';
    }

    app.innerHTML = `
      <header class="header">
        <div class="header-inner">
          <a href="/" class="logo">
            <span class="logo-mark">🎙️</span>
            <span class="logo-text">PrinceVChat</span>
          </a>
        </div>
      </header>
      
      <main class="main">
        <div class="modal-overlay" id="modal-overlay">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title">${action === 'create' ? 'Create a room' : 'Join a room'}</h2>
              <p class="modal-subtitle">Enter your name to get started</p>
            </div>
            
            <form id="username-form">
              <div class="form-group">
                <label class="form-label" for="username-input">Your Name</label>
                <input 
                  type="text" 
                  id="username-input" 
                  class="form-input" 
                  placeholder="Enter your name"
                  autocomplete="off"
                  required
                  maxlength="20"
                  autofocus
                />
              </div>
              
              ${action === 'join' ? `
                <div class="form-group">
                  <label class="form-label" for="room-input">Room Code</label>
                  <input 
                    type="text" 
                    id="room-input" 
                    class="form-input" 
                    placeholder="e.g. abc123"
                    value="${roomId}"
                    autocomplete="off"
                    required
                  />
                </div>
              ` : ''}
              
              <div class="form-actions">
                <button type="button" class="btn btn-ghost" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">
                  ${action === 'create' ? 'Create Room' : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    `;

    // Events
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.showLanding();
    });

    document.getElementById('cancel-btn')?.addEventListener('click', () => {
      this.showLanding();
    });

    document.getElementById('username-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('username-input') as HTMLInputElement;
      const roomInput = document.getElementById('room-input') as HTMLInputElement;
      
      const name = usernameInput?.value.trim();
      const room = roomInput?.value.trim();

      if (name) {
        localStorage.setItem('username', name);
        
        if (this.modalAction === 'create') {
          this.onCreateRoom?.();
        } else if (room) {
          window.history.replaceState(null, '', `/room/${room}`);
          this.onJoinRoom?.();
        }
      }
    });

    // Focus
    setTimeout(() => document.getElementById('username-input')?.focus(), 100);
  }

  // ==================== SVG ICONS ====================
  private getIcons() {
    return {
      mic: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
      micOff: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
      hand: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>`,
      leave: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-4h7"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
      copy: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
      micIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>`,
    };
  }

  // ==================== ROOM ====================
  showRoom(roomId: string, hostName: string = 'You'): void {
    this.currentScreen = 'room';
    this.roomId = roomId;
    const app = document.getElementById('app');
    if (!app) return;

    // Get saved name
    const username = localStorage.getItem('username') || hostName;
    const icons = this.getIcons();

    // Add self
    this.users.clear();
    this.users.set(this.localUserId!, {
      id: this.localUserId!,
      name: username,
      isHost: true,
      speaking: false,
      handRaised: false
    });

    const backIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
    const copyIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

    app.innerHTML = `
      <div class="page room-page">
        <header class="room-nav">
          <a href="/" class="nav-back">${backIcon}</a>
          <div class="room-info">
            <h1 class="room-title">${this.escapeHtml(username)}'s Room</h1>
            <span class="room-status">
              <span class="status-dot"></span>
              <span class="user-count" id="user-count">1 participant</span>
            </span>
          </div>
          <button class="btn-copy" id="copy-btn">${copyIcon}</button>
        </header>

        <main class="room-content">
          <div class="link-bar">
            <input type="text" id="room-link" class="link-input" value="${window.location.origin}/room/${roomId}" readonly />
          </div>
          
          <div class="participants-list" id="participants">
            ${this.renderParticipants()}
          </div>
        </main>

        <div class="room-controls">
          <button class="ctrl-btn ${this.isMuted ? 'off' : ''}" id="mute-btn">
            ${this.isMuted ? icons.micOff : icons.mic}
          </button>
          <button class="ctrl-btn ${this.isHandRaised ? 'on' : ''}" id="hand-btn">
            ${icons.hand}
          </button>
          <button class="ctrl-btn danger" id="leave-btn">
            ${icons.leave}
          </button>
        </div>
      </div>
      
      <footer class="site-footer">
        <div class="footer-main">
          <div class="footer-brand">🎙️ PrinceVChat</div>
          <p class="footer-desc">Free group voice chat</p>
        </div>
        <div class="footer-bottom">
          <span>v<span class="version">1.0.21</span></span>
        </div>
      </footer>
      
      <div class="toast-container" id="toast-container"></div>
    `;

    // Events
    document.getElementById('copy-btn')?.addEventListener('click', () => {
      const input = document.getElementById('room-link') as HTMLInputElement;
      navigator.clipboard.writeText(input.value);
      this.showToast('Link copied!', 'success');
    });

    const roomIcons = this.getIcons();
    
    document.getElementById('mute-btn')?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      const btn = document.getElementById('mute-btn');
      if (btn) {
        btn.classList.toggle('muted', this.isMuted);
        btn.innerHTML = this.isMuted ? roomIcons.micOff : roomIcons.mic;
      }
      this.onMute?.();
    });

    document.getElementById('hand-btn')?.addEventListener('click', () => {
      this.isHandRaised = !this.isHandRaised;
      const btn = document.getElementById('hand-btn');
      btn?.classList.toggle('active', this.isHandRaised);
      this.onRaiseHand?.();
    });

    document.getElementById('leave-btn')?.addEventListener('click', () => {
      this.onLeave?.();
    });
  }

  private renderParticipants(): string {
    const users = Array.from(this.users.values());
    
    if (users.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3 class="empty-state-title">Waiting for others...</h3>
          <p class="empty-state-desc">Share the link to invite people</p>
        </div>
      `;
    }

    return users.map(user => {
      const isSelf = user.id === this.localUserId;
      const status = user.handRaised ? '✋ Hand raised' : (user.speaking ? 'Speaking...' : (isSelf ? 'You' : 'Connected'));
      return `
        <div class="participant ${user.isHost ? 'host' : ''} ${user.speaking ? 'speaking' : ''} ${user.handRaised ? 'hand-up' : ''}">
          ${isSelf ? '<span class="participant-you">You</span>' : ''}
          ${user.isHost && !isSelf ? '<span class="participant-host-badge">Host</span>' : ''}
          ${user.handRaised ? '<span class="hand-icon">✋</span>' : ''}
          <div class="participant-avatar">${this.getInitials(user.name)}</div>
          <div class="participant-name">${this.escapeHtml(user.name)}</div>
          <div class="participant-status">${status}</div>
        </div>
      `;
    }).join('');
  }

  // ==================== USER MANAGEMENT ====================
  addUser(userId: string, isHost: boolean, name?: string): void {
    this.users.set(userId, {
      id: userId,
      name: name || 'User-' + userId.slice(-4),
      isHost,
      speaking: false,
      handRaised: false
    });
    this.updateParticipants();
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    this.updateParticipants();
  }

  setUserSpeaking(userId: string, speaking: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.speaking = speaking;
      this.updateParticipants();
    }
  }

  // Set own hand raised state
  setHandRaised(raised: boolean): void {
    this.isHandRaised = raised;
    const btn = document.getElementById('hand-btn');
    if (btn) {
      btn.classList.toggle('active', raised);
    }
    this.updateParticipants();
  }

  // Set another user's hand raised state
  setUserHandRaised(userId: string, raised: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.handRaised = raised;
      this.updateParticipants();
    }
  }

  getUserName(userId: string): string | undefined {
    return this.users.get(userId)?.name;
  }

  private updateParticipants(): void {
    const container = document.getElementById('participants');
    if (container && this.currentScreen === 'room') {
      container.innerHTML = this.renderParticipants();
      this.updateUserCount();
    }
  }

  private updateUserCount(): void {
    const count = this.users.size;
    const el = document.getElementById('user-count');
    if (el) {
      el.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
    }
  }

  // ==================== TOAST ====================
  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // ==================== HELPERS ====================
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}