/**
 * PrinceVChat - UI Manager (Vercel Style)
 */

import { WebRTCManager } from './webrtc';

interface User {
  id: string;
  name: string;
  isHost: boolean;
  speaking: boolean;
  muted: boolean;
  raisedHand: boolean;
}

type ToastType = 'info' | 'success' | 'error';
type ScreenCallback = () => void;

export class UIManager {
  private currentScreen: 'landing' | 'username' | 'room' = 'landing';
  private users = new Map<string, User>();
  private localUserId: string | null = null;
  private isMuted = false;
  
  // Callbacks
  private onCreateRoom: ScreenCallback | null = null;
  private onJoinRoom: ScreenCallback | null = null;
  private onToggleMute: ScreenCallback | null = null;
  private onLeave: ScreenCallback | null = null;
  private onRaiseHand: ScreenCallback | null = null;
  private onToggleChat: ScreenCallback | null = null;
  
  render(): void {
    this.showLandingPage();
  }
  
  // Callbacks
  setOnCreateRoom(cb: ScreenCallback): void { this.onCreateRoom = cb; }
  setOnJoinRoom(cb: ScreenCallback): void { this.onJoinRoom = cb; }
  setOnToggleMute(cb: ScreenCallback): void { this.onToggleMute = cb; }
  setOnLeave(cb: ScreenCallback): void { this.onLeave = cb; }
  setOnRaiseHand(cb: ScreenCallback): void { this.onRaiseHand = cb; }
  setOnToggleChat(cb: ScreenCallback): void { this.onToggleChat = cb; }
  
  setLocalUserId(id: string): void {
    this.localUserId = id;
  }
  
  // Landing Page
  showLandingPage(): void {
    this.currentScreen = 'landing';
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
      <header class="header">
        <div class="header-inner">
          <a href="/" class="logo">
            <span class="logo-icon">🎙️</span>
            PrinceVChat
          </a>
          <div class="header-right">
            <button class="btn btn-ghost btn-sm">Sign In</button>
          </div>
        </div>
      </header>
      
      <main class="main">
        <div class="main-inner">
          <div class="landing">
            <div class="landing-hero">
              <h1 class="landing-title">Voice chat for teams</h1>
              <p class="landing-subtitle">Free, instant group voice chat. No downloads, no signups required.</p>
              <div class="landing-actions">
                <button class="btn btn-primary btn-lg" id="create-room-btn">
                  Create Room
                </button>
                <button class="btn btn-secondary btn-lg" id="join-room-btn">
                  Join Room
                </button>
              </div>
            </div>
            
            <div class="landing-features">
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
                <div class="feature-icon">💬</div>
                <h3 class="feature-title">Real-time</h3>
                <p class="feature-desc">Low latency voice with WebRTC. Sounds natural.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
    
    // Event listeners
    document.getElementById('create-room-btn')?.addEventListener('click', () => {
      this.showUsernameModal('create');
    });
    
    document.getElementById('join-room-btn')?.addEventListener('click', () => {
      this.showUsernameModal('join');
    });
  }
  
  // Username Modal
  private modalAction: 'create' | 'join' = 'create';
  
  showUsernameModal(action: 'create' | 'join'): void {
    this.modalAction = action;
    const app = document.getElementById('app');
    if (!app) return;
    
    // Check for existing room ID if joining
    let roomIdInput = '';
    const path = window.location.pathname;
    if (action === 'join') {
      const match = path.match(/\/room\/([^/]+)/);
      roomIdInput = match ? match[1] : '';
    }
    
    app.innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <h2 class="modal-title">${action === 'create' ? 'Create a room' : 'Join a room'}</h2>
          <p class="modal-desc">Enter your name to get started</p>
          
          <form class="modal-form" id="username-form">
            <div>
              <label class="label" for="username-input">Your Name</label>
              <input 
                type="text" 
                id="username-input" 
                class="input" 
                placeholder="Enter your name"
                autocomplete="off"
                required
                maxlength="20"
              />
            </div>
            
            ${action === 'join' ? `
              <div>
                <label class="label" for="room-id-input">Room Code</label>
                <input 
                  type="text" 
                  id="room-id-input" 
                  class="input" 
                  placeholder="e.g. abc123"
                  value="${roomIdInput}"
                  autocomplete="off"
                  required
                />
              </div>
            ` : ''}
            
            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">
                ${action === 'create' ? 'Create Room' : 'Join Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Event listeners
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
      this.showLandingPage();
    });
    
    document.getElementById('username-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('username-input') as HTMLInputElement;
      const roomIdInput = document.getElementById('room-id-input') as HTMLInputElement;
      
      const username = usernameInput?.value.trim();
      const roomId = roomIdInput?.value.trim();
      
      if (username) {
        localStorage.setItem('username', username);
        if (this.modalAction === 'create') {
          this.onCreateRoom?.();
        } else if (roomId) {
          window.history.replaceState(null, '', `/room/${roomId}`);
          this.onJoinRoom?.();
        }
      }
    });
    
    // Focus input
    setTimeout(() => {
      document.getElementById('username-input')?.focus();
    }, 100);
  }
  
  // Room Page
  showRoomPage(roomId: string, hostName: string = 'You'): void {
    this.currentScreen = 'room';
    const app = document.getElementById('app');
    if (!app) return;
    
    // Get saved username
    const username = localStorage.getItem('username') || hostName;
    
    // Add self as first user
    this.users.clear();
    this.users.set(this.localUserId!, {
      id: this.localUserId!,
      name: username,
      isHost: true,
      speaking: false,
      muted: false,
      raisedHand: false
    });
    
    app.innerHTML = `
      <header class="header">
        <div class="header-inner">
          <a href="/" class="logo">
            <span class="logo-icon">🎙️</span>
            PrinceVChat
          </a>
          <div class="header-right">
            <span class="badge badge-live">● LIVE</span>
            <span class="text-sm text-secondary" id="user-count">1 participant</span>
          </div>
        </div>
      </header>
      
      <div class="room">
        <div class="room-header">
          <div class="room-info">
            <h1 class="room-title">${this.escapeHtml(username)}'s Room</h1>
            <div class="copy-link">
              <input type="text" id="room-link" value="${window.location.href}" readonly />
              <button class="btn btn-sm btn-secondary" id="copy-link-btn">Copy</button>
            </div>
          </div>
          <div class="room-actions">
            <button class="btn btn-icon btn-ghost" id="chat-btn" title="Chat">💬</button>
            <button class="btn btn-icon btn-ghost" id="raise-btn" title="Raise Hand">✋</button>
          </div>
        </div>
        
        <div class="room-content">
          <div class="room-grid" id="participants-grid">
            ${this.renderParticipants()}
          </div>
        </div>
        
        <div class="room-controls">
          <button class="control-btn" id="mute-btn" title="${this.isMuted ? 'Unmute' : 'Mute'}">
            ${this.isMuted ? '🔇' : '🎤'}
          </button>
          <button class="control-btn danger" id="leave-btn" title="Leave">
            📴
          </button>
        </div>
      </div>
      
      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>
    `;
    
    // Event listeners
    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
      const input = document.getElementById('room-link') as HTMLInputElement;
      navigator.clipboard.writeText(input.value);
      this.showToast('Link copied!', 'success');
    });
    
    document.getElementById('mute-btn')?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      const btn = document.getElementById('mute-btn');
      if (btn) {
        btn.innerHTML = this.isMuted ? '🔇' : '🎤';
        btn.classList.toggle('active', this.isMuted);
      }
      this.onToggleMute?.();
    });
    
    document.getElementById('leave-btn')?.addEventListener('click', () => {
      this.onLeave?.();
    });
    
    document.getElementById('raise-btn')?.addEventListener('click', () => {
      const btn = document.getElementById('raise-btn');
      btn?.classList.toggle('active');
      this.onRaiseHand?.();
    });
    
    document.getElementById('chat-btn')?.addEventListener('click', () => {
      this.onToggleChat?.();
    });
  }
  
  private renderParticipants(): string {
    let html = '';
    let count = 0;
    
    for (const [id, user] of this.users) {
      const isSelf = id === this.localUserId;
      html += `
        <div class="participant-card ${user.isHost ? 'host' : ''} ${user.speaking ? 'speaking' : ''}" data-id="${id}">
          ${isSelf ? '<span class="participant-you">You</span>' : ''}
          <div class="participant-avatar">${this.getInitials(user.name)}</div>
          <div class="participant-name">${this.escapeHtml(user.name)}</div>
          <div class="participant-status">
            ${user.muted ? '�� ' : ''}
            ${user.speaking ? 'Speaking...' : isSelf ? 'You' : 'Connected'}
          </div>
          <div class="participant-controls">
            <button class="btn btn-icon btn-sm btn-ghost" data-action="mute" title="${user.muted ? 'Unmute' : 'Mute'}">
              ${user.muted ? '🔇' : '🎤'}
            </button>
          </div>
        </div>
      `;
      count++;
    }
    
    // Update count
    const countEl = document.getElementById('user-count');
    if (countEl) {
      countEl.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
    }
    
    return html || '<p class="text-secondary text-center">Waiting for others to join...</p>';
  }
  
  // User Management
  addUser(userId: string, isHost: boolean): void {
    this.users.set(userId, {
      id: userId,
      name: 'User-' + userId.slice(-4),
      isHost,
      speaking: false,
      muted: false,
      raisedHand: false
    });
    this.updateParticipants();
  }
  
  removeUser(userId: string): void {
    this.users.delete(userId);
    this.updateParticipants();
  }
  
  setUserName(userId: string, name: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.name = name;
      this.updateParticipants();
    }
  }
  
  setUserSpeaking(userId: string, speaking: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.speaking = speaking;
      this.updateParticipants();
    }
  }
  
  setUserMuted(userId: string, muted: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.muted = muted;
      this.updateParticipants();
    }
  }
  
  private updateParticipants(): void {
    const grid = document.getElementById('participants-grid');
    if (grid) {
      grid.innerHTML = this.renderParticipants();
    }
  }
  
  // Toast
  showToast(message: string, type: ToastType = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  // Helper methods
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