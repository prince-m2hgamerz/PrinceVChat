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
  private onChat: ((message: string) => void) | null = null;

  render(): void {
    this.showLanding();
  }

  // Setters
  setOnCreateRoom(cb: () => void): void { this.onCreateRoom = cb; }
  setOnJoinRoom(cb: () => void): void { this.onJoinRoom = cb; }
  setOnMute(cb: () => void): void { this.onMute = cb; }
  setOnLeave(cb: () => void): void { this.onLeave = cb; }
  setOnRaiseHand(cb: () => void): void { this.onRaiseHand = cb; }
  setOnChat(cb: (message: string) => void): void { this.onChat = cb; }
  setLocalUserId(id: string): void { this.localUserId = id; }

  // ==================== LANDING - VERCEL STYLE ====================
  showLanding(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <nav class="nav">
        <div class="layout-container nav-inner">
          <a href="/" class="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#171717"/>
              <path d="M2 17l10 5 10-5" stroke="#171717" stroke-width="2"/>
              <path d="M2 12l10 5 10-5" stroke="#171717" stroke-width="2"/>
            </svg>
            <span>PrinceVChat</span>
          </a>
        </div>
      </nav>

      <main>
        <section class="layout-container section-hero">
          <div class="badge" style="margin-bottom: 32px;">Zero-config voice chat</div>
          <h1 class="display-hero" style="max-width: 800px; margin-bottom: 24px;">Group voice chat for every team</h1>
          <p class="body-large" style="max-width: 600px;">Start instant voice conversations with your team. No downloads, no sign-up, no friction.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" id="create-room-btn">Create Room</button>
            <button class="btn btn-secondary" id="join-room-btn">Join Room</button>
          </div>
        </section>
        
        <section class="section-features">
          <div class="layout-container grid-3">
            <div class="card">
              <h3 class="heading-card" style="margin-bottom: 12px;">Instant</h3>
              <p class="body-regular">Create a room in seconds. Share the link and anyone can join immediately.</p>
            </div>
            <div class="card">
              <h3 class="heading-card" style="margin-bottom: 12px;">Private</h3>
              <p class="body-regular">Your conversations are yours. No tracking, no recording, no storage.</p>
            </div>
            <div class="card">
              <h3 class="heading-card" style="margin-bottom: 12px;">Crystal Clear</h3>
              <p class="body-regular">WebRTC-powered audio with echo cancellation and noise suppression.</p>
            </div>
          </div>
        </section>
      </main>
    `;

    document.getElementById('create-room-btn')?.addEventListener('click', () => this.showUsernameModal('create'));
    document.getElementById('join-room-btn')?.addEventListener('click', () => this.showUsernameModal('join'));
  }

  // ==================== USERNAME MODAL ====================
  private modalAction: 'create' | 'join' = 'create';

  showUsernameModal(action: 'create' | 'join'): void {
    this.modalAction = action;
    const app = document.getElementById('app');
    if (!app) return;

    let roomId = '';
    if (action === 'join') {
      const match = window.location.pathname.match(/\/room\/([^/]+)/);
      roomId = match ? match[1] : '';
    }

    app.innerHTML = `
      <nav class="nav">
        <div class="layout-container nav-inner">
          <a href="/" class="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#171717"/>
              <path d="M2 17l10 5 10-5" stroke="#171717" stroke-width="2"/>
              <path d="M2 12l10 5 10-5" stroke="#171717" stroke-width="2"/>
            </svg>
            <span>PrinceVChat</span>
          </a>
        </div>
      </nav>
      
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal" id="modal-content">
          <div class="modal-header">
            <h2 class="heading-large">${action === 'create' ? 'Create a room' : 'Join a room'}</h2>
            <p class="body-regular" style="margin-top: 8px;">Enter your name to get started</p>
          </div>
          
          <form id="username-form">
            <div class="form-group">
              <label class="form-label" for="username-input">Your Name</label>
              <input type="text" id="username-input" class="form-input" placeholder="Enter your name" autocomplete="off" required maxlength="20" autofocus />
            </div>
            
            ${action === 'join' ? `
              <div class="form-group">
                <label class="form-label" for="room-input">Room Code</label>
                <input type="text" id="room-input" class="form-input" placeholder="e.g. abc123" value="${roomId}" autocomplete="off" required />
              </div>
            ` : ''}
            
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">${action === 'create' ? 'Create Room' : 'Join Room'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

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

    setTimeout(() => document.getElementById('username-input')?.focus(), 100);
  }

  // ==================== SVG ICONS ====================
  private getIcons() {
    return {
      mic: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
      micOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
      hand: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>`,
      leave: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-4h7"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
      copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
      chat: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
      close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    };
  }

  // ==================== ROOM ====================
  showRoom(roomId: string, hostName: string = 'You'): void {
    this.currentScreen = 'room';
    this.roomId = roomId;
    const app = document.getElementById('app');
    if (!app) return;

    const username = localStorage.getItem('username') || hostName;
    const icons = this.getIcons();

    this.users.clear();
    this.users.set(this.localUserId!, {
      id: this.localUserId!,
      name: username,
      isHost: true,
      speaking: false,
      handRaised: false
    });

    app.innerHTML = `
      <nav class="nav">
        <div class="layout-container nav-inner">
          <div style="display: flex; align-items: center; gap: 16px;">
            <a href="/" class="logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#171717"/>
                <path d="M2 17l10 5 10-5" stroke="#171717" stroke-width="2"/>
                <path d="M2 12l10 5 10-5" stroke="#171717" stroke-width="2"/>
              </svg>
            </a>
            <span class="mono-label" style="color: var(--ds-gray-500); padding-left: 16px; border-left: 1px solid var(--ds-gray-100);">Room: ${roomId}</span>
          </div>
          <button class="btn btn-secondary" id="copy-btn">
            ${icons.copy} Copy Invite Link
          </button>
        </div>
      </nav>

      <main class="layout-container" style="padding-bottom: 100px;">
        <div class="room-header">
          <div class="room-info">
            <h1 class="heading-large" id="room-title">${this.escapeHtml(username)}'s Room</h1>
            <span class="badge" style="background: var(--ds-gray-50); color: var(--ds-fg);"><span id="user-count">1 participant</span></span>
          </div>
        </div>

        <div class="participants-grid" id="participants">
          ${this.renderParticipants()}
        </div>
      </main>

      <footer class="room-controls">
        <div class="layout-container" style="display: flex; gap: 16px; justify-content: center; width: 100%;">
          <button class="btn btn-icon ${this.isMuted ? 'danger' : ''}" id="mute-btn" aria-label="Toggle Mute">
            ${this.isMuted ? icons.micOff : icons.mic}
          </button>
          <button class="btn btn-icon ${this.isHandRaised ? 'active' : ''}" id="hand-btn" aria-label="Raise Hand">
            ${icons.hand}
          </button>
          <button class="btn btn-icon" id="chat-btn" aria-label="Open Chat">
            ${icons.chat}
          </button>
          <button class="btn btn-icon danger" id="leave-btn" aria-label="Leave Room">
            ${icons.leave}
          </button>
        </div>
      </footer>

      <div class="chat-overlay" id="chat-overlay"></div>
      <div class="chat-drawer" id="chat-drawer">
        <div class="chat-header">
          <h3 class="body-medium">Chat</h3>
          <button class="btn btn-icon" id="close-chat" style="box-shadow:none;">${icons.close}</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <form class="chat-input-container" id="chat-form">
          <input type="text" class="form-input" id="chat-input" placeholder="Type a message..." autocomplete="off">
          <button type="submit" class="btn btn-primary" style="padding: 8px 12px;">Send</button>
        </form>
      </div>

      <div class="toast-container" id="toast-container"></div>
    `;

    document.getElementById('copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
      this.showToast('Link copied!');
    });

    const roomIcons = this.getIcons();
    
    document.getElementById('mute-btn')?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      const btn = document.getElementById('mute-btn');
      if (btn) {
        btn.classList.toggle('danger', this.isMuted);
        btn.innerHTML = this.isMuted ? roomIcons.micOff : roomIcons.mic;
      }
      this.onMute?.();
    });

    document.getElementById('hand-btn')?.addEventListener('click', () => {
      this.onRaiseHand?.();
    });

    document.getElementById('chat-btn')?.addEventListener('click', () => this.toggleChat(true));
    document.getElementById('close-chat')?.addEventListener('click', () => this.toggleChat(false));
    document.getElementById('chat-overlay')?.addEventListener('click', () => this.toggleChat(false));

    document.getElementById('chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input') as HTMLInputElement;
      const msg = input.value.trim();
      if (msg) {
        this.onChat?.(msg);
        input.value = '';
      }
    });

    document.getElementById('leave-btn')?.addEventListener('click', () => {
      this.onLeave?.();
    });
  }

  private renderParticipants(): string {
    const users = Array.from(this.users.values());
    
    if (users.length === 0) {
      return `
        <div style="grid-column: 1 / -1; text-align: center; padding: 64px 0;">
          <p class="body-large">Waiting for others to join...</p>
        </div>
      `;
    }

    return users.map(user => {
      const isSelf = user.id === this.localUserId;
      const status = user.handRaised ? '✋ Hand raised' : (user.speaking ? 'Speaking...' : (isSelf ? 'You' : 'Connected'));
      
      const classes = ['participant-card'];
      if (user.speaking) classes.push('speaking');
      if (user.handRaised) classes.push('hand-up');
      if (user.isHost) classes.push('host');

      return `
        <div class="${classes.join(' ')}">
          <div class="participant-badge-container">
            ${isSelf ? '<span class="badge" style="background: var(--ds-gray-100); color: var(--ds-fg);">You</span>' : '<div></div>'}
            ${user.isHost && !isSelf ? '<span class="badge" style="background: var(--ds-gray-100); color: var(--ds-fg);">Host</span>' : ''}
          </div>
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
    
    if (isHost) {
      const titleEl = document.getElementById('room-title');
      if (titleEl) titleEl.textContent = `${name || 'User'}'s Room`;
    }

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

  setHandRaised(raised: boolean): void {
    this.isHandRaised = raised;
    const btn = document.getElementById('hand-btn');
    if (btn) {
      btn.classList.toggle('active', raised);
    }
    // Also update the local user's state in the participants map
    if (this.localUserId) {
      const user = this.users.get(this.localUserId);
      if (user) {
        user.handRaised = raised;
      }
    }
    this.updateParticipants();
  }

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

  setRoomTitle(hostName: string): void {
    const titleEl = document.getElementById('room-title');
    if (titleEl) titleEl.textContent = `${hostName}'s Room`;
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
  private toggleChat(open: boolean): void {
    document.getElementById('chat-drawer')?.classList.toggle('open', open);
    document.getElementById('chat-overlay')?.classList.toggle('open', open);
    if (open) setTimeout(() => document.getElementById('chat-input')?.focus(), 300);
  }

  addChatMessage(userId: string, username: string, message: string, isSelf: boolean): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-message ${isSelf ? 'self' : 'other'}`;
    div.innerHTML = `
      <div class="chat-message-info">${this.escapeHtml(username)}</div>
      <div class="chat-text">${this.escapeHtml(message)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (!isSelf && !document.getElementById('chat-drawer')?.classList.contains('open')) {
      this.showToast(`New message from ${username}`);
    }
  }
}