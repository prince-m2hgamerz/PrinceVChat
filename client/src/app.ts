/**
 * PrinceVChat - Main Application
 */

import { SocketManager } from './socket';
import { WebRTCManager } from './webrtc';
import { UIManager } from './ui';

// Configuration
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const WS_URL = isLocalhost ? 'ws://localhost:3000' : 'wss://your-server.com';
const ROUTE_PREFIX = '/room/';

class App {
  private socketManager: SocketManager | null = null;
  private webrtcManager: WebRTCManager | null = null;
  private ui: UIManager;
  private roomId: string | null = null;
  private localStream: MediaStream | null = null;

  constructor() {
    this.ui = new UIManager();
    this.setupRouter();
    this.setupCallbacks();
  }

  private setupRouter(): void {
    const path = window.location.pathname;

    if (path.startsWith(ROUTE_PREFIX)) {
      const roomId = path.substring(ROUTE_PREFIX.length);
      if (roomId) {
        this.joinRoom(roomId);
      }
    } else {
      this.ui.showLandingPage();
    }
  }

  private setupCallbacks(): void {
    this.ui.setOnCreateRoom(() => {
      this.createRoom();
    });

    this.ui.setOnCopyLink(() => {});

    this.ui.setOnToggleMute(() => {
      this.toggleMute();
    });

    this.ui.setOnLeave(() => {
      this.leaveRoom();
    });
  }

  private createRoom(): void {
    const roomId = this.generateRoomId();
    window.history.replaceState(null, '', `${ROUTE_PREFIX}${roomId}`);
    this.joinRoom(roomId);
  }

  private generateRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async joinRoom(roomId: string): Promise<void> {
    this.roomId = roomId;
    console.log('[App] Joining room:', roomId);

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
      const userId = 'user-' + Math.random().toString(36).substring(2, 10);
      this.socketManager = new SocketManager(WS_URL, userId);

      await this.socketManager.connect();
      console.log('[App] Connected to signaling server');

      // Join room
      this.socketManager.send({
        type: 'join',
        roomId,
      });

      // Setup WebRTC
      this.webrtcManager = new WebRTCManager(this.socketManager, roomId);
      this.webrtcManager.setLocalStream(this.localStream);

      this.webrtcManager.setOnPeerConnected((peerId: string) => {
        console.log('[App] Peer connected:', peerId);
        this.ui.addUser(peerId, false);
      });

      this.webrtcManager.setOnPeerDisconnected((peerId: string) => {
        console.log('[App] Peer disconnected:', peerId);
        this.ui.removeUser(peerId);
      });

      this.webrtcManager.setOnSpeaking((peerId: string, speaking: boolean) => {
        this.ui.setUserSpeaking(peerId, speaking);
      });

      // Show room UI
      this.ui.showRoomPage(roomId);
      this.ui.addUser(this.socketManager.userIdValue, true);
      this.ui.showToast('Connected!', 'success');

    } catch (error) {
      console.error('[App] Failed:', error);
      this.ui.showToast('Failed. Check microphone permissions.', 'error');
      this.cleanup();
      window.history.replaceState(null, '', '/');
      this.ui.showLandingPage();
    }
  }

  private toggleMute(): void {
    if (!this.webrtcManager) return;

    if (this.webrtcManager.muted) {
      this.webrtcManager.unmute();
      this.ui.setMuted(false);
    } else {
      this.webrtcManager.mute();
      this.ui.setMuted(true);
    }
  }

  private async leaveRoom(): Promise<void> {
    console.log('[App] Leaving room');
    this.cleanup();
    window.history.replaceState(null, '', '/');
    this.ui.showLandingPage();
    this.ui.showToast('Left the room', 'info');
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