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
  private isMuted = false;
  private isVideoOn = false;
  private isHandRaised = false;
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
    this.ui.setOnToggleVideo(() => this.toggleVideo());
    this.ui.setOnSwitchCamera(() => this.switchCamera());
    this.ui.setOnLeave(() => this.leaveRoom());
    this.ui.setOnRaiseHand(() => this.toggleRaiseHand());
    this.ui.setOnChat((msg) => this.sendChatMessage(msg));
    this.ui.setOnDeafen(() => this.toggleDeafen());
    this.ui.setOnReaction((emoji) => this.sendReaction(emoji));
    this.ui.setOnScreenShare(() => this.toggleScreenShare());
    this.ui.setOnToggleLock((locked) => this.toggleRoomLock(locked));
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

  private async switchCamera(): Promise<void> {
    if (!this.webrtcManager) return;
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    try {
      const stream = await this.webrtcManager.switchCamera(this.currentFacingMode);
      if (stream) {
        this.localStream = stream;
        this.ui.setRemoteStream(this.userId, stream);
        this.ui.showToast('Switched camera', 'success');
      }
    } catch (e) {
      this.ui.showToast('Failed to switch camera', 'error');
    }
  }

  private async joinRoom(): Promise<void> {
    const path = window.location.pathname;
    const match = path.match(/\/room\/([^/]+)/);
    this.roomId = match ? match[1] : '';
    
    if (!this.roomId) {
      this.ui.showToast('Invalid room', 'error');
      return;
    }

    // Unlock audio context for modern browsers
    const unlockAudio = () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Generate NEW session ID for this room visit
    this.userId = this.generateSessionId();
    this.ui.setLocalUserId(this.userId);
    
    this.username = localStorage.getItem('username') || 'User';
    console.log('[App] Joining:', this.roomId, this.username);

    try {
      this.ui.showToast('Connecting...', 'success');

      // Get mic and camera
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });

      // Default: Camera OFF on join
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });

      // Connect WebSocket
      this.socketManager = new SocketManager(WS_URL, this.userId);
      
      // Register handlers
      this.socketManager.on('room-users', (msg: any) => {
        const users = msg.payload as any[];
        const hostName = msg.hostName;
        if (hostName) this.ui.setRoomTitle(hostName);
        
        for (const user of users) {
          if (user.id !== this.userId) {
            this.ui.addUser(user.id, user.isHost, user.username);
            if (user.handRaised) this.ui.setUserHandRaised(user.id, true);
            if (user.videoOn) this.ui.setVideoStatus(user.id, true);
          }
        }
      });

      this.socketManager.on('user-joined', async (msg: any) => {
        if (msg.userId !== this.userId && msg.username) {
          this.ui.addUser(msg.userId, false, msg.username);
          this.ui.showToast(`${msg.username} joined!`, 'success');
          await this.webrtcManager?.createPeer(msg.userId, true);
        }
      });

      this.socketManager.on('user-left', (msg: any) => this.ui.removeUser(msg.userId));
      
      this.socketManager.on('raise-hand', (msg: any) => {
        if (msg.userId === this.userId) {
          this.isHandRaised = !!msg.raised;
          this.ui.setHandRaised(this.isHandRaised);
        }
        this.ui.setUserHandRaised(msg.userId, !!msg.raised);
      });

      this.socketManager.on('chat', (msg: any) => {
        if (msg.message) this.ui.addChatMessage(msg.userId, msg.username || 'User', msg.message, msg.userId === this.userId);
      });

      this.socketManager.on('reaction', (msg: any) => {
        if (msg.userId !== this.userId && msg.emoji) this.ui.showFloatingEmoji(msg.emoji);
      });

      this.socketManager.on('video-toggle', (msg: any) => {
        this.ui.setVideoStatus(msg.userId, !!msg.enabled);
      });

      await this.socketManager.connect();
      this.socketManager.send({ type: 'join', roomId: this.roomId, username: this.username });

      // Show room UI
      this.ui.showRoom(this.roomId, this.username);
      
      if (this.localStream) {
        this.ui.setRemoteStream(this.userId, this.localStream);
        this.ui.setVideoStatus(this.userId, false); // Local camera off initially
      }

      this.webrtcManager = new WebRTCManager(this.socketManager, this.roomId, this.userId);
      this.webrtcManager.setLocalStream(this.localStream);

      this.webrtcManager.onPeerConnected((peerId: string, stream: MediaStream) => {
        this.ui.setRemoteStream(peerId, stream);
      });

      this.webrtcManager.onPeerDisconnected((peerId: string) => this.ui.removeUser(peerId));

      this.socketManager.on('offer', async (msg: any) => await this.webrtcManager?.handleOffer(msg.userId, msg.payload));
      this.socketManager.on('answer', async (msg: any) => await this.webrtcManager?.handleAnswer(msg.userId, msg.payload));
      this.socketManager.on('ice-candidate', async (msg: any) => await this.webrtcManager?.handleIceCandidate(msg.userId, msg.payload));
      
      this.webrtcManager.onSpeaking((peerId: string, speaking: boolean) => this.ui.setUserSpeaking(peerId, speaking));

      this.ui.showToast('Connected!', 'success');

    } catch (error) {
      console.error('[App] Error:', error);
      this.ui.showToast('Failed to connect', 'error');
      this.cleanup();
    }
  }

  private isHandRaised = false;

  private toggleRaiseHand(): void {
    if (!this.socketManager) return;
    this.isHandRaised = !this.isHandRaised;
    // Send to server - server will broadcast back to ALL including us
    this.socketManager.send({
      type: 'raise-hand',
      roomId: this.roomId,
      raised: this.isHandRaised
    });
    this.ui.showToast(this.isHandRaised ? 'Hand raised!' : 'Hand lowered', 'success');
  }

  private sendChatMessage(message: string): void {
    if (!this.socketManager) return;
    this.socketManager.send({
      type: 'chat',
      roomId: this.roomId,
      message: message
    });
  }

  private sendChatMessage(message: string): void {
    if (!this.socketManager) return;
    this.socketManager.send({
      type: 'chat',
      roomId: this.roomId,
      message: message
    });
  }

  private toggleMute(): void {
    if (!this.webrtcManager) return;
    const isMuted = this.webrtcManager.toggleAudio();
    this.ui.showToast(isMuted ? 'Muted' : 'Unmuted', 'success');
  }

  private toggleVideo(): void {
    if (!this.webrtcManager) return;
    const isOff = this.webrtcManager.toggleVideo();
    this.socketManager?.send({
      type: 'video-toggle',
      roomId: this.roomId,
      enabled: !isOff
    });
    this.ui.setVideoStatus(this.userId, !isOff);
    this.ui.showToast(isOff ? 'Camera off' : 'Camera on', 'success');
  }

  private isScreenSharing = false;
  private async toggleScreenShare(): Promise<void> {
    if (!this.webrtcManager) return;
    
    if (this.isScreenSharing) {
      // Revert to camera
      this.isScreenSharing = false;
      await this.startCamera();
    } else {
      const stream = await this.webrtcManager.startScreenShare();
      if (stream) {
        this.isScreenSharing = true;
        this.localStream = stream;
        this.ui.setRemoteStream(this.userId, stream);
        this.ui.showToast('Sharing screen', 'success');
        
        // Handle when user stops sharing via browser bar
        stream.getVideoTracks()[0].onended = () => {
          if (this.isScreenSharing) this.toggleScreenShare();
        };
      }
    }
  }

  private async startCamera(): Promise<void> {
    if (!this.webrtcManager) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      this.localStream = stream;
      this.webrtcManager.setLocalStream(stream);
      this.ui.setRemoteStream(this.userId, stream);
      this.ui.showToast('Reverted to camera', 'success');
    } catch (e) {
      console.error('Failed to restart camera', e);
    }
  }

  private toggleRoomLock(locked: boolean): void {
    if (!this.socketManager) return;
    this.socketManager.send({
      type: 'toggle-lock',
      roomId: this.roomId,
      locked: locked
    });
  }

  private toggleRaiseHand(): void {
    if (!this.socketManager) return;
    this.isHandRaised = !this.isHandRaised;
    this.socketManager.send({
      type: 'raise-hand',
      roomId: this.roomId,
      raised: this.isHandRaised
    });
    this.ui.showToast(this.isHandRaised ? 'Hand raised!' : 'Hand lowered', 'success');
  }

  private toggleDeafen(): void {
    if (!this.webrtcManager) return;
    document.querySelectorAll('audio, video').forEach(el => {
      if (el.id !== `video-${this.userId}`) {
        (el as HTMLMediaElement).muted = this.ui.deafened;
      }
    });
  }

  private sendReaction(emoji: string): void {
    if (!this.socketManager) return;
    this.socketManager.send({
      type: 'reaction',
      roomId: this.roomId,
      emoji: emoji
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

// Version is now hardcoded in UI
document.addEventListener('DOMContentLoaded', () => {
  new App();
});