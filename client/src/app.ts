/**
 * PrinceVChat - Main Application (Fixed - WebSocket based user tracking)
 */

import './styles.css';
import { SocketManager } from './socket';
import { WebRTCManager } from './webrtc';
import { UIManager } from './ui';

const WS_URL = `wss://${window.location.host}/ws`;
const ROUTE_PREFIX = '/room/';

class App {
  private socketManager: SocketManager | null = null;
  private webrtcManager: WebRTCManager | null = null;
  private ui: UIManager;
  private roomId: string = '';
  private localStream: MediaStream | null = null;
  private userId: string = '';
  private username: string = '';

  constructor() {
    // Generate or get persisted ID
    let storedId = localStorage.getItem('userId');
    if (!storedId) {
      storedId = 'u-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('userId', storedId);
    }
    this.userId = storedId;
    
    this.ui = new UIManager();
    this.ui.setLocalUserId(this.userId);
    this.setupCallbacks();
    this.setupRouter();
  }

  private setupRouter(): void {
    const path = window.location.pathname;
    if (path.startsWith(ROUTE_PREFIX)) {
      const match = path.match(/\/room\/([^/]+)/);
      if (match && match[1]) {
        this.ui.showUsernameModal('join');
        return;
      }
    }
    this.ui.render();
  }

  private setupCallbacks(): void {
    this.ui.setOnCreateRoom(() => this.createRoom());
    this.ui.setOnJoinRoom(() => this.joinRoom());
    this.ui.setOnMute(() => this.toggleMute());
    this.ui.setOnLeave(() => this.leaveRoom());
    this.ui.setOnRaiseHand(() => this.toggleRaiseHand());
  }

  private createRoom(): void {
    const roomId = this.generateRoomId();
    window.history.replaceState(null, '', `${ROUTE_PREFIX}${roomId}`);
    this.joinRoom();
  }

  private generateRoomId(): string {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async joinRoom(): Promise<void> {
    const path = window.location.pathname;
    const match = path.match(/\/room\/([^/]+)/);
    this.roomId = match ? match[1] : '';
    
    if (!this.roomId) {
      this.ui.showToast('Invalid room', 'error');
      return;
    }

    this.username = localStorage.getItem('username') || 'User';
    this.setupCallbacks();

    console.log('[App] Joining:', this.roomId, this.username);

    try {
      this.ui.showToast('Connecting...', 'success');

      // Get mic
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Connect WebSocket
      this.socketManager = new SocketManager(WS_URL, this.userId);
      await this.socketManager.connect();

      // Join room with name
      this.socketManager.send({
        type: 'join',
        roomId: this.roomId,
        username: this.username
      });

      // Setup WebRTC (for audio only)
      this.webrtcManager = new WebRTCManager(this.socketManager, this.roomId, this.userId);
      this.webrtcManager.setLocalStream(this.localStream);

      // Handle WebRTC events
      this.webrtcManager.onPeerConnected((peerId: string) => {
        console.log('[App] WebRTC peer connected:', peerId);
      });

      this.webrtcManager.onPeerDisconnected((peerId: string) => {
        console.log('[App] WebRTC peer disconnected:', peerId);
        this.ui.removeUser(peerId);
      });

      this.webrtcManager.onSpeaking((peerId: string, speaking: boolean) => {
        this.ui.setUserSpeaking(peerId, speaking);
      });

      // === CRITICAL: Handle user sync via WebSocket (not WebRTC) ===
      
      // When we join, we get list of existing users
      this.socketManager.on('room-users', (msg: any) => {
        const users = msg.payload as { id: string; username: string }[];
        console.log('[App] Got room users:', users);
        for (const user of users) {
          if (user.id !== this.userId) {
            // Add user to UI directly (not via WebRTC)
            this.ui.addUser(user.id, false, user.username);
          }
        }
      });

      // When someone joins (via broadcast)
      this.socketManager.on('user-joined', (msg: any) => {
        console.log('[App] User joined:', msg.userId, msg.username);
        if (msg.userId !== this.userId && msg.username) {
          this.ui.addUser(msg.userId, false, msg.username);
          this.ui.showToast(`${msg.username} joined!`, 'success');
        }
      });

      // When someone leaves
      this.socketManager.on('user-left', (msg: any) => {
        console.log('[App] User left:', msg.userId);
        this.ui.removeUser(msg.userId);
      });

      // Show room
      this.ui.showRoom(this.roomId, this.username);
      this.ui.showToast('Connected!', 'success');

    } catch (error) {
      console.error('[App] Error:', error);
      this.ui.showToast('Failed to connect', 'error');
      this.cleanup();
    }
  }

  private toggleMute(): void {
    if (!this.webrtcManager) return;
    if (this.webrtcManager.muted) {
      this.webrtcManager.unmute();
    } else {
      this.webrtcManager.mute();
    }
  }

  private toggleRaiseHand(): void {
    if (!this.socketManager) return;
    this.socketManager.send({
      type: 'raise-hand',
      roomId: this.roomId,
      raised: true
    });
    this.ui.showToast('Hand raised!', 'success');
  }

  private leaveRoom(): void {
    this.cleanup();
    window.history.replaceState(null, '', '/');
    this.ui.render();
  }

  private cleanup(): void {
    if (this.webrtcManager) {
      this.webrtcManager.cleanup();
      this.webrtcManager = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.socketManager) {
      this.socketManager.disconnect();
      this.socketManager = null;
    }
    this.roomId = '';
  }
}

// Version - hardcoded for now
const APP_VERSION = '1.0.6';

document.addEventListener('DOMContentLoaded', () => {
  // Update version in footer
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = APP_VERSION;
  
  // Initialize app
  new App();
});