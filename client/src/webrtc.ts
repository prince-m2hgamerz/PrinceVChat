/**
 * PrinceVChat - WebRTC Module (Optimized for low latency)
 */

import { SocketManager, SocketMessage } from './socket';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  audioElement: HTMLAudioElement | null;
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

export class WebRTCManager {
  private peers = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private socketManager: SocketManager;
  private roomId: string;
  private isMuted = false;
  private onPeerConnected: ((peerId: string) => void) | null = null;
  private onPeerDisconnected: ((peerId: string) => void) | null = null;
  private onSpeaking: ((peerId: string, speaking: boolean) => void) | null = null;

  constructor(socketManager: SocketManager, roomId: string) {
    this.socketManager = socketManager;
    this.roomId = roomId;
    this.setupSignaling();
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  setOnPeerConnected(callback: (peerId: string) => void): void {
    this.onPeerConnected = callback;
  }

  setOnPeerDisconnected(callback: (peerId: string) => void): void {
    this.onPeerDisconnected = callback;
  }

  setOnSpeaking(callback: (peerId: string, speaking: boolean) => void): void {
    this.onSpeaking = callback;
  }

  private setupSignaling(): void {
    // New user joined - create connection as initiator
    this.socketManager.on('user-joined', async (msg: SocketMessage) => {
      if (msg.userId) {
        await this.createPeer(msg.userId, true);
      }
    });

    // Existing users when we join
    this.socketManager.on('room-users', async (msg: SocketMessage) => {
      const users = msg.payload as string[];
      for (const peerId of users) {
        await this.createPeer(peerId, false);
      }
    });

    // User left
    this.socketManager.on('user-left', (msg: SocketMessage) => {
      if (msg.userId) {
        this.removePeer(msg.userId);
      }
    });

    // Offer received
    this.socketManager.on('offer', async (msg: SocketMessage) => {
      if (!msg.userId) return;
      
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
      if (!msg.userId) return;
      
      const peer = this.peers.get(msg.userId);
      if (!peer) return;

      const answer = new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit);
      await peer.connection.setRemoteDescription(answer);
    });

    // ICE candidate received
    this.socketManager.on('ice-candidate', async (msg: SocketMessage) => {
      if (!msg.userId) return;
      
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
    connection.ontrack = (event) => {
      const [stream] = event.streams;
      console.log('[WebRTC] Track received from:', peerId);

      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      // @ts-ignore - playsInline is not in TypeScript DOM types
      audio.playsInline = true;
      audio.volume = 1;

      // Create audio analyzer for speaking detection
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const check = () => {
          if (!this.peers.has(peerId)) {
            ctx.close();
            return;
          }
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b) / data.length;
          this.onSpeaking?.(peerId, avg > 25);
          requestAnimationFrame(check);
        };
        check();
      } catch (e) {
        // AudioContext may be blocked
      }

      const peer = this.peers.get(peerId);
      if (peer) peer.audioElement = audio;

      this.onPeerConnected?.(peerId);
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
    this.onPeerDisconnected?.(peerId);
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