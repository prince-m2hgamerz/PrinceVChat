/**
 * PrinceVChat - WebRTC (Audio & Video)
 * Fixed: cross-browser audio, iOS Safari support, TURN fallback
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
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Free TURN servers for NAT traversal (works on mobile networks)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class WebRTCManager {
  private peers = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private socketManager: SocketManager;
  private roomId: string;
  private userId: string;
  private isMuted = false;
  private isVideoOff = true; // starts OFF

  private onPeerConnectedCb: ((peerId: string, stream: MediaStream) => void) | null = null;
  private onPeerDisconnectedCb: ((peerId: string) => void) | null = null;
  private onSpeakingCb: ((peerId: string, speaking: boolean) => void) | null = null;

  private audioContext: AudioContext | null = null;
  private analysers: Map<string, { analyser: AnalyserNode; dataArray: Uint8Array }> = new Map();
  private speakingState: Map<string, boolean> = new Map();
  private analysisRunning = false;

  constructor(socketManager: SocketManager, roomId: string, userId: string) {
    this.socketManager = socketManager;
    this.roomId = roomId;
    this.userId = userId;
  }

  setLocalStream(stream: MediaStream | null): void {
    this.localStream = stream;
    if (stream) {
      this.setupAudioAnalysis('local', stream);
    }

    // Replace tracks for all existing peers
    this.peers.forEach(peer => {
      if (!stream) return;
      const senders = peer.connection.getSenders();
      stream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack error:', e));
        } else {
          try {
            peer.connection.addTrack(track, stream);
          } catch (e) {
            console.warn('[WebRTC] addTrack error:', e);
          }
        }
      });
    });
  }

  private setupAudioAnalysis(id: string, stream: MediaStream): void {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        this.audioContext = new AudioCtx();
      }

      // Resume if suspended (iOS requirement)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      // Don't recreate analyser if it already exists for this id
      if (this.analysers.has(id)) return;

      const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      this.analysers.set(id, { analyser, dataArray });

      if (!this.analysisRunning) {
        this.analysisRunning = true;
        this.startAnalysisLoop();
      }
    } catch (e) {
      console.warn('[WebRTC] Audio analysis setup error:', e);
    }
  }

  private startAnalysisLoop(): void {
    const loop = () => {
      if (!this.analysisRunning) return;
      this.analysers.forEach((data, id) => {
        data.analyser.getByteFrequencyData(data.dataArray);
        const average = data.dataArray.reduce((a, b) => a + b) / data.dataArray.length;
        const isSpeaking = average > 30;

        if (this.speakingState.get(id) !== isSpeaking) {
          this.speakingState.set(id, isSpeaking);
          const peerId = id === 'local' ? this.userId : id;
          this.onSpeakingCb?.(peerId, isSpeaking);
        }
      });
      requestAnimationFrame(loop);
    };
    loop();
  }

  onPeerConnected(cb: (peerId: string, stream: MediaStream) => void): void { this.onPeerConnectedCb = cb; }
  onPeerDisconnected(cb: (peerId: string) => void): void { this.onPeerDisconnectedCb = cb; }
  onSpeaking(cb: (peerId: string, speaking: boolean) => void): void { this.onSpeakingCb = cb; }

  async createPeer(peerId: string, initiator: boolean): Promise<PeerConnection | null> {
    // If peer already exists, remove and recreate for clean state
    if (this.peers.has(peerId)) {
      const old = this.peers.get(peerId)!;
      old.connection.close();
      this.peers.delete(peerId);
    }

    console.log(`[WebRTC] Creating peer for ${peerId}, initiator: ${initiator}`);
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          connection.addTrack(track, this.localStream!);
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      });
    }

    // Handle incoming remote tracks
    connection.ontrack = (event) => {
      console.log(`[WebRTC] Received track (${event.track.kind}) from ${peerId}`);

      const peer = this.peers.get(peerId);
      if (!peer) return;

      // Use the stream from the event, or create one
      let stream = event.streams[0];
      if (!stream) {
        stream = new MediaStream();
      }

      // Always add the track to make sure it's in the stream
      if (!stream.getTracks().find(t => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }

      peer.stream = stream;

      // Setup audio analysis for remote peer
      if (event.track.kind === 'audio') {
        this.setupAudioAnalysis(peerId, stream);
      }

      // Notify the app layer
      this.onPeerConnectedCb?.(peerId, stream);
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
      console.log(`[WebRTC] Peer ${peerId} state: ${connection.connectionState}`);
      if (connection.connectionState === 'failed') {
        console.warn(`[WebRTC] Peer ${peerId} failed, attempting restart`);
        this.removePeer(peerId);
      } else if (connection.connectionState === 'disconnected') {
        // Give it a moment to reconnect before removing
        setTimeout(() => {
          if (connection.connectionState === 'disconnected') {
            this.removePeer(peerId);
          }
        }, 5000);
      }
    };

    const peer: PeerConnection = { peerId, connection, stream: null };
    this.peers.set(peerId, peer);

    if (initiator) {
      try {
        const offer = await connection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await connection.setLocalDescription(offer);
        this.socketManager.send({ type: 'offer', roomId: this.roomId, targetUserId: peerId, payload: offer });
      } catch (e) {
        console.error('[WebRTC] Offer creation failed:', e);
      }
    }

    return peer;
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const peer = await this.createPeer(peerId, false);
    if (peer) {
      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        this.socketManager.send({
          type: 'answer',
          roomId: this.roomId,
          targetUserId: peerId,
          payload: answer
        });
      } catch (e) {
        console.error('[WebRTC] handleOffer error:', e);
      }
    }
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error('[WebRTC] handleAnswer error:', e);
      }
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer && peer.connection.remoteDescription) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] ICE candidate error (non-fatal):', e);
      }
    }
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      try { peer.connection.close(); } catch (e) {}
      this.peers.delete(peerId);
      this.analysers.delete(peerId);
      this.speakingState.delete(peerId);
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
    return true; // If no video track, report as off
  }

  get muted(): boolean { return this.isMuted; }
  get videoOff(): boolean { return this.isVideoOff; }

  async switchCamera(facingMode: 'user' | 'environment'): Promise<MediaStream | null> {
    if (!this.localStream) return null;

    try {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const audioTrack = this.localStream.getAudioTracks()[0];

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track on all peer connections
      this.peers.forEach(peer => {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack).catch(e => console.warn('[WebRTC] replaceTrack:', e));
        }
      });

      if (videoTrack) videoTrack.stop();

      const tracks: MediaStreamTrack[] = [newVideoTrack];
      if (audioTrack) tracks.push(audioTrack);

      this.localStream = new MediaStream(tracks);
      return this.localStream;
    } catch (e) {
      console.error('[WebRTC] Switch camera error:', e);
      return null;
    }
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false // Most browsers don't support audio in getDisplayMedia
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video track on all peers
      this.peers.forEach(peer => {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack).catch(e => console.warn('[WebRTC] screen replaceTrack:', e));
        }
      });

      return screenStream;
    } catch (e) {
      console.error('[WebRTC] Screen share error:', e);
      return null;
    }
  }

  cleanup(): void {
    this.analysisRunning = false;
    this.analysers.clear();
    this.speakingState.clear();
    this.peers.forEach(peer => {
      try { peer.connection.close(); } catch (e) {}
    });
    this.peers.clear();
    this.localStream = null;
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
  }
}