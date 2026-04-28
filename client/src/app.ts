/**
 * PrinceVChat - Main Application
 */

import './styles.css';
import { SocketManager } from './socket';
import { WebRTCManager } from './webrtc';
import { UIManager } from './ui';

// Use secure WebSocket (wss://) for HTTPS
const WS_URL = `wss://${window.location.host}/ws`;
const ROUTE_PREFIX = '/room/';

class App {
  private socketManager: SocketManager | null = null;
  private webrtcManager: WebRTCManager | null = null;
  private ui: UIManager;
  private roomId: string | null = null;
  private localStream: MediaStream | null = null;
  private userId: string = '';

  constructor() {
    this.userId = 'user-' + Math.random().toString(36).substring(2, 10);
    this.ui = new UIManager();
    this.ui.setLocalUserId(this.userId);
    this.setupRouter();
    this.setupCallbacks();
  }

  private setupRouter(): void {
    const path = window.location.pathname;

    if (path.startsWith(ROUTE_PREFIX)) {
      const roomId = path.substring(ROUTE_PREFIX.length);
      if (roomId) {
        this.ui.showUsernameModal('join');
      }
    } else {
      this.ui.render();
    }
  }

  private setupCallbacks(): void {
    this.ui.setOnCreateRoom(() => {
      this.createRoom();
    });

    this.ui.setOnJoinRoom(() => {
      this.joinRoom();
    });

    this.ui.setOnToggleMute(() => {
      this.toggleMute();
    });

    this.ui.setOnLeave(() => {
      this.leaveRoom();
    });

    this.ui.setOnRaiseHand(() => {
      this.toggleRaiseHand();
    });
  }

  private createRoom(): void {
    const roomId = this.generateRoomId();
    window.history.replaceState(null, '', `${ROUTE_PREFIX}${roomId}`);
    this.joinRoom();
  }

  private generateRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async joinRoom(): Promise<void> {
    const path = window.location.pathname;
    const match = path.match(/\/room\/([^/]+)/);
    const roomId = match ? match[1] : '';
    
    if (!roomId) {
      this.ui.showToast('Invalid room', 'error');
      return;
    }

    this.roomId = roomId;
    const username = localStorage.getItem('username') || 'User';

    console.log('[App] Joining room:', roomId, 'as', username);

    try {
      this.ui.showToast('Connecting...', 'info');

      // Get microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log('[App] Microphone ready');

      // Connect to WebSocket
      this.socketManager = new SocketManager(WS_URL, this.userId);

      await this.socketManager.connect();
      console.log('[App] Connected to signaling server');

      // Join room
      this.socketManager.send({
        type: 'join',
        roomId,
        username
      });

      // Setup WebRTC
      this.webrtcManager = new WebRTCManager(this.socketManager, roomId, this.userId);
      this.webrtcManager.setLocalStream(this.localStream);

      // Handle peer events
      this.webrtcManager.onPeerConnected((peerId: string) => {
        console.log('[App] Peer connected:', peerId);
        this.ui.addUser(peerId, false);
        this.ui.showToast('Someone joined', 'success');
      });

      this.webrtcManager.onPeerDisconnected((peerId: string) => {
        console.log('[App] Peer disconnected:', peerId);
        this.ui.removeUser(peerId);
      });

      this.webrtcManager.onSpeaking((peerId: string, speaking: boolean) => {
        this.ui.setUserSpeaking(peerId, speaking);
      });

      // Show room UI
      this.ui.showRoomPage(roomId, username);
      this.ui.showToast('Connected!', 'success');

    } catch (error) {
      console.error('[App] Failed:', error);
      this.ui.showToast('Failed. Check microphone permissions.', 'error');
      this.cleanup();
      window.history.replaceState(null, '', '/');
      this.ui.render();
    }
  }

  private toggleMute(): void {
    if (!this.webrtcManager) return;

    // Note: Mute is handled in UI state now
    // This triggers socket event if needed
    console.log('[App] Toggle mute');
  }

  private toggleRaiseHand(): void {
    if (!this.socketManager) return;

    this.socketManager.send({
      type: 'raise-hand',
      roomId: this.roomId
    });
  }

  private async leaveRoom(): Promise<void> {
    console.log('[App] Leaving room');
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

    this.roomId = null;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new App();
});