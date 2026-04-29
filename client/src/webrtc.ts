/**
 * PrinceVChat - WebRTC (Audio & Video)
 */

import { SocketManager } from './socket';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCManager {
  private peers = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private socketManager: SocketManager;
  private roomId: string;
  private userId: string;
  private isMuted = false;
  private isVideoOff = false;
  
  private onPeerConnectedCb: ((peerId: string, stream: MediaStream) => void) | null = null;
  private onPeerDisconnectedCb: ((peerId: string) => void) | null = null;
  private onSpeakingCb: ((peerId: string, speaking: boolean) => void) | null = null;

  constructor(socketManager: SocketManager, roomId: string, userId: string) {
    this.socketManager = socketManager;
    this.roomId = roomId;
    this.userId = userId;
  }

  setLocalStream(stream: MediaStream): void {
    const oldStream = this.localStream;
    this.localStream = stream;

    // Replace tracks for all existing peers
    this.peers.forEach(peer => {
      const senders = peer.connection.getSenders();
      this.localStream?.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          peer.connection.addTrack(track, this.localStream!);
        }
      });
    });

    if (oldStream && oldStream !== stream) {
      oldStream.getTracks().forEach(t => t.stop());
    }
  }

  onPeerConnected(cb: (peerId: string, stream: MediaStream) => void): void { this.onPeerConnectedCb = cb; }
  onPeerDisconnected(cb: (peerId: string) => void): void { this.onPeerDisconnectedCb = cb; }
  onSpeaking(cb: (peerId: string, speaking: boolean) => void): void { this.onSpeakingCb = cb; }

  async createPeer(peerId: string, initiator: boolean): Promise<PeerConnection | null> {
    if (this.peers.has(peerId)) return this.peers.get(peerId)!;

    console.log(`[WebRTC] Creating peer for ${peerId}, initiator: ${initiator}`);
    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        connection.addTrack(track, this.localStream!);
      });
    }

    connection.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${peerId}`);
      const [stream] = event.streams;
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.stream = stream;
        this.onPeerConnectedCb?.(peerId, stream);
      }
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketManager.send({
          type: 'ice-candidate',
          roomId: this.roomId,
          targetUserId: peerId,
          payload: event.candidate,
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed' || connection.connectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    const peer: PeerConnection = { peerId, connection, stream: null };
    this.peers.set(peerId, peer);

    if (initiator) {
      const offer = await connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await connection.setLocalDescription(offer);
      this.socketManager.send({ type: 'offer', roomId: this.roomId, targetUserId: peerId, payload: offer });
    }

    return peer;
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const peer = await this.createPeer(peerId, false);
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

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('[WebRTC] Error adding ICE candidate', e);
      }
    }
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(peerId);
      this.onPeerDisconnectedCb?.(peerId);
    }
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
        return this.isMuted;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isVideoOff = !videoTrack.enabled;
        return this.isVideoOff;
      }
    }
    return false;
  }

  get muted(): boolean { return this.isMuted; }
  get videoOff(): boolean { return this.isVideoOff; }

  async switchCamera(facingMode: 'user' | 'environment'): Promise<MediaStream | null> {
    if (!this.localStream) return null;

    const currentAudioTrack = this.localStream.getAudioTracks()[0];
    
    // Stop current video tracks
    this.localStream.getVideoTracks().forEach(t => t.stop());

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    
    if (this.localStream) {
      // Re-enable if it was enabled before
      newVideoTrack.enabled = !this.isVideoOff;
      
      // If we have an existing stream, we just want to replace the video track
      const stream = new MediaStream([currentAudioTrack, newVideoTrack]);
      this.setLocalStream(stream);
      return stream;
    }
    
    return null;
  }

  async cleanup(): Promise<void> {
    this.peers.forEach(peer => peer.connection.close());
    this.peers.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}