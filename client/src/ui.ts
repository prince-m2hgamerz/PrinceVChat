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
  private onSetPassword: ((password: string) => void) | null = null;
  private onTogglePrivacy: ((enabled: boolean) => void) | null = null;

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
  setOnSetPassword(cb: (password: string) => void): void { this.onSetPassword = cb; }
  setOnTogglePrivacy(cb: (enabled: boolean) => void): void { this.onTogglePrivacy = cb; }
  setLocalUserId(id: string): void { this.localUserId = id; }

  // ==================== LANDING - VERCEL-INSPIRED DESIGN ====================
  showLanding(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="landing-page">
        <nav class="nav">
          <div class="layout-container nav-inner">
            <a href="/" class="logo" id="logo-main">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              <span>PrinceVChat</span>
            </a>
            <div class="nav-links">
              <a href="#features" class="nav-link" id="nav-features-link">Features</a>
              <a href="/changelog" class="nav-link" id="nav-changelog">Changelog</a>
              <button class="btn btn-primary nav-cta" id="nav-start-btn">Start a Room</button>
            </div>
            <button class="hamburger-btn" id="hamburger-btn" aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </nav>

        <div class="sidebar-overlay" id="sidebar-overlay"></div>
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <span class="logo">PrinceVChat</span>
            <button class="btn btn-icon" id="sidebar-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="sidebar-content">
            <a href="#features" class="sidebar-link" id="side-features">Features</a>
            <a href="/changelog" class="sidebar-link" id="side-changelog">Changelog</a>
            <a href="/contact" class="sidebar-link" id="side-contact">Contact</a>
            <a href="/report" class="sidebar-link" id="side-report">Report Problem</a>
            <hr style="border: none; border-top: 1px solid var(--ds-gray-100); margin: 8px 0;">
            <a href="/terms" class="sidebar-link" id="side-terms">Terms of Service</a>
            <a href="/privacy" class="sidebar-link" id="side-privacy">Privacy Policy</a>
          </div>
        </aside>

        <main class="landing-main">
          <div class="hero-glow"></div>

          <section class="layout-container section-hero">
            <div class="hero-content">
              <div class="badge-new"><span class="badge-dot"></span>v3.1 — Fullscreen, ICE fixes &amp; cross-browser audio</div>
              <h1 class="hero-title">Crystal-clear calls<br>for <span class="hero-accent">every team</span></h1>
              <p class="hero-subtitle">HD voice &amp; video, screen sharing, live chat, emoji reactions. No accounts, no downloads — just share a link and talk.</p>
              <div class="hero-cta">
                <button class="btn btn-primary btn-large" id="create-room-btn">
                  Start a Room
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
                <button class="btn btn-secondary btn-large" id="join-room-btn">Join with Code</button>
              </div>
              <div class="hero-stats">
                <div class="stat-item"><span class="stat-value">HD</span><span class="stat-label">1280×720 Video</span></div>
                <div class="stat-divider"></div>
                <div class="stat-item"><span class="stat-value">P2P</span><span class="stat-label">Encrypted</span></div>
                <div class="stat-divider"></div>
                <div class="stat-item"><span class="stat-value">&lt;50ms</span><span class="stat-label">Latency</span></div>
                <div class="stat-divider"></div>
                <div class="stat-item"><span class="stat-value">0</span><span class="stat-label">Sign‑ups</span></div>
              </div>
            </div>
          </section>

          <section class="layout-container section-features" id="features">
            <div class="section-header">
              <span class="mono-label">FEATURES</span>
              <h2 class="heading-section">Everything you need<br>to communicate</h2>
              <p class="body-large">No plugins. No downloads. Built on WebRTC for direct peer-to-peer connections that keep your conversations private.</p>
            </div>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <h3 class="heading-card">HD Video Calls</h3>
                <p class="body-regular">1280×720 video with front and back camera switching on mobile devices. Tap any card for fullscreen.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                </div>
                <h3 class="heading-card">Crystal Clear Audio</h3>
                <p class="body-regular">Echo cancellation, noise suppression, and real-time speaker detection with green ring indicators.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <h3 class="heading-card">Screen Sharing</h3>
                <p class="body-regular">Share your entire screen, a window, or a browser tab with everyone in the room instantly.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 class="heading-card">Private &amp; Secure</h3>
                <p class="body-regular">Room locking, CSP headers, rate limiting, and zero server-side recording. Your data stays yours.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 class="heading-card">Live Chat</h3>
                <p class="body-regular">Real-time text messaging with 50-message history. New messages notify you even when chat is closed.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                </div>
                <h3 class="heading-card">Reactions &amp; Hand Raise</h3>
                <p class="body-regular">Express yourself with floating emoji reactions and raise your hand to get the host's attention.</p>
              </div>
            </div>
          </section>

          <section class="layout-container section-cta">
            <div class="cta-card">
              <h2 class="heading-card" style="font-size:28px;letter-spacing:-0.96px;">Ready to connect?</h2>
              <p class="body-regular" style="color:var(--ds-gray-500);margin-top:8px;">Create a room in seconds. No sign‑up, no download, no hassle.</p>
              <div class="hero-cta" style="margin-top:28px;">
                <button class="btn btn-primary btn-large" id="cta-create-btn">
                  Start for Free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
                <button class="btn btn-secondary btn-large" id="cta-join-btn">Join a Room</button>
              </div>
            </div>
          </section>
        </main>

        <footer class="landing-footer">
          <div class="layout-container footer-inner">
            <div class="footer-left">
              <a href="/" class="logo" style="font-size:13px;gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/></svg>
                PrinceVChat
              </a>
              <p class="footer-copy">&copy; 2026 PrinceVChat. Crafted by m2hgamerz.</p>
            </div>
            <div class="footer-right">
              <a href="/changelog" class="footer-link" id="footer-changelog">Changelog</a>
              <a href="/contact" class="footer-link" id="footer-contact">Contact</a>
              <a href="/report" class="footer-link" id="footer-report">Report</a>
              <a href="/terms" class="footer-link" id="footer-terms">Terms</a>
              <a href="/privacy" class="footer-link" id="footer-privacy">Privacy</a>
              <span class="footer-version">v3.2.0</span>
            </div>
          </div>
        </footer>
      </div>
    `;

    document.getElementById('create-room-btn')?.addEventListener('click', () => this.showUsernameModal('create'));
    document.getElementById('join-room-btn')?.addEventListener('click', () => this.showUsernameModal('join'));
    document.getElementById('nav-start-btn')?.addEventListener('click', () => this.showUsernameModal('create'));
    document.getElementById('cta-create-btn')?.addEventListener('click', () => this.showUsernameModal('create'));
    document.getElementById('cta-join-btn')?.addEventListener('click', () => this.showUsernameModal('join'));
    document.getElementById('nav-changelog')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/changelog'); this.showChangelog(); });
    document.getElementById('footer-changelog')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/changelog'); this.showChangelog(); });
    document.getElementById('footer-contact')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/contact'); this.showContact(); });
    document.getElementById('footer-report')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/report'); this.showReport(); });
    document.getElementById('footer-terms')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/terms'); this.showTerms(); });
    document.getElementById('footer-privacy')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/privacy'); this.showPrivacy(); });
    document.getElementById('nav-features-link')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); });

    // Sidebar
    document.getElementById('hamburger-btn')?.addEventListener('click', () => this.toggleSidebar(true));
    document.getElementById('sidebar-close')?.addEventListener('click', () => this.toggleSidebar(false));
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => this.toggleSidebar(false));
    
    document.getElementById('side-features')?.addEventListener('click', (e) => { e.preventDefault(); this.toggleSidebar(false); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); });
    document.getElementById('side-changelog')?.addEventListener('click', (e) => { e.preventDefault(); this.toggleSidebar(false); window.history.pushState(null, '', '/changelog'); this.showChangelog(); });
    document.getElementById('side-contact')?.addEventListener('click', (e) => { e.preventDefault(); this.toggleSidebar(false); window.history.pushState(null, '', '/contact'); this.showContact(); });
    document.getElementById('side-report')?.addEventListener('click', (e) => { e.preventDefault(); this.toggleSidebar(false); window.history.pushState(null, '', '/report'); this.showReport(); });
    document.getElementById('side-terms')?.addEventListener('click', (e) => { e.preventDefault(); this.toggleSidebar(false); window.history.pushState(null, '', '/terms'); this.showTerms(); });
    document.getElementById('side-privacy')?.addEventListener('click', (e) => { e.preventDefault(); this.toggleSidebar(false); window.history.pushState(null, '', '/privacy'); this.showPrivacy(); });
  }

  private toggleSidebar(open: boolean): void {
    document.getElementById('sidebar')?.classList.toggle('open', open);
    document.getElementById('sidebar-overlay')?.classList.toggle('open', open);
  }

  // ==================== CHANGELOG PAGE ====================
  showChangelog(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="landing-page">
        <nav class="nav"><div class="layout-container nav-inner"><a href="/" class="logo" id="logo-home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/></svg><span>PrinceVChat</span></a></div></nav>
        <main class="landing-main" style="align-items:flex-start;padding-top:40px;">
          <div class="layout-container" style="width:100%;max-width:760px;padding-bottom:80px;">
            <a href="/" class="back-link" id="back-home" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:var(--ds-blue);text-decoration:none;font-weight:500;">&larr; Back</a>
            <h1 class="heading-section" style="margin-top:24px;margin-bottom:8px;letter-spacing:-2.4px;">Changelog</h1>
            <p class="body-large" style="color:var(--ds-gray-500);margin-bottom:56px;">All notable changes to PrinceVChat, most recent first.</p>
            <div class="changelog-list">
              <div class="changelog-entry">
                <div class="changelog-version"><span class="badge">v3.2.0</span><span class="changelog-date">April 30, 2026</span></div>
                <h3 class="heading-card">Security Hardening & Privacy</h3>
                <ul class="changelog-items">
                  <li><span class="cl-tag cl-security">Security</span> <strong>Password Protected Rooms:</strong> Hosts can now set a password for their room (Hashed via SHA-256)</li>
                  <li><span class="cl-tag cl-security">Security</span> <strong>Privacy Mode:</strong> New "Shield" toggle forces relay-only connections to hide participant IPs</li>
                  <li><span class="cl-tag cl-security">Security</span> <strong>IP Rate Limiting:</strong> Server-side protection against signaling floods and bot spam</li>
                  <li><span class="cl-tag cl-security">Security</span> <strong>Sanitization:</strong> Full audit of DOM rendering to prevent XSS (Cross-Site Scripting)</li>
                  <li><span class="cl-tag cl-new">New</span> Cryptographically secure Room IDs and Session IDs using <code>WebCrypto API</code></li>
                  <li><span class="cl-tag cl-new">New</span> Contact Us and Report Problem pages added</li>
                  <li><span class="cl-tag cl-fix">Fix</span> Critical syntax error in UI manager causing hot-reload failure</li>
                </ul>
              </div>
              <div class="changelog-entry">
                <div class="changelog-version"><span class="badge">v3.1.0</span><span class="changelog-date">April 30, 2026</span></div>
                <h3 class="heading-card">Reliability & UX Overhaul</h3>
                <ul class="changelog-items">
                  <li><span class="cl-tag cl-fix">Fix</span> <strong>Critical:</strong> WebRTC signaling rate-limiter was silently dropping ICE candidates — root cause of audio/video failure</li>
                  <li><span class="cl-tag cl-fix">Fix</span> ICE candidates now queued until remote description is set, then flushed — prevents <code>state: failed</code></li>
                  <li><span class="cl-tag cl-fix">Fix</span> Single shared MediaStream per peer — tracks accumulated on one stream instead of replaced</li>
                  <li><span class="cl-tag cl-fix">Fix</span> ICE restart on connection failure instead of auto-removing peer (no more auto-exit)</li>
                  <li><span class="cl-tag cl-fix">Fix</span> WS protocol auto-detect: <code>ws://</code> for HTTP dev, <code>wss://</code> for HTTPS production</li>
                  <li><span class="cl-tag cl-fix">Fix</span> Dev server now runs both backend (port 3000) and Vite (port 5173) concurrently via <code>concurrently</code></li>
                  <li><span class="cl-tag cl-fix">Fix</span> Vite dev proxy forwards <code>/ws</code> to backend — signaling works in development</li>
                  <li><span class="cl-tag cl-new">New</span> Tap any participant card to view fullscreen — works on all devices</li>
                  <li><span class="cl-tag cl-new">New</span> Android screen share: graceful error message instead of crash</li>
                  <li><span class="cl-tag cl-improved">Improved</span> Chat drawer: full <code>100dvh</code> height on mobile, safe-area padding, no cutoff</li>
                  <li><span class="cl-tag cl-improved">Improved</span> Speaking detection: in-place DOM updates instead of full grid rebuild — audio no longer cut</li>
                  <li><span class="cl-tag cl-improved">Improved</span> TURN server relay added for mobile network NAT traversal</li>
                  <li><span class="cl-tag cl-improved">Improved</span> iOS Safari: <code>webkit-playsinline</code>, <code>webkitAudioContext</code> fallback, AudioContext resume</li>
                  <li><span class="cl-tag cl-improved">Improved</span> Camera fallback: join with audio-only if camera is denied</li>
                </ul>
              </div>
              <div class="changelog-entry">
                <div class="changelog-version"><span class="badge">v3.0.0</span><span class="changelog-date">April 29, 2026</span></div>
                <h3 class="heading-card">Major Release — Video, Screen Share & Security</h3>
                <ul class="changelog-items">
                  <li><span class="cl-tag cl-new">New</span> HD video calls (1280×720) with front/back camera switching</li>
                  <li><span class="cl-tag cl-new">New</span> Screen sharing — share your screen, a window, or a tab</li>
                  <li><span class="cl-tag cl-new">New</span> Room locking — hosts can lock rooms to prevent new joins</li>
                  <li><span class="cl-tag cl-new">New</span> Real-time audio level detection with speaker highlighting (green glow)</li>
                  <li><span class="cl-tag cl-new">New</span> Dark mode toggle</li>
                  <li><span class="cl-tag cl-new">New</span> Changelog page & footer version badge</li>
                  <li><span class="cl-tag cl-new">New</span> Premium Vercel-inspired design system</li>
                  <li><span class="cl-tag cl-new">New</span> Features grid on landing page</li>
                  <li><span class="cl-tag cl-fix">Fix</span> Audio streams persist after UI rebuilds (reattachAllStreams)</li>
                  <li><span class="cl-tag cl-fix">Fix</span> Camera defaults to OFF on join for privacy</li>
                  <li><span class="cl-tag cl-security">Security</span> Content-Security-Policy, HSTS, XSS protection headers</li>
                  <li><span class="cl-tag cl-security">Security</span> Server-side chat sanitization, WebSocket rate limiting, payload size limits</li>
                  <li><span class="cl-tag cl-improved">Improved</span> Mobile-first fully responsive layout</li>
                  <li><span class="cl-tag cl-improved">Improved</span> Touch-friendly 44px control buttons</li>
                </ul>
              </div>
              <div class="changelog-entry">
                <div class="changelog-version"><span class="badge">v2.0.0</span><span class="changelog-date">April 2026</span></div>
                <h3 class="heading-card">Voice Chat & Real-time Features</h3>
                <ul class="changelog-items">
                  <li><span class="cl-tag cl-new">New</span> WebRTC-based peer-to-peer voice chat</li>
                  <li><span class="cl-tag cl-new">New</span> Real-time text chat with 50-message history</li>
                  <li><span class="cl-tag cl-new">New</span> Emoji reactions with floating animations</li>
                  <li><span class="cl-tag cl-new">New</span> Hand raising feature with visual indicator</li>
                  <li><span class="cl-tag cl-new">New</span> Deafen toggle (mute all remote audio)</li>
                  <li><span class="cl-tag cl-new">New</span> Supabase integration for room persistence</li>
                </ul>
              </div>
              <div class="changelog-entry">
                <div class="changelog-version"><span class="badge">v1.0.0</span><span class="changelog-date">March 2026</span></div>
                <h3 class="heading-card">Initial Release</h3>
                <ul class="changelog-items">
                  <li><span class="cl-tag cl-new">New</span> Room creation with unique 6-character codes</li>
                  <li><span class="cl-tag cl-new">New</span> Username entry modal</li>
                  <li><span class="cl-tag cl-new">New</span> WebSocket-based signaling server</li>
                  <li><span class="cl-tag cl-new">New</span> Multi-participant grid layout</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
        <footer class="landing-footer"><div class="layout-container footer-inner"><div class="footer-left"><p class="footer-copy">&copy; 2026 PrinceVChat. Crafted by m2hgamerz.</p></div><div class="footer-right"><span class="footer-version">v3.1.0</span></div></div></footer>
      </div>
    `;
    document.getElementById('logo-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
    document.getElementById('back-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
  }

  // ==================== CONTACT PAGE ====================
  showContact(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="landing-page">
        <nav class="nav"><div class="layout-container nav-inner"><a href="/" class="logo" id="logo-home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/></svg><span>PrinceVChat</span></a></div></nav>
        <main class="landing-main" style="align-items:flex-start;padding-top:40px;">
          <div class="layout-container" style="width:100%;max-width:760px;padding-bottom:80px;">
            <a href="/" class="back-link" id="back-home" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:var(--ds-blue);text-decoration:none;font-weight:500;">&larr; Back</a>
            <h1 class="heading-section" style="margin-top:24px;margin-bottom:8px;letter-spacing:-2.4px;">Contact Us</h1>
            <p class="body-large" style="color:var(--ds-gray-500);margin-bottom:56px;">We're here to help you stay connected.</p>
            
            <div style="display:grid;gap:32px;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));">
              <div class="cta-card" style="text-align:left;padding:32px;">
                <h3 class="heading-card">Email Support</h3>
                <div style="margin-top:16px;display:grid;gap:12px;">
                  <a href="mailto:support@m2hio.in" class="footer-link" style="font-size:16px;">support@m2hio.in</a>
                  <a href="mailto:help@m2hio.in" class="footer-link" style="font-size:16px;">help@m2hio.in</a>
                </div>
              </div>
              <div class="cta-card" style="text-align:left;padding:32px;">
                <h3 class="heading-card">Social Connect</h3>
                <div style="margin-top:16px;display:grid;gap:12px;">
                  <a href="https://t.me/m2hgamerz" target="_blank" class="footer-link" style="font-size:16px;">Telegram: @m2hgamerz</a>
                  <a href="https://instagram.com/m2hgamerz" target="_blank" class="footer-link" style="font-size:16px;">Instagram: @m2hgamerz</a>
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer class="landing-footer"><div class="layout-container footer-inner"><div class="footer-left"><p class="footer-copy">&copy; 2026 PrinceVChat. Crafted by m2hgamerz.</p></div><div class="footer-right"><span class="footer-version">v3.2.0</span></div></div></footer>
      </div>
    `;
    document.getElementById('logo-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
    document.getElementById('back-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
  }

  // ==================== REPORT PAGE ====================
  showReport(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="landing-page">
        <nav class="nav"><div class="layout-container nav-inner"><a href="/" class="logo" id="logo-home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/></svg><span>PrinceVChat</span></a></div></nav>
        <main class="landing-main" style="align-items:flex-start;padding-top:40px;">
          <div class="layout-container" style="width:100%;max-width:760px;padding-bottom:80px;">
            <a href="/" class="back-link" id="back-home" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:var(--ds-blue);text-decoration:none;font-weight:500;">&larr; Back</a>
            <h1 class="heading-section" style="margin-top:24px;margin-bottom:8px;letter-spacing:-2.4px;">Report a Problem</h1>
            <p class="body-large" style="color:var(--ds-gray-500);margin-bottom:56px;">Notice something wrong? Let us know so we can fix it.</p>
            
            <div class="cta-card" style="text-align:left;padding:40px;max-width:600px;">
              <h3 class="heading-card">Report Vulnerability or Bug</h3>
              <p class="body-regular" style="margin-top:16px;color:var(--ds-gray-500);">For security reports or critical bugs, please email our security team directly.</p>
              <div style="margin-top:24px;">
                <a href="mailto:report@m2hio.in" class="btn btn-primary" style="display:inline-flex;text-decoration:none;">Email report@m2hio.in</a>
              </div>
              <p class="body-small" style="margin-top:24px;color:var(--ds-gray-400);">Please include steps to reproduce and screenshots if possible.</p>
            </div>
          </div>
        </main>
        <footer class="landing-footer"><div class="layout-container footer-inner"><div class="footer-left"><p class="footer-copy">&copy; 2026 PrinceVChat. Crafted by m2hgamerz.</p></div><div class="footer-right"><span class="footer-version">v3.2.0</span></div></div></footer>
      </div>
    `;
    document.getElementById('logo-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
    document.getElementById('back-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
  }

  // ==================== TERMS PAGE ====================
  showTerms(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="landing-page">
        <nav class="nav"><div class="layout-container nav-inner"><a href="/" class="logo" id="logo-home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/></svg><span>PrinceVChat</span></a></div></nav>
        <main class="landing-main" style="align-items:flex-start;padding-top:40px;">
          <div class="layout-container" style="width:100%;max-width:760px;padding-bottom:80px;">
            <a href="/" class="back-link" id="back-home" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:var(--ds-blue);text-decoration:none;font-weight:500;">&larr; Back</a>
            <h1 class="heading-section" style="margin-top:24px;margin-bottom:8px;letter-spacing:-2.4px;">Terms of Service</h1>
            <div class="legal-content" style="margin-top:40px;display:grid;gap:24px;color:var(--ds-gray-500);">
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">1. Acceptance of Terms</h3>
                <p class="body-regular">By using PrinceVChat, you agree to these terms. If you don't agree, please do not use the service.</p>
              </section>
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">2. Use of Service</h3>
                <p class="body-regular">PrinceVChat is provided "as is". You are responsible for your behavior and any content you share during calls. Harassment, illegal activities, or abuse of our servers will lead to immediate termination of access.</p>
              </section>
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">3. No Warranties</h3>
                <p class="body-regular">We do not guarantee that the service will always be available, secure, or bug-free. Use it at your own risk.</p>
              </section>
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">4. Changes to Terms</h3>
                <p class="body-regular">We may update these terms at any time. Continued use of the service means you accept the new terms.</p>
              </section>
            </div>
          </div>
        </main>
        <footer class="landing-footer"><div class="layout-container footer-inner"><div class="footer-left"><p class="footer-copy">&copy; 2026 PrinceVChat. Crafted by m2hgamerz.</p></div><div class="footer-right"><span class="footer-version">v3.2.0</span></div></div></footer>
      </div>
    `;
    document.getElementById('logo-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
    document.getElementById('back-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
  }

  // ==================== PRIVACY PAGE ====================
  showPrivacy(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="landing-page">
        <nav class="nav"><div class="layout-container nav-inner"><a href="/" class="logo" id="logo-home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/></svg><span>PrinceVChat</span></a></div></nav>
        <main class="landing-main" style="align-items:flex-start;padding-top:40px;">
          <div class="layout-container" style="width:100%;max-width:760px;padding-bottom:80px;">
            <a href="/" class="back-link" id="back-home" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:var(--ds-blue);text-decoration:none;font-weight:500;">&larr; Back</a>
            <h1 class="heading-section" style="margin-top:24px;margin-bottom:8px;letter-spacing:-2.4px;">Privacy Policy</h1>
            <div class="legal-content" style="margin-top:40px;display:grid;gap:24px;color:var(--ds-gray-500);">
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">1. Data We Don't Collect</h3>
                <p class="body-regular">PrinceVChat is Peer-to-Peer (P2P). We **do not** record, store, or see your video or audio streams. All communication happens directly between you and other participants.</p>
              </section>
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">2. Information We Use</h3>
                <p class="body-regular">We only use temporary data (like room IDs and temporary usernames) to help you connect. This data is deleted once the room is closed.</p>
              </section>
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">3. Cookies</h3>
                <p class="body-regular">We use local storage only to remember your preferred username and settings. No tracking cookies are used.</p>
              </section>
              <section>
                <h3 class="heading-card" style="color:var(--ds-fg);">4. Security</h3>
                <p class="body-regular">We use industry-standard encryption for signaling, but remember that P2P security also depends on your local network and device security.</p>
              </section>
            </div>
          </div>
        </main>
        <footer class="landing-footer"><div class="layout-container footer-inner"><div class="footer-left"><p class="footer-copy">&copy; 2026 PrinceVChat. Crafted by m2hgamerz.</p></div><div class="footer-right"><span class="footer-version">v3.2.0</span></div></div></footer>
      </div>
    `;
    document.getElementById('logo-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
    document.getElementById('back-home')?.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/'); this.showLanding(); });
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
              <div class="form-group">
                <label class="form-label" for="password-input">Password (Optional)</label>
                <input type="password" id="password-input" class="form-input" placeholder="Enter room password" autocomplete="new-password" />
              </div>
            ` : `
              <div class="form-group">
                <label class="form-label" for="password-input">Set Password (Optional)</label>
                <input type="password" id="password-input" class="form-input" placeholder="Protect your room" autocomplete="new-password" />
              </div>
            `}
            
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
      const passwordInput = document.getElementById('password-input') as HTMLInputElement;
      
      const name = usernameInput?.value.trim();
      const room = roomInput?.value.trim();
      const password = passwordInput?.value.trim();

      if (name) {
        localStorage.setItem('username', name);
        if (password) localStorage.setItem('room_password', password); // Temporary storage for join
        
        if (this.modalAction === 'create') {
          if (password) (window as any).nextRoomPassword = password;
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
      unlock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
      shield: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
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
          <button class="btn btn-icon ${this.isRoomLocked ? 'active' : ''}" id="lock-btn" aria-label="Lock Room" title="Lock Room">
            ${this.isRoomLocked ? icons.lock : icons.unlock}
          </button>
          <button class="btn btn-icon" id="password-btn" aria-label="Set Password" title="Set Room Password">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3.5-3.5"></path></svg>
          </button>
          <button class="btn btn-icon" id="privacy-btn" aria-label="Toggle Privacy Mode" title="Privacy Mode (Relay Only)">
            ${icons.shield}
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

    document.getElementById('lock-btn')?.addEventListener('click', () => {
      this.isRoomLocked = !this.isRoomLocked;
      const btn = document.getElementById('lock-btn');
      if (btn) {
        btn.classList.toggle('active', this.isRoomLocked);
        btn.innerHTML = this.isRoomLocked ? roomIcons.lock : roomIcons.unlock;
      }
      this.onToggleLock?.(this.isRoomLocked);
      this.showToast(this.isRoomLocked ? 'Room locked' : 'Room unlocked', 'success');
    });
    
    document.getElementById('password-btn')?.addEventListener('click', () => {
      const pass = prompt('Enter new room password (leave empty to remove):');
      if (pass !== null) {
        this.onSetPassword?.(pass);
      }
    });

    document.getElementById('privacy-btn')?.addEventListener('click', () => {
      const enabled = document.getElementById('privacy-btn')?.classList.toggle('active');
      this.onTogglePrivacy?.(!!enabled);
      this.showToast(enabled ? 'Privacy Mode: Relay Only' : 'Privacy Mode: Standard');
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
          <video id="video-${user.id}" class="participant-video ${isSelf ? '' : 'remote'}" autoplay playsinline webkit-playsinline ${isSelf ? 'muted' : ''}></video>
          
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
      this.attachStreamToElement(userId, stream);
    }
  }

  private attachStreamToElement(userId: string, stream: MediaStream): void {
    const videoEl = document.getElementById(`video-${userId}`) as HTMLVideoElement;
    if (!videoEl || !stream) return;

    // Only reassign if different stream
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    // For local user, ensure muted (prevents echo)
    if (userId === this.localUserId) {
      videoEl.muted = true;
      videoEl.volume = 0;
    }

    // Cross-browser play — handles autoplay policy
    const tryPlay = () => {
      const playPromise = videoEl.play();
      if (playPromise) {
        playPromise.catch((e: Error) => {
          console.warn('[UI] Autoplay blocked for', userId, e.message);
          // Will be unlocked by the click/touch handler
        });
      }
    };

    if (videoEl.readyState >= 1) {
      tryPlay();
    } else {
      videoEl.onloadedmetadata = () => tryPlay();
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
      // Update DOM in-place — do NOT call updateParticipants() 
      // because that destroys and rebuilds all video elements, killing audio
      const card = document.getElementById(`p-${userId}`);
      if (card) {
        card.classList.toggle('speaking', speaking);
        const statusEl = card.querySelector('.participant-status-badge');
        if (statusEl) {
          statusEl.textContent = user.handRaised ? '✋ Hand raised' : (speaking ? 'Speaking...' : (userId === this.localUserId ? 'You' : ''));
        }
      }
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
        // Update DOM in-place
        const card = document.getElementById(`p-${this.localUserId}`);
        if (card) {
          card.classList.toggle('hand-up', raised);
          const statusEl = card.querySelector('.participant-status-badge');
          if (statusEl) statusEl.textContent = raised ? '✋ Hand raised' : 'You';
        }
      }
    }
  }

  setUserHandRaised(userId: string, raised: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.handRaised = raised;
      // Update DOM in-place instead of full rebuild
      const card = document.getElementById(`p-${userId}`);
      if (card) {
        card.classList.toggle('hand-up', raised);
        const statusEl = card.querySelector('.participant-status-badge');
        if (statusEl) {
          statusEl.textContent = raised ? '✋ Hand raised' : (user.speaking ? 'Speaking...' : '');
        }
      }
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
      // CRITICAL: Re-attach all streams after DOM rebuild
      this.reattachAllStreams();
    }
  }

  private reattachAllStreams(): void {
    this.users.forEach(user => {
      if (user.stream) {
        this.attachStreamToElement(user.id, user.stream);
      }
    });
    // Wire up fullscreen tap on each card
    this.users.forEach(user => {
      const card = document.getElementById(`p-${user.id}`);
      card?.addEventListener('click', (e) => {
        // Don't trigger if clicking a button inside the card
        if ((e.target as HTMLElement).closest('button')) return;
        this.showParticipantFullscreen(user.id);
      });
    });
  }

  showParticipantFullscreen(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    // Remove existing overlay if any
    document.getElementById('fullscreen-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.id = 'fullscreen-overlay';

    const hasVideo = user.videoOn && user.stream && user.stream.getVideoTracks().length > 0;

    if (hasVideo) {
      const video = document.createElement('video');
      video.className = 'fullscreen-video';
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      if (userId === this.localUserId) {
        video.muted = true;
        video.volume = 0;
      }
      video.srcObject = user.stream!;
      video.play().catch(() => {});
      overlay.appendChild(video);
    } else {
      const avatar = document.createElement('div');
      avatar.className = 'fullscreen-avatar';
      avatar.textContent = this.getInitials(user.name);
      overlay.appendChild(avatar);
    }

    const nameTag = document.createElement('div');
    nameTag.className = 'fullscreen-name';
    nameTag.textContent = user.name + (user.isHost ? ' (Host)' : '');
    overlay.appendChild(nameTag);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fullscreen-close';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close fullscreen');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
    });
    overlay.appendChild(closeBtn);

    // Close on background click (not on video/avatar)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Close on Escape
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
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

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}