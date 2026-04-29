export class UIManager {
  private currentScreen: 'landing' | 'username' | 'room' = 'landing';
  private users = new Map<string, { id: string; name: string; isHost: boolean; speaking: boolean; handRaised: boolean; stream?: MediaStream; videoOn?: boolean }>();
  private localUserId: string | null = null;
  private roomId: string = '';
  private isMuted = false;
  private isVideoOn = false;
  private isHandRaised = false;
  private isDeafened = false;
  private isDarkMode = false;
  private isRoomLocked = false;
  private isScreenSharing = false;
  
  // Callbacks
  private onCreateRoom: (() => void) | null = null;
  private onJoinRoom: (() => void) | null = null;
  private onMute: (() => void) | null = null;
  private onToggleVideo: (() => void) | null = null;
  private onSwitchCamera: (() => void) | null = null;
  private onLeave: (() => void) | null = null;
  private onRaiseHand: (() => void) | null = null;
  private onChat: ((message: string) => void) | null = null;
  private onDeafen: (() => void) | null = null;
  private onReaction: ((emoji: string) => void) | null = null;
  private onScreenShare: (() => void) | null = null;
  private onToggleLock: ((locked: boolean) => void) | null = null;

  render(): void {
    this.showLanding();
  }

  // Setters
  setOnCreateRoom(cb: () => void): void { this.onCreateRoom = cb; }
  setOnJoinRoom(cb: () => void): void { this.onJoinRoom = cb; }
  setOnMute(cb: () => void): void { this.onMute = cb; }
  setOnToggleVideo(cb: () => void): void { this.onToggleVideo = cb; }
  setOnSwitchCamera(cb: () => void): void { this.onSwitchCamera = cb; }
  setOnLeave(cb: () => void): void { this.onLeave = cb; }
  setOnRaiseHand(cb: () => void): void { this.onRaiseHand = cb; }
  setOnChat(cb: (message: string) => void): void { this.onChat = cb; }
  setOnDeafen(cb: () => void): void { this.onDeafen = cb; }
  setOnReaction(cb: (emoji: string) => void): void { this.onReaction = cb; }
  setOnScreenShare(cb: () => void): void { this.onScreenShare = cb; }
  setOnToggleLock(cb: (locked: boolean) => void): void { this.onToggleLock = cb; }
  setLocalUserId(id: string): void { this.localUserId = id; }

  // ==================== LANDING - PREMIUM DESIGN ====================
  showLanding(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="landing-page">
        <nav class="nav">
          <div class="layout-container nav-inner">
            <a href="/" class="logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>PrinceVChat</span>
            </a>
          </div>
        </nav>

        <main class="landing-main">
          <div class="hero-glow"></div>
          <section class="layout-container section-hero">
            <div class="hero-content">
              <div class="badge-new">Version 2.0 is here</div>
              <h1 class="hero-title">Experience the Next Level of <span>Real-time</span> Communication</h1>
              <p class="hero-subtitle">High-quality voice and video calls, instant messaging, and seamless collaboration. No accounts, no hassle.</p>
              
              <div class="hero-cta">
                <button class="btn btn-primary btn-large" id="create-room-btn">
                  <span>Start a Room</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
                <button class="btn btn-secondary btn-large" id="join-room-btn">Join with Code</button>
              </div>

              <div class="hero-stats">
                <div class="stat-item">
                  <span class="stat-value">HD</span>
                  <span class="stat-label">Video Calls</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">End-to-End</span>
                  <span class="stat-label">Signaling</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">0ms</span>
                  <span class="stat-label">Latency</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer class="landing-footer">
          <div class="layout-container">
            <p>© 2026 PrinceVChat. Crafted by m2hgamerz.</p>
          </div>
        </footer>
      </div>
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
      video: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
      videoOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"></path><line x1="1" y1="1" x2="23" y2="23"></line><path d="M23 7l-7 5 7 5V7z"></path></svg>`,
      switchCamera: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
      hand: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>`,
      screenShare: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
      leave: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-4h7"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
      copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
      chat: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
      close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
      speaker: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
      speakerOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`,
      emoji: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
      moon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
      sun: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
      lock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
      unlock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`
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
            <button class="btn btn-secondary btn-small" id="fix-audio-btn" style="margin-left: 12px; font-size: 11px; padding: 4px 8px;">Fix Audio</button>
          </div>
        </div>

        <div class="participants-grid" id="participants">
          ${this.renderParticipants()}
        </div>
      </main>

      <footer class="room-controls">
        <div class="layout-container" style="display: flex; gap: 12px; justify-content: center; width: 100%; flex-wrap: wrap;">
          <button class="btn btn-icon ${this.isMuted ? 'danger' : ''}" id="mute-btn" aria-label="Toggle Mute" title="Mute">
            ${this.isMuted ? icons.micOff : icons.mic}
          </button>
          <button class="btn btn-icon ${this.isVideoOn ? '' : 'danger'}" id="video-btn" aria-label="Toggle Video" title="Video">
            ${this.isVideoOn ? icons.video : icons.videoOff}
          </button>
          <button class="btn btn-icon" id="switch-camera-btn" aria-label="Switch Camera" title="Switch Camera" style="display: ${/Android|iPhone|iPad/i.test(navigator.userAgent) ? 'flex' : 'none'};">
            ${icons.switchCamera}
          </button>
          <button class="btn btn-icon ${this.isScreenSharing ? 'active' : ''}" id="screen-share-btn" aria-label="Toggle Screen Share" title="Share Screen">
            ${icons.screenShare}
          </button>
          <button class="btn btn-icon ${this.isDeafened ? 'danger' : ''}" id="deafen-btn" aria-label="Toggle Speaker" title="Speaker">
            ${this.isDeafened ? icons.speakerOff : icons.speaker}
          </button>
          <button class="btn btn-icon ${this.isHandRaised ? 'active' : ''}" id="hand-btn" aria-label="Raise Hand" title="Raise Hand">
            ${icons.hand}
          </button>
          <button class="btn btn-icon" id="emoji-btn" aria-label="Send Reaction" title="React">
            ${icons.emoji}
          </button>
          <button class="btn btn-icon" id="chat-btn" aria-label="Open Chat" title="Chat">
            ${icons.chat}
          </button>
          <button class="btn btn-icon" id="theme-btn" aria-label="Toggle Theme" title="Theme">
            ${this.isDarkMode ? icons.sun : icons.moon}
          </button>
          <button class="btn btn-icon danger" id="leave-btn" aria-label="Leave Room" title="Leave">
            ${icons.leave}
          </button>
        </div>
      </footer>

      <div class="emoji-picker" id="emoji-picker" style="display:none;">
        <button class="emoji-btn" data-emoji="👍">👍</button>
        <button class="emoji-btn" data-emoji="👏">👏</button>
        <button class="emoji-btn" data-emoji="❤️">❤️</button>
        <button class="emoji-btn" data-emoji="😂">😂</button>
        <button class="emoji-btn" data-emoji="🎉">🎉</button>
        <button class="emoji-btn" data-emoji="🔥">🔥</button>
        <button class="emoji-btn" data-emoji="💯">💯</button>
        <button class="emoji-btn" data-emoji="😮">😮</button>
      </div>

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

    document.getElementById('video-btn')?.addEventListener('click', () => {
      this.isVideoOn = !this.isVideoOn;
      const btn = document.getElementById('video-btn');
      if (btn) {
        btn.classList.toggle('danger', !this.isVideoOn);
        btn.innerHTML = this.isVideoOn ? roomIcons.video : roomIcons.videoOff;
      }
      this.onToggleVideo?.();
    });

    document.getElementById('switch-camera-btn')?.addEventListener('click', () => {
      this.onSwitchCamera?.();
    });

    document.getElementById('screen-share-btn')?.addEventListener('click', () => {
      this.onScreenShare?.();
    });

    document.getElementById('hand-btn')?.addEventListener('click', () => {
      this.onRaiseHand?.();
    });

    document.getElementById('deafen-btn')?.addEventListener('click', () => {
      this.isDeafened = !this.isDeafened;
      const btn = document.getElementById('deafen-btn');
      if (btn) {
        btn.classList.toggle('danger', this.isDeafened);
        btn.innerHTML = this.isDeafened ? roomIcons.speakerOff : roomIcons.speaker;
      }
      this.onDeafen?.();
      this.showToast(this.isDeafened ? 'Speaker off' : 'Speaker on');
    });

    document.getElementById('fix-audio-btn')?.addEventListener('click', () => {
      this.resumeAllMedia();
      this.showToast('Audio reset requested', 'success');
    });

    const unlock = () => {
      this.resumeAllMedia();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);

    document.getElementById('emoji-btn')?.addEventListener('click', () => {
      const picker = document.getElementById('emoji-picker');
      if (picker) picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
    });
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = (btn as HTMLElement).dataset.emoji;
        if (emoji) {
          this.onReaction?.(emoji);
          this.showFloatingEmoji(emoji);
          const picker = document.getElementById('emoji-picker');
          if (picker) picker.style.display = 'none';
        }
      });
    });

    document.getElementById('theme-btn')?.addEventListener('click', () => {
      this.isDarkMode = !this.isDarkMode;
      document.documentElement.classList.toggle('dark', this.isDarkMode);
      const btn = document.getElementById('theme-btn');
      if (btn) btn.innerHTML = this.isDarkMode ? roomIcons.sun : roomIcons.moon;
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
      const status = user.handRaised ? '✋ Hand raised' : (user.speaking ? 'Speaking...' : (isSelf ? 'You' : ''));
      
      const classes = ['participant-card'];
      if (user.speaking) classes.push('speaking');
      if (user.handRaised) classes.push('hand-up');
      if (user.isHost) classes.push('host');
      if (user.videoOn) classes.push('video-on');

      return `
        <div class="${classes.join(' ')}" id="p-${user.id}">
          <div class="participant-avatar-overlay" id="avatar-${user.id}">
            <div class="participant-avatar">${this.getInitials(user.name)}</div>
          </div>
          <video id="video-${user.id}" class="participant-video ${isSelf ? '' : 'remote'}" autoplay playsinline ${isSelf ? 'muted' : ''}></video>
          
          <div class="participant-info-overlay">
            <div class="participant-name">${this.escapeHtml(user.name)} ${user.isHost ? '(Host)' : ''}</div>
            <div class="participant-status-badge">${status}</div>
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
      speaking: false,
      handRaised: false,
      videoOn: false
    });
    
    if (isHost) {
      this.setRoomTitle(name || 'User');
    }

    this.updateParticipants();
  }

  setRemoteStream(userId: string, stream: MediaStream): void {
    const user = this.users.get(userId);
    if (user) {
      user.stream = stream;
      user.videoOn = stream.getVideoTracks().length > 0;
      
      const videoEl = document.getElementById(`video-${userId}`) as HTMLVideoElement;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.onloadedmetadata = () => videoEl.play().catch(e => console.error('Video play error', e));
      }
      
      this.updateVideoUI(userId);
    }
  }

  setVideoStatus(userId: string, videoOn: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.videoOn = videoOn;
      this.updateVideoUI(userId);
    }
  }

  private updateVideoUI(userId: string): void {
    const user = this.users.get(userId);
    const card = document.getElementById(`p-${userId}`);
    if (card && user) {
      card.classList.toggle('video-on', user.videoOn);
    }
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
  private resumeAllMedia(): void {
    console.log('[UI] Resuming all media elements...');
    document.querySelectorAll('video, audio').forEach(el => {
      const media = el as HTMLMediaElement;
      if (media.paused) {
        media.play().catch(err => console.warn('[UI] Failed to play media:', err));
      }
    });
  }

  getInitials(name: string): string {
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

  // ==================== FLOATING EMOJI ====================
  showFloatingEmoji(emoji: string): void {
    const container = document.getElementById('app');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;
    el.style.left = (20 + Math.random() * 60) + '%';
    container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  // ==================== DEAFEN STATE ====================
  get deafened(): boolean { return this.isDeafened; }
}