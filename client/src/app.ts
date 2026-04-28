/**
 * PrinceVChat - Main Application (Optimized for speed)
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
    // Generate ID or get from storage (persist across refreshes)
    let storedId = localStorage.getItem('userId');
    if (!storedId) {
      storedId = 'u-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('userId', storedId);
    }
    this.userId = storedId;
    
    this.ui = new UIManager();
    this.ui.setLocalUserId(this.userId);
    // Set up callbacks BEFORE router runs
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

      // Get mic immediately
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Connect WS immediately
      this.socketManager = new SocketManager(WS_URL, this.userId);
      await this.socketManager.connect();

      // Join room
      this.socketManager.send({
        type: 'join',
        roomId: this.roomId,
        username: this.username
      });

      // Setup WebRTC
      this.webrtcManager = new WebRTCManager(this.socketManager, this.roomId, this.userId);
      this.webrtcManager.setLocalStream(this.localStream);

      // Handle peers
      this.webrtcManager.onPeerConnected((peerId: string) => {
        this.ui.addUser(peerId, false);
        this.ui.showToast('Someone joined', 'success');
      });

      this.webrtcManager.onPeerDisconnected((peerId: string) => {
        this.ui.removeUser(peerId);
      });

      this.webrtcManager.onSpeaking((peerId: string, speaking: boolean) => {
        this.ui.setUserSpeaking(peerId, speaking);
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

// Set version in footer
const version = '1.0.2';
document.addEventListener('DOMContentLoaded', () => {
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = version;
});

document.addEventListener('DOMContentLoaded', () => {
  new App();
});