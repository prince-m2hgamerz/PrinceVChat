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
    this.ui = new UIManager();
    this.setupCallbacks();
    this.setupRouter();
  }

  // Generate a new session ID each time (not persisted)
  private generateSessionId(): string {
    return 'u-' + Math.random().toString(36).substring(2, 10);
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

    // Generate NEW session ID for this room visit (not persisted!)
    this.userId = this.generateSessionId();
    this.ui.setLocalUserId(this.userId);
    
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
      
      // === CRITICAL: Register handlers BEFORE connecting ===
      // Handle user sync via WebSocket (not WebRTC)
      
      // When we join, we get list of existing users (exclude self)
      // We are the NEW user - we DON'T create offers, we wait for existing users to offer us
      this.socketManager.on('room-users', (msg: any) => {
        const users = msg.payload as { id: string; username: string }[];
        for (const user of users) {
          if (user.id !== this.userId) {
            this.ui.addUser(user.id, false, user.username);
            // Don't create peer here - existing users will send offers to us
          }
        }
      });

      // When someone joins (via broadcast) - WE are already in room, so WE send offer
      this.socketManager.on('user-joined', async (msg: any) => {
        console.log('[App] User joined:', msg.userId, msg.username);
        if (msg.userId !== this.userId && msg.username) {
          this.ui.addUser(msg.userId, false, msg.username);
          this.ui.showToast(`${msg.username} joined!`, 'success');
          // We are already in room - send offer to new user
          await this.webrtcManager?.createPeer(msg.userId, true);
        }
      });

      // When someone leaves
      this.socketManager.on('user-left', (msg: any) => {
        console.log('[App] User left:', msg.userId);
        this.ui.removeUser(msg.userId);
      });

      // Now connect - server will immediately send room-users
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

      // Handle WebRTC signaling
      this.socketManager.on('offer', async (msg: any) => {
        console.log('[App] 📞 Received offer from:', msg.userId);
        await this.webrtcManager?.handleOffer(msg.userId, msg.payload);
      });

      this.socketManager.on('answer', async (msg: any) => {
        console.log('[App] 📞 Received answer from:', msg.userId);
        await this.webrtcManager?.handleAnswer(msg.userId, msg.payload);
      });

      this.socketManager.on('ice-candidate', async (msg: any) => {
        console.log('[App] 🧊 Received ICE from:', msg.userId);
        await this.webrtcManager?.handleIceCandidate(msg.userId, msg.payload);
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

// Version is now hardcoded in UI
document.addEventListener('DOMContentLoaded', () => {
  new App();
});