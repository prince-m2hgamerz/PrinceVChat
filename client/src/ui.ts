/**
 * PrinceVChat - UI Manager (Vercel Style Enhanced)
 */

export class UIManager {
  private currentScreen: 'landing' | 'username' | 'room' = 'landing';
  private users = new Map<string, { id: string; name: string; isHost: boolean; speaking: boolean }>();
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

    app.innerHTML = `
      <header class="header">
        <div class="header-inner">
          <a href="/" class="logo">
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
                  Create Room
                </button>
                <button class="btn btn-secondary btn-lg" id="join-room-btn">
                  Join Room
                </button>
              </div>
            </div>
            
            <div class="features">
              <div class="feature-card">
                <div class="feature-icon">🚀</div>
                <h3 class="feature-title">Instant</h3>
                <p class="feature-desc">Create a room and share the link. Anyone can join immediately.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🔒</div>
                <h3 class="feature-title">Private</h3>
                <p class="feature-desc">Your conversations stay between you and your team.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3 class="feature-title">Low Latency</h3>
                <p class="feature-desc">Crystal clear voice with WebRTC. Sounds natural.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer class="footer">
        <div class="footer-inner">
          <span>PrinceVChat v<span class="version">1.0.10</span></span>
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

  // ==================== ROOM ====================
  showRoom(roomId: string, hostName: string = 'You'): void {
    this.currentScreen = 'room';
    this.roomId = roomId;
    const app = document.getElementById('app');
    if (!app) return;

    // Get saved name
    const username = localStorage.getItem('username') || hostName;

    // Add self
    this.users.clear();
    this.users.set(this.localUserId!, {
      id: this.localUserId!,
      name: username,
      isHost: true,
      speaking: false
    });

    app.innerHTML = `
      <header class="header">
        <div class="header-inner">
          <a href="/" class="logo">
            <span class="logo-text">PrinceVChat</span>
          </a>
          <div class="header-right">
            <span class="live-badge">● LIVE</span>
            <span class="user-count" id="user-count">1 participant</span>
          </div>
        </div>
      </header>
      
      <div class="room">
        <div class="room-header">
          <div class="room-info">
            <h1 class="room-title">${this.escapeHtml(username)}'s Room</h1>
            <div class="room-code">
              <input type="text" id="room-link" value="${window.location.origin}/room/${roomId}" readonly />
              <button class="btn btn-sm btn-secondary" id="copy-btn">Copy</button>
            </div>
          </div>
        </div>
        
        <div class="room-content">
          <div class="participants" id="participants">
            ${this.renderParticipants()}
          </div>
        </div>
        
        <div class="room-controls">
          <button class="control-btn ${this.isMuted ? 'muted' : ''}" id="mute-btn" title="${this.isMuted ? 'Unmute' : 'Mute'}">
            ${this.isMuted ? '🔇' : '🎤'}
          </button>
          <button class="control-btn ${this.isHandRaised ? 'active' : ''}" id="hand-btn" title="Raise Hand">
            ✋
          </button>
          <button class="control-btn leave" id="leave-btn" title="Leave Room">
            📴
          </button>
        </div>
      </div>
      
      <footer class="footer">
        <div class="footer-inner">
          <span>PrinceVChat v<span class="version">1.0.10</span></span>
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

    document.getElementById('mute-btn')?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      const btn = document.getElementById('mute-btn');
      if (btn) {
        btn.classList.toggle('muted', this.isMuted);
        btn.innerHTML = this.isMuted ? '🔇' : '🎤';
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
      return `
        <div class="participant ${user.isHost ? 'host' : ''} ${user.speaking ? 'speaking' : ''}">
          ${isSelf ? '<span class="participant-you">You</span>' : ''}
          ${user.isHost && !isSelf ? '<span class="participant-host-badge">Host</span>' : ''}
          <div class="participant-avatar">${this.getInitials(user.name)}</div>
          <div class="participant-name">${this.escapeHtml(user.name)}</div>
          <div class="participant-status">
            ${user.speaking ? 'Speaking...' : isSelf ? 'You' : 'Connected'}
          </div>
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
      speaking: false
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