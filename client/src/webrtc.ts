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
  
  private audioContext: AudioContext | null = null;
  private analysers: Map<string, { analyser: AnalyserNode, dataArray: Uint8Array }> = new Map();
  private speakingState: Map<string, boolean> = new Map();

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
      const senders = peer.connection.getSenders();
      stream?.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          peer.connection.addTrack(track, stream!);
        }
      });
    });
  }

  private setupAudioAnalysis(id: string, stream: MediaStream): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      this.analysers.set(id, { analyser, dataArray });

      if (this.analysers.size === 1) {
        this.startAnalysisLoop();
      }
    } catch (e) {
      console.error('[WebRTC] Audio analysis error:', e);
    }
  }

  private startAnalysisLoop(): void {
    const loop = () => {
      this.analysers.forEach((data, id) => {
        data.analyser.getByteFrequencyData(data.dataArray);
        const average = data.dataArray.reduce((a, b) => a + b) / data.dataArray.length;
        const isSpeaking = average > 30; // Threshold

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
        this.setupAudioAnalysis(peerId, stream);
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
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    const audioTrack = this.localStream.getAudioTracks()[0];
    
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false // Keep existing audio
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    
    this.peers.forEach(peer => {
      const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newVideoTrack);
    });

    if (videoTrack) videoTrack.stop();
    
    const tracks = [newVideoTrack];
    if (audioTrack) tracks.push(audioTrack);
    
    this.localStream = new MediaStream(tracks);
    return this.localStream;
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      const screenTrack = screenStream.getVideoTracks()[0];
      
      this.peers.forEach(peer => {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => this.stopScreenShare();
      
      return screenStream;
    } catch (e) {
      console.error('[WebRTC] Screen share error:', e);
      return null;
    }
  }

  async stopScreenShare(): Promise<void> {
    // Logic to revert to camera... usually handled by App class re-requesting getUserMedia
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