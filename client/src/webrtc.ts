/**
 * PrinceVChat - WebRTC Module (Optimized for low latency)
 */

import { SocketManager, SocketMessage } from './socket';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  audioElement: HTMLAudioElement | null;
  pendingAudio: HTMLAudioElement | null;
}

// Use multiple STUN servers for better connectivity
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

// Audio constraints optimized for voice
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
};

type PeerCallback = (peerId: string) => void;
type SpeakingCallback = (peerId: string, speaking: boolean) => void;

export class WebRTCManager {
  private peers = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private socketManager: SocketManager;
  private roomId: string;
  private userId: string;
  private isMuted = false;
  
  // Event callbacks
  private onPeerConnectedCb: PeerCallback | null = null;
  private onPeerDisconnectedCb: PeerCallback | null = null;
  private onSpeakingCb: SpeakingCallback | null = null;

  constructor(socketManager: SocketManager, roomId: string, userId: string) {
    this.socketManager = socketManager;
    this.roomId = roomId;
    this.userId = userId;
    this.setupSignaling();
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  onPeerConnected(cb: PeerCallback): void {
    this.onPeerConnectedCb = cb;
  }

  onPeerDisconnected(cb: PeerCallback): void {
    this.onPeerDisconnectedCb = cb;
  }

  onSpeaking(cb: SpeakingCallback): void {
    this.onSpeakingCb = cb;
  }

  private setupSignaling(): void {
    // New user joined - create connection as initiator
    this.socketManager.on('user-joined', async (msg: SocketMessage) => {
      if (msg.userId && msg.userId !== this.userId) {
        console.log('[WebRTC] User joined:', msg.userId, msg.username);
        await this.createPeer(msg.userId, true);
      }
    });

    // Existing users when we join - payload is array of {id, username}
    this.socketManager.on('room-users', async (msg: SocketMessage) => {
      const users = msg.payload as { id: string; username: string }[];
      console.log('[WebRTC] Got room users:', users);
      for (const user of users) {
        if (user.id !== this.userId) {
          console.log('[WebRTC] Connecting to:', user.id, user.username);
          await this.createPeer(user.id, false);
        }
      }
    });

    // User left
    this.socketManager.on('user-left', (msg: SocketMessage) => {
      if (msg.userId) {
        this.removePeer(msg.userId);
      }
    });

    // Raise hand notification
    this.socketManager.on('raise-hand', (msg: SocketMessage) => {
      console.log('[WebRTC] Raise hand:', msg.userId, msg.raised);
    });

    // Offer received
    this.socketManager.on('offer', async (msg: SocketMessage) => {
      if (!msg.userId || msg.userId === this.userId) return;
      
      const peer = await this.createPeer(msg.userId, false);
      if (!peer) return;

      const offer = new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit);
      await peer.connection.setRemoteDescription(offer);

      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);

      this.socketManager.send({
        type: 'answer',
        roomId: this.roomId,
        targetUserId: msg.userId,
        payload: answer,
      });
    });

    // Answer received
    this.socketManager.on('answer', async (msg: SocketMessage) => {
      if (!msg.userId || msg.userId === this.userId) return;
      
      const peer = this.peers.get(msg.userId);
      if (!peer) return;

      const answer = new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit);
      await peer.connection.setRemoteDescription(answer);
    });

    // ICE candidate received
    this.socketManager.on('ice-candidate', async (msg: SocketMessage) => {
      if (!msg.userId || msg.userId === this.userId) return;
      
      const peer = this.peers.get(msg.userId);
      if (!peer) return;

      const candidate = new RTCIceCandidate(msg.payload as RTCIceCandidateInit);
      await peer.connection.addIceCandidate(candidate);
    });
  }

  private async createPeer(peerId: string, initiator: boolean): Promise<PeerConnection | null> {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    console.log('[WebRTC] Creating peer:', peerId, initiator ? 'initiator' : 'receiver');

    // RTCPeerConnection with optimized config
    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        connection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    connection.ontrack = async (event) => {
      const [stream] = event.streams;
      console.log('[WebRTC] Track received from:', peerId);

      // Create audio element - play immediately without waiting
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.volume = 1.0;

      // Try to play, but don't block
      try {
        audio.play().catch(() => {
          // Autoplay blocked - queue for later
          peer.pendingAudio = audio;
        });
      } catch (e) {
        peer.pendingAudio = audio;
      }

      const peer = this.peers.get(peerId);
      if (peer) peer.audioElement = audio;

      this.onPeerConnectedCb?.(peerId);
    };

    // Send ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketManager.send({
          type: 'ice-candidate',
          roomId: this.roomId,
          targetUserId: peerId,
          payload: event.candidate.toJSON(),
        });
      }
    };

    // Handle disconnection
    connection.onconnectionstatechange = () => {
      console.log('[WebRTC] State:', peerId, connection.connectionState);
      if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
        this.removePeer(peerId);
      }
    };

    const peer: PeerConnection = {
      peerId,
      connection,
      audioElement: null,
      pendingAudio: null,
    };

    this.peers.set(peerId, peer);

    // If initiator, create offer
    if (initiator) {
      const offer = await connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await connection.setLocalDescription(offer);

      this.socketManager.send({
        type: 'offer',
        roomId: this.roomId,
        targetUserId: peerId,
        payload: offer,
      });
    }

    return peer;
  }

  private removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    console.log('[WebRTC] Removing peer:', peerId);

    peer.connection.close();
    peer.audioElement?.remove();
    this.peers.delete(peerId);
    this.onPeerDisconnectedCb?.(peerId);
  }

  mute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.isMuted = true;
    }
  }

  unmute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.isMuted = false;
    }
  }

  // Call this on user interaction to play blocked audio
  async playPendingAudio(): Promise<void> {
    for (const [peerId, peer] of this.peers) {
      if (peer.pendingAudio) {
        try {
          await peer.pendingAudio.play();
          peer.audioElement = peer.pendingAudio;
          peer.pendingAudio = null;
          console.log('[WebRTC] Playing pending audio for:', peerId);
        } catch (e) {}
      }
    }
  }

  get muted(): boolean {
    return this.isMuted;
  }

  get peerCount(): number {
    return this.peers.size;
  }

  async cleanup(): Promise<void> {
    for (const peerId of this.peers.keys()) {
      this.removePeer(peerId);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  static getAudioConstraints(): MediaTrackConstraints {
    return AUDIO_CONSTRAINTS;
  }
}