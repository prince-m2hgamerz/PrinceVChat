/**
 * PrinceVChat - WebRTC (Audio only, no user tracking)
 */

import { SocketManager, SocketMessage } from './socket';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  audioElement: HTMLAudioElement | null;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
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
  
  private onPeerConnectedCb: PeerCallback | null = null;
  private onPeerDisconnectedCb: PeerCallback | null = null;
  private onSpeakingCb: SpeakingCallback | null = null;

  constructor(socketManager: SocketManager, roomId: string, userId: string) {
    this.socketManager = socketManager;
    this.roomId = roomId;
    this.userId = userId;
    // Don't setup signaling here - app handles user events
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    // Add tracks to existing peers
    for (const [, peer] of this.peers) {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peer.connection.addTrack(track, this.localStream!);
        });
      }
    }
  }

  onPeerConnected(cb: PeerCallback): void { this.onPeerConnectedCb = cb; }
  onPeerDisconnected(cb: PeerCallback): void { this.onPeerDisconnectedCb = cb; }
  onSpeaking(cb: SpeakingCallback): void { this.onSpeakingCb = cb; }

  async createPeer(peerId: string, initiator: boolean): Promise<PeerConnection | null> {
    if (this.peers.has(peerId)) return this.peers.get(peerId)!;

    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        connection.addTrack(track, this.localStream!);
      });
    }

    connection.ontrack = async (event) => {
      const [stream] = event.streams;
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.volume = 1.0;
      try {
        await audio.play();
      } catch (e) {
        // Autoplay blocked
      }
      const peer = this.peers.get(peerId);
      if (peer) peer.audioElement = audio;
      this.onPeerConnectedCb?.(peerId);
    };

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

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
        this.removePeer(peerId);
      }
    };

    const peer: PeerConnection = { peerId, connection, audioElement: null };
    this.peers.set(peerId, peer);

    if (initiator) {
      try {
        const offer = await connection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
        await connection.setLocalDescription(offer);
        console.log('[WebRTC] 📤 Sending offer to:', peerId);
        this.socketManager.send({ type: 'offer', roomId: this.roomId, targetUserId: peerId, payload: offer });
      } catch (e) {
        console.log('[WebRTC] Failed to create offer for', peerId);
      }
    }

    return peer;
  }

  // Handle incoming offer from peer
  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const peer = await this.createPeer(peerId, false); // Not initiator for offer
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      this.socketManager.send({ 
        type: 'answer', 
        roomId: this.roomId, 
        targetUserId: peerId, 
        payload: answer 
      });
    }
  }

  // Handle incoming answer from peer
  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // Handle incoming ICE candidate from peer
  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      peer.audioElement?.remove();
      this.peers.delete(peerId);
      this.onPeerDisconnectedCb?.(peerId);
    }
  }

  mute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => track.enabled = false);
      this.isMuted = true;
    }
  }

  unmute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => track.enabled = true);
      this.isMuted = false;
    }
  }

  get muted(): boolean { return this.isMuted; }
  get peerCount(): number { return this.peers.size; }

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