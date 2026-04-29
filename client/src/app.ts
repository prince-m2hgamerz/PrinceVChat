/**
 * PrinceVChat - Main Application
 * Fixed: audio, video, screen share, chat, cross-browser support
 */

import './styles.css';
import { SocketManager } from './socket';
import { WebRTCManager } from './webrtc';
import { UIManager } from './ui';

// Auto-detect ws/wss based on page protocol
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_URL = `${WS_PROTOCOL}://${window.location.host}/ws`;
const ROUTE_PREFIX = '/room/';

class App {
  private socketManager: SocketManager | null = null;
  private webrtcManager: WebRTCManager | null = null;
  private ui: UIManager;
  private roomId: string = '';
  private localStream: MediaStream | null = null;
  private userId: string = '';
  private username: string = '';
  private isHandRaised = false;
  private isScreenSharing = false;
  private currentFacingMode: 'user' | 'environment' = 'user';

  constructor() {
    this.ui = new UIManager();
    this.setupCallbacks();
    this.setupRouter();
  }

  private generateSessionId(): string {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    return 'u-' + array[0].toString(36) + array[1].toString(36);
  }

  private generateRoomId(): string {
    const array = new Uint8Array(12);
    window.crypto.getRandomValues(array);
    // Use base64url-like character set for unguessable IDs
    return Array.from(array)
      .map(b => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(b % 56))
      .join('');
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
    if (path === '/changelog') {
      this.ui.showChangelog();
      return;
    }
    if (path === '/contact') {
      this.ui.showContact();
      return;
    }
    if (path === '/report') {
      this.ui.showReport();
      return;
    }
    if (path === '/terms') {
      this.ui.showTerms();
      return;
    }
    if (path === '/privacy') {
      this.ui.showPrivacy();
      return;
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
    this.ui.setOnSetPassword((password) => this.setRoomPassword(password));
    this.ui.setOnTogglePrivacy((enabled) => this.togglePrivacy(enabled));
  }

  private createRoom(): void {
    const roomId = this.generateRoomId();
    window.history.replaceState(null, '', `${ROUTE_PREFIX}${roomId}`);
    this.joinRoom();
  }

  // ==================== JOIN ROOM ====================
  private async joinRoom(): Promise<void> {
    const path = window.location.pathname;
    const match = path.match(/\/room\/([^/]+)/);
    this.roomId = match ? match[1] : '';

    if (!this.roomId) {
      this.ui.showToast('Invalid room', 'error');
      return;
    }

    this.userId = this.generateSessionId();
    this.ui.setLocalUserId(this.userId);
    this.username = localStorage.getItem('username') || 'User';

    console.log('[App] Joining:', this.roomId, this.username);

    try {
      this.ui.showToast('Connecting...', 'success');

      // 1. Get mic + camera (camera will be disabled immediately)
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
      } catch (mediaErr) {
        console.warn('[App] Camera failed, trying audio only:', mediaErr);
        // Fallback: audio only if camera fails
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
      }

      // 2. Camera OFF by default - user can turn it on later
      this.localStream.getVideoTracks().forEach(t => { t.enabled = false; });

      // 3. Connect WebSocket & register ALL handlers before connecting
      this.socketManager = new SocketManager(WS_URL, this.userId);

      this.socketManager.on('room-users', (msg: any) => {
        const users = msg.payload as any[];
        if (msg.hostName) this.ui.setRoomTitle(msg.hostName);
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

      this.socketManager.on('user-left', (msg: any) => {
        this.ui.removeUser(msg.userId);
        this.webrtcManager?.removePeer(msg.userId);
      });

      this.socketManager.on('raise-hand', (msg: any) => {
        if (msg.userId === this.userId) {
          this.isHandRaised = !!msg.raised;
          this.ui.setHandRaised(this.isHandRaised);
        }
        this.ui.setUserHandRaised(msg.userId, !!msg.raised);
      });

      this.socketManager.on('chat', (msg: any) => {
        if (msg.message) {
          this.ui.addChatMessage(msg.userId, msg.username || 'User', msg.message, msg.userId === this.userId);
        }
      });

      this.socketManager.on('reaction', (msg: any) => {
        if (msg.userId !== this.userId && msg.emoji) this.ui.showFloatingEmoji(msg.emoji);
      });

      this.socketManager.on('video-toggle', (msg: any) => {
        this.ui.setVideoStatus(msg.userId, !!msg.enabled);
      });

      this.socketManager.on('room-locked', (msg: any) => {
        this.ui.showToast(msg.locked ? 'Room locked by host' : 'Room unlocked', 'success');
      });

      this.socketManager.on('privacy-toggle', (msg: any) => {
        this.webrtcManager?.setPrivacyMode(!!msg.enabled);
        this.ui.showToast(msg.enabled ? 'Privacy Mode active' : 'Standard Mode active', 'success');
      });

      this.socketManager.on('error', (msg: any) => {
        this.ui.showToast(msg.message || 'Error', 'error');
        if (msg.code === 'PASSWORD_REQUIRED') {
          this.cleanup();
          this.ui.showUsernameModal('join');
        }
      });

      // WebRTC signaling handlers
      this.socketManager.on('offer', async (msg: any) => {
        await this.webrtcManager?.handleOffer(msg.userId, msg.payload);
      });
      this.socketManager.on('answer', async (msg: any) => {
        await this.webrtcManager?.handleAnswer(msg.userId, msg.payload);
      });
      this.socketManager.on('ice-candidate', async (msg: any) => {
        await this.webrtcManager?.handleIceCandidate(msg.userId, msg.payload);
      });

      // 4. Connect and join
      await this.socketManager.connect();
      
      const savedPassword = localStorage.getItem('room_password') || (window as any).nextRoomPassword;
      this.socketManager.send({ 
        type: 'join', 
        roomId: this.roomId, 
        username: this.username,
        password: savedPassword
      });
      localStorage.removeItem('room_password');
      (window as any).nextRoomPassword = undefined;

      // 5. Show room UI
      this.ui.showRoom(this.roomId, this.username);

      // 6. Attach local stream to local video element
      if (this.localStream) {
        this.ui.setRemoteStream(this.userId, this.localStream);
        this.ui.setVideoStatus(this.userId, false); // camera off
      }

      // 7. Setup WebRTC
      this.webrtcManager = new WebRTCManager(this.socketManager, this.roomId, this.userId);
      this.webrtcManager.setLocalStream(this.localStream);

      this.webrtcManager.onPeerConnected((peerId: string, stream: MediaStream) => {
        console.log('[App] Peer connected with stream:', peerId, 'tracks:', stream.getTracks().map(t => t.kind));
        this.ui.setRemoteStream(peerId, stream);
      });

      this.webrtcManager.onPeerDisconnected((peerId: string) => {
        this.ui.removeUser(peerId);
      });

      this.webrtcManager.onSpeaking((peerId: string, speaking: boolean) => {
        this.ui.setUserSpeaking(peerId, speaking);
      });

      this.ui.showToast('Connected!', 'success');

    } catch (error) {
      console.error('[App] Error:', error);
      this.ui.showToast('Failed to connect. Check mic/camera permissions.', 'error');
      this.cleanup();
    }
  }

  // ==================== CONTROLS ====================
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

  private setRoomPassword(password: string): void {
    this.socketManager?.send({
      type: 'set-password',
      roomId: this.roomId,
      password: password
    });
  }

  private togglePrivacy(enabled: boolean): void {
    this.socketManager?.send({
      type: 'privacy-toggle',
      roomId: this.roomId,
      enabled: enabled
    });
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

  private async toggleScreenShare(): Promise<void> {
    if (!this.webrtcManager) return;

    if (this.isScreenSharing) {
      this.isScreenSharing = false;
      await this.restoreCamera();
    } else {
      // Check if browser supports getDisplayMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        this.ui.showToast('Screen sharing is not supported in this browser or requires HTTPS', 'error');
        return;
      }

      try {
        const stream = await this.webrtcManager.startScreenShare();
        if (stream) {
          this.isScreenSharing = true;
          this.localStream = stream;
          this.ui.setRemoteStream(this.userId, stream);
          this.ui.setVideoStatus(this.userId, true);
          this.ui.showToast('Sharing screen', 'success');
          stream.getVideoTracks()[0].onended = () => {
            if (this.isScreenSharing) this.toggleScreenShare();
          };
        }
      } catch (e: any) {
        console.error('[App] Screen share error:', e);
        const errMsg = e?.message?.toLowerCase() || '';
        if (errMsg.includes('permission denied') || errMsg.includes('notallowederror')) {
          this.ui.showToast('Screen share permission denied', 'error');
        } else {
          this.ui.showToast('Screen share failed or not supported', 'error');
        }
      }
    }
  }

  private async restoreCamera(): Promise<void> {
    if (!this.webrtcManager) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.localStream = stream;
      stream.getVideoTracks().forEach(t => { t.enabled = false; });
      this.webrtcManager.setLocalStream(stream);
      this.ui.setRemoteStream(this.userId, stream);
      this.ui.setVideoStatus(this.userId, false);
      this.ui.showToast('Camera restored', 'success');
    } catch (e) {
      console.error('Failed to restore camera', e);
    }
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

  private sendChatMessage(message: string): void {
    if (!this.socketManager) return;
    this.socketManager.send({
      type: 'chat',
      roomId: this.roomId,
      message: message
    });
  }

  private toggleDeafen(): void {
    document.querySelectorAll('video, audio').forEach(el => {
      const mediaEl = el as HTMLMediaElement;
      if (mediaEl.id !== `video-${this.userId}`) {
        mediaEl.muted = this.ui.deafened;
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

  private toggleRoomLock(locked: boolean): void {
    if (!this.socketManager) return;
    this.socketManager.send({
      type: 'toggle-lock',
      roomId: this.roomId,
      locked: locked
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
    this.isScreenSharing = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});