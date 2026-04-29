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

    // SVG Icons for landing
    const lightningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    const shieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
    const zapIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;

    app.innerHTML = `
      <header class="header">
        <div class="header-inner">
          <a href="/" class="logo">
            <span class="logo-icon">🎙️</span>
            <span class="logo-text">PrinceVChat</span>
          </a>
        </div>
      </header>
      
      <main class="main">
        <div class="main-inner">
          <div class="landing">
            <div class="landing-hero">
              <h1 class="landing-title">Voice chat for teams</h1>
              <p class="landing-subtitle">
                Free, instant group voice chat with anyone. No downloads, no signups required.
              </p>
              <div class="landing-actions">
                <button class="btn btn-primary btn-lg" id="create-room-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  Create Room
                </button>
                <button class="btn btn-secondary btn-lg" id="join-room-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                  Join Room
                </button>
              </div>
            </div>
            
            <div class="features">
              <div class="feature-card">
                <div class="feature-icon">${zapIcon}</div>
                <h3 class="feature-title">Instant</h3>
                <p class="feature-desc">Create a room and share the link. Anyone can join immediately.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">${shieldIcon}</div>
                <h3 class="feature-title">Private</h3>
                <p class="feature-desc">Your conversations stay between you and your team.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">${lightningIcon}</div>
                <h3 class="feature-title">Low Latency</h3>
                <p class="feature-desc">Crystal clear voice with WebRTC. Sounds natural.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer class="footer">
        <div class="footer-inner">
          <span>PrinceVChat v<span class="version">1.0.19</span></span>
          <span>Free group voice chat</span>
        </div>
      </footer>
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

    app.innerHTML = `
      <div class="room-screen">
        <!-- Room Header -->
        <div class="room-hero">
          <div class="room-status">
            <span class="live-indicator">
              <span class="pulse-dot"></span>
              LIVE
            </span>
            <span class="participant-count" id="user-count">1 participant</span>
          </div>
          <h1 class="room-title">${this.escapeHtml(username)}'s Room</h1>
          <div class="invite-section">
            <input type="text" id="room-link" class="invite-input" value="${window.location.origin}/room/${roomId}" readonly />
            <button class="btn btn-primary invite-btn" id="copy-btn">
              ${icons.copy}
              <span>Copy Link</span>
            </button>
          </div>
        </div>

        <!-- Participants Grid -->
        <div class="participants-section">
          <div class="participants-grid" id="participants">
            ${this.renderParticipants()}
          </div>
        </div>

        <!-- Control Bar -->
        <div class="control-bar">
          <button class="control-button ${this.isMuted ? 'muted' : ''}" id="mute-btn">
            <span class="control-icon">${this.isMuted ? icons.micOff : icons.mic}</span>
            <span class="control-label">${this.isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button class="control-button ${this.isHandRaised ? 'active' : ''}" id="hand-btn">
            <span class="control-icon">${icons.hand}</span>
            <span class="control-label">${this.isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
          </button>
          <button class="control-button leave" id="leave-btn">
            <span class="control-icon">${icons.leave}</span>
            <span class="control-label">Leave</span>
          </button>
        </div>
      </div>
      
      <footer class="footer">
        <div class="footer-inner">
          <span>PrinceVChat v<span class="version">1.0.19</span></span>
          <span>Free voice chat</span>
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