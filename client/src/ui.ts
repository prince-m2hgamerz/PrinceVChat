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

  // ==================== LANDING - VERCEL STYLE ====================
  showLanding(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="vercel-page">
        <!-- Animated Background -->
        <div class="bg-gradient"></div>
        <div class="bg-grid"></div>
        
        <!-- Navigation -->
        <nav class="vercel-nav">
          <a href="/" class="nav-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff"/>
              <path d="M2 17l10 5 10-5" stroke="#fff" stroke-width="2"/>
              <path d="M2 12l10 5 10-5" stroke="#fff" stroke-width="2"/>
            </svg>
            <span>PrinceVChat</span>
          </a>
        </nav>

        <!-- Hero -->
        <main class="vercel-main">
          <section class="hero-section">
            <div class="hero-content">
              <div class="hero-badge">Zero-config voice chat</div>
              <h1 class="hero-title">
                <span class="title-gradient">Group voice chat</span>
                <br />for every team
              </h1>
              <p class="hero-description">
                Start instant voice conversations with your team. 
                No downloads, no sign-up, no friction.
              </p>
              <div class="hero-cta">
                <button class="cta-primary" id="create-room-btn">
                  <span>Create Room</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button class="cta-secondary" id="join-room-btn">
                  <span>Join Room</span>
                </button>
              </div>
            </div>
            
            <!-- Feature Cards Grid -->
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <h3>Instant</h3>
                <p>Create a room in seconds. Share the link and anyone can join immediately.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3>Private</h3>
                <p>Your conversations are yours. No tracking, no recording, no storage.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                </div>
                <h3>Crystal Clear</h3>
                <p>WebRTC-powered audio with echo cancellation and noise suppression.</p>
              </div>
            </div>
          </section>
          
          <!-- Code Section -->
          <section class="code-section">
            <div class="code-block">
              <div class="code-header">
                <div class="code-dots">
                  <span></span><span></span><span></span>
                </div>
                <span class="code-title">How it works</span>
              </div>
              <pre class="code-content"><code><span class="code-comment">// 1. Create a room</span>
<span class="code-purple">const</span> room = <span class="code-keyword">await</span> createRoom(<span class="code-string">'team-standup'</span>);

<span class="code-comment">// 2. Share the invite</span>
<span class="code-keyword">await</span> shareLink(room.url);

<span class="code-comment">// 3. Start talking!</span>
<span class="code-purple">const</span> audio = <span class="code-keyword">await</span> getUserAudio();</code></pre>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="vercel-footer">
          <div class="footer-content">
            <a href="/" class="footer-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff"/>
                <path d="M2 17l10 5 10-5" stroke="#fff" stroke-width="2"/>
                <path d="M2 12l10 5 10-5" stroke="#fff" stroke-width="2"/>
              </svg>
              <span>PrinceVChat</span>
            </a>
            <div class="footer-links">
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Blog</a>
              <a href="#">Legal</a>
              <a href="#">Privacy</a>
            </div>
            <div class="footer-copyright">
              <span>© 2026 PrinceVChat</span>
            </div>
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

    const backIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
    const copyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

    app.innerHTML = `
      <div class="vercel-page room-page">
        <div class="bg-gradient"></div>
        <div class="bg-grid"></div>
        
        <!-- Glassmorphism Header -->
        <header class="room-header-glass">
          <a href="/" class="header-link-glass">
            ${backIcon}
          </a>
          <div class="header-info-glass">
            <h1 class="header-title-glass">${this.escapeHtml(username)}</h1>
            <div class="header-meta-glass">
              <span class="live-badge-glass">
                <span class="live-dot-glass"></span>
                LIVE
              </span>
              <span class="participant-count-glass" id="user-count">1</span>
            </div>
          </div>
          <button class="copy-btn-glass" id="copy-btn" title="Copy link">
            ${copyIcon}
            <span class="copy-text">Copy</span>
          </button>
        </header>

        <!-- Room Content -->
        <main class="room-content-glass">
          <!-- Invite Box -->
          <div class="invite-glass">
            <label class="invite-label-glass">Room Link</label>
            <div class="invite-row-glass">
              <code class="invite-link-glass">${window.location.origin}/room/${roomId}</code>
              <button class="invite-btn-glass" id="copy-btn-2">Copy</button>
            </div>
          </div>

          <!-- Participants Grid -->
          <div class="participants-section-glass">
            <div class="participants-header-glass">
              <span class="participants-title-glass">Participants</span>
              <span class="participants-badge-glass" id="user-count-2">1</span>
            </div>
            <div class="participants-flex" id="participants">
              ${this.renderParticipants()}
            </div>
          </div>
        </main>

        <!-- Fixed Controls -->
        <div class="controls-glass">
          <button class="control-glass ${this.isMuted ? 'muted-glass' : ''}" id="mute-btn">
            <span class="control-icon-glass">${this.isMuted ? icons.micOff : icons.mic}</span>
            <span class="control-text-glass">${this.isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button class="control-glass ${this.isHandRaised ? 'hand-raised-glass' : ''}" id="hand-btn">
            <span class="control-icon-glass">${icons.hand}</span>
            <span class="control-text-glass">${this.isHandRaised ? 'Lower' : 'Raise'}</span>
          </button>
          <button class="control-glass leave-glass" id="leave-btn">
            <span class="control-icon-glass">${icons.leave}</span>
            <span class="control-text-glass">Leave</span>
          </button>
        </div>

        <div class="toast-container" id="toast-container"></div>
      </div>
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
        btn.classList.toggle('muted-glass', this.isMuted);
        btn.innerHTML = `
          <span class="control-icon-glass">${this.isMuted ? roomIcons.micOff : roomIcons.mic}</span>
          <span class="control-text-glass">${this.isMuted ? 'Unmute' : 'Mute'}</span>
        `;
      }
      this.onMute?.();
    });

    document.getElementById('hand-btn')?.addEventListener('click', () => {
      this.isHandRaised = !this.isHandRaised;
      const btn = document.getElementById('hand-btn');
      if (btn) {
        btn.classList.toggle('hand-raised-glass', this.isHandRaised);
        btn.innerHTML = `
          <span class="control-icon-glass">${roomIcons.hand}</span>
          <span class="control-text-glass">${this.isHandRaised ? 'Lower' : 'Raise'}</span>
        `;
      }
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