// WebRTC utility functions and configuration

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}

export const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export class PeerConnection {
  private pc: RTCPeerConnection;
  private peerId: string;

  constructor(peerId: string, config: RTCConfiguration = ICE_SERVERS) {
    this.peerId = peerId;
    this.pc = new RTCPeerConnection(config);
  }

  get connection() {
    return this.pc;
  }

  get id() {
    return this.peerId;
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    return this.pc.addTrack(track, stream);
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(description);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(candidate);
  }

  close() {
    this.pc.close();
  }

  onTrack(callback: (event: RTCTrackEvent) => void) {
    this.pc.ontrack = callback;
  }

  onIceCandidate(callback: (event: RTCPeerConnectionIceEvent) => void) {
    this.pc.onicecandidate = callback;
  }

  onConnectionStateChange(callback: (event: Event) => void) {
    this.pc.onconnectionstatechange = callback;
  }
}

export async function getUserMedia(
  constraints: MediaConstraints = DEFAULT_MEDIA_CONSTRAINTS
): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw error;
  }
}

export async function getDisplayMedia(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
      },
      audio: false,
    });
  } catch (error) {
    console.error('Error accessing display media:', error);
    throw error;
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}