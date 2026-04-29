/**
 * PrinceVChat - WebRTC Manager
 * Fixes: ICE candidate queuing, ontrack accumulation, no auto-remove on failure
 */

import { SocketManager } from './socket';

interface PeerData {
  peerId: string;
  connection: RTCPeerConnection;
  stream: MediaStream;
  pendingCandidates: RTCIceCandidateInit[]; // queued until remoteDesc is set
  hasRemoteDesc: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class WebRTCManager {
  private peers = new Map<string, PeerData>();
  private localStream: MediaStream | null = null;
  private socketManager: SocketManager;
  private roomId: string;
  private userId: string;
  private isMuted = false;
  private isVideoOff = true;
  private isPrivacyMode = false;

  private onPeerConnectedCb: ((peerId: string, stream: MediaStream) => void) | null = null;
  private onPeerDisconnectedCb: ((peerId: string) => void) | null = null;
  private onSpeakingCb: ((peerId: string, speaking: boolean) => void) | null = null;
  private onFileReceivedCb: ((peerId: string, file: Blob, fileName: string) => void) | null = null;

  private fileChannels = new Map<string, RTCDataChannel>();
  private fileBuffers: Map<string, { chunks: ArrayBuffer[], fileName: string, totalSize: number, receivedSize: number }> = new Map();

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
    if (stream) this.setupAudioAnalysis('local', stream);

    this.peers.forEach(peer => {
      if (!stream) return;
      const senders = peer.connection.getSenders();
      stream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(() => {});
        } else {
          try { peer.connection.addTrack(track, stream); } catch (e) {}
        }
      });
    });
  }

  setPrivacyMode(enabled: boolean): void {
    this.isPrivacyMode = enabled;
  }

  private getOrCreateAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.audioContext = new AC();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private setupAudioAnalysis(id: string, stream: MediaStream): void {
    if (this.analysers.has(id)) return;
    try {
      const ctx = this.getOrCreateAudioContext();
      if (!ctx) return;
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;
      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      this.analysers.set(id, { analyser, dataArray });
      if (this.analysers.size === 0) this.analysisRunning = false;
      if (!this.analysisRunning) {
        this.analysisRunning = true;
        this.startAnalysisLoop();
      }
    } catch (e) {
      console.warn('[WebRTC] Audio analysis error:', e);
    }
  }

  private startAnalysisLoop(): void {
    const loop = () => {
      if (!this.analysisRunning) return;
      this.analysers.forEach((data, id) => {
        data.analyser.getByteFrequencyData(data.dataArray);
        const avg = data.dataArray.reduce((a, b) => a + b, 0) / data.dataArray.length;
        const speaking = avg > 20;
        if (this.speakingState.get(id) !== speaking) {
          this.speakingState.set(id, speaking);
          const peerId = id === 'local' ? this.userId : id;
          this.onSpeakingCb?.(peerId, speaking);
        }
      });
      requestAnimationFrame(loop);
    };
    loop();
  }

  onPeerConnected(cb: (peerId: string, stream: MediaStream) => void): void { this.onPeerConnectedCb = cb; }
  onPeerDisconnected(cb: (peerId: string) => void): void { this.onPeerDisconnectedCb = cb; }
  onSpeaking(cb: (peerId: string, speaking: boolean) => void): void { this.onSpeakingCb = cb; }
  onFileReceived(cb: (peerId: string, file: Blob, fileName: string) => void): void { this.onFileReceivedCb = cb; }

  async createPeer(peerId: string, initiator: boolean): Promise<void> {
    if (this.peers.has(peerId)) return;

    console.log(`[WebRTC] Creating peer ${peerId}, initiator=${initiator}`);

    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: this.isPrivacyMode ? 'relay' : 'all',
    });
    // One shared MediaStream per peer — accumulate all incoming tracks here
    const remoteStream = new MediaStream();

    const peer: PeerData = {
      peerId,
      connection,
      stream: remoteStream,
      pendingCandidates: [],
      hasRemoteDesc: false,
    };

    if (initiator) {
      const channel = connection.createDataChannel('fileTransfer');
      this.setupFileChannel(peerId, channel);
    }

    connection.ondatachannel = (event) => {
      if (event.channel.label === 'fileTransfer') {
        this.setupFileChannel(peerId, event.channel);
      }
    };
    this.peers.set(peerId, peer);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try { connection.addTrack(track, this.localStream!); } catch (e) {}
      });
    }

    // === KEY FIX: accumulate tracks on one stream, fire callback once per kind ===
    connection.ontrack = (event) => {
      const track = event.track;
      console.log(`[WebRTC] ontrack: ${track.kind} from ${peerId}`);

      // Add to our shared remote stream if not already there
      if (!remoteStream.getTracks().find(t => t.id === track.id)) {
        remoteStream.addTrack(track);
      }

      // Setup audio analysis for speaking detection
      if (track.kind === 'audio') {
        this.setupAudioAnalysis(peerId, remoteStream);
      }

      // Notify UI every time so it can attach the stream (handles audio-only first, then video)
      this.onPeerConnectedCb?.(peerId, remoteStream);
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
      const state = connection.connectionState;
      console.log(`[WebRTC] Peer ${peerId} state: ${state}`);
      if (state === 'failed') {
        // Try ICE restart before giving up
        console.log(`[WebRTC] Attempting ICE restart for ${peerId}`);
        if (initiator) {
          connection.restartIce();
          this.sendOffer(peerId, connection, true);
        }
      } else if (state === 'closed') {
        this.onPeerDisconnectedCb?.(peerId);
      }
      // Do NOT remove peer on 'disconnected' — can recover
    };

    connection.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state ${peerId}: ${connection.iceConnectionState}`);
    };

    if (initiator) {
      await this.sendOffer(peerId, connection, false);
    }

    return peer;
  }

  private async sendOffer(peerId: string, connection: RTCPeerConnection, isRestart: boolean): Promise<void> {
    try {
      const offer = await connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: isRestart,
      });
      await connection.setLocalDescription(offer);
      this.socketManager.send({
        type: 'offer',
        roomId: this.roomId,
        targetUserId: peerId,
        payload: { type: offer.type, sdp: offer.sdp },
      });
    } catch (e) {
      console.error('[WebRTC] sendOffer error:', e);
    }
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    let peer = this.peers.get(peerId);
    if (!peer) {
      peer = (await this.createPeer(peerId, false))!;
    }
    if (!peer) return;

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
      peer.hasRemoteDesc = true;
      // Flush queued candidates
      await this.flushCandidates(peer);

      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      this.socketManager.send({
        type: 'answer',
        roomId: this.roomId,
        targetUserId: peerId,
        payload: { type: answer.type, sdp: answer.sdp },
      });
    } catch (e) {
      console.error('[WebRTC] handleOffer error:', e);
    }
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      peer.hasRemoteDesc = true;
      // Flush queued candidates
      await this.flushCandidates(peer);
    } catch (e) {
      console.error('[WebRTC] handleAnswer error:', e);
    }
  }

  // === KEY FIX: Queue candidates until remoteDescription is set ===
  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    if (!peer.hasRemoteDesc) {
      // Queue for later
      peer.pendingCandidates.push(candidate);
      return;
    }

    await this.addCandidate(peer.connection, candidate);
  }

  private async flushCandidates(peer: PeerData): Promise<void> {
    const queued = [...peer.pendingCandidates];
    peer.pendingCandidates = [];
    for (const candidate of queued) {
      await this.addCandidate(peer.connection, candidate);
    }
  }

  private async addCandidate(connection: RTCPeerConnection, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      // Non-fatal — can happen with end-of-candidates signal
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
      const t = this.localStream.getAudioTracks()[0];
      if (t) { t.enabled = !t.enabled; this.isMuted = !t.enabled; return this.isMuted; }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const t = this.localStream.getVideoTracks()[0];
      if (t) { t.enabled = !t.enabled; this.isVideoOff = !t.enabled; return this.isVideoOff; }
    }
    return true;
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
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      this.peers.forEach(peer => {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack).catch(() => {});
      });
      if (videoTrack) videoTrack.stop();
      const tracks: MediaStreamTrack[] = [newVideoTrack];
      if (audioTrack) tracks.push(audioTrack);
      this.localStream = new MediaStream(tracks);
      return this.localStream;
    } catch (e) {
      console.error('[WebRTC] switchCamera error:', e);
      return null;
    }
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported');
      }
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];
      this.peers.forEach(peer => {
        const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack).catch(() => {});
      });
      return screenStream;
    } catch (e) {
      console.error('[WebRTC] startScreenShare error:', e);
      throw e; // Rethrow to let App handle the message
    }
  }

  async switchDevice(kind: 'audio' | 'video', deviceId: string): Promise<void> {
    if (!this.localStream) return;

    const constraints = {
      [kind]: { deviceId: { exact: deviceId } }
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = newStream.getTracks()[0];
      const oldTrack = this.localStream.getTracks().find(t => t.kind === kind);

      if (oldTrack) {
        oldTrack.stop();
        this.localStream.removeTrack(oldTrack);
        this.localStream.addTrack(newTrack);

        // Replace track in all peer connections
        this.peers.forEach(peer => {
          const sender = peer.connection.getSenders().find(s => s.track?.kind === kind);
          if (sender) {
            sender.replaceTrack(newTrack);
          }
        });
      }
    } catch (err) {
      console.error('[WebRTC] switchDevice error:', err);
      throw err;
    }
  }

  private setupFileChannel(peerId: string, channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';
    channel.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        const [fileName, sizeStr] = data.split(':');
        this.fileBuffers.set(peerId, { chunks: [], fileName, totalSize: parseInt(sizeStr), receivedSize: 0 });
      } else {
        const buffer = this.fileBuffers.get(peerId);
        if (buffer) {
          buffer.chunks.push(data);
          buffer.receivedSize += data.byteLength;
          if (buffer.receivedSize >= buffer.totalSize) {
            const blob = new Blob(buffer.chunks);
            this.onFileReceivedCb?.(peerId, blob, buffer.fileName);
            this.fileBuffers.delete(peerId);
          }
        }
      }
    };
    this.fileChannels.set(peerId, channel);
  }

  async sendFile(file: File): Promise<void> {
    const CHUNK_SIZE = 16384;
    const arrayBuffer = await file.arrayBuffer();
    this.fileChannels.forEach(channel => {
      if (channel.readyState === 'open') {
        channel.send(`${file.name}:${file.size}`);
        for (let i = 0; i < arrayBuffer.byteLength; i += CHUNK_SIZE) {
          channel.send(arrayBuffer.slice(i, i + CHUNK_SIZE));
        }
      }
    });
  }

  cleanup(): void {
    this.analysisRunning = false;
    this.analysers.clear();
    this.speakingState.clear();
    this.peers.forEach(peer => { try { peer.connection.close(); } catch (e) {} });
    this.peers.clear();
    this.localStream = null;
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
  }
}