// WebRTC utility functions, audio analysis, virtual backgrounds, and peer connection management

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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
      } as any,
      audio: true,
    });
  } catch (error) {
    console.error('Error accessing display media:', error);
    throw error;
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

// Audio level analyzer using Web Audio API
export class AudioMeter {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private running = false;
  private callback: ((level: number, isSpeaking: boolean) => void) | null = null;
  private rafId: number | null = null;

  constructor(stream: MediaStream, callback: (level: number, isSpeaking: boolean) => void) {
    this.callback = callback;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;

      this.source = this.audioCtx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.running = true;
      this.tick();
    } catch (e) {
      console.warn('AudioMeter initialization error:', e);
    }
  }

  private tick = () => {
    if (!this.running || !this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    const normalized = Math.min(100, Math.round((average / 128) * 100));
    const isSpeaking = normalized > 12;

    if (this.callback) {
      this.callback(normalized, isSpeaking);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  public stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {}
      this.source = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }
}

// Virtual Background processor
export class VirtualBackgroundProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private video: HTMLVideoElement;
  private sourceStream: MediaStream | null = null;
  private outputStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private mode: 'none' | 'blur' | 'office' | 'beach' | 'library' | 'living-room' = 'none';
  private bgImage: HTMLImageElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d');
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
  }

  public setMode(mode: 'none' | 'blur' | 'office' | 'beach' | 'library' | 'living-room', bgImageUrl?: string) {
    this.mode = mode;
    if (bgImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgImageUrl;
      img.onload = () => {
        this.bgImage = img;
      };
    } else {
      this.bgImage = null;
    }
  }

  public process(rawStream: MediaStream): MediaStream {
    this.sourceStream = rawStream;
    this.video.srcObject = rawStream;
    this.video.play().catch(() => {});

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const drawFrame = () => {
      if (!this.ctx || this.video.readyState < 2) {
        this.animationFrameId = requestAnimationFrame(drawFrame);
        return;
      }

      const w = this.canvas.width;
      const h = this.canvas.height;

      this.ctx.clearRect(0, 0, w, h);

      if (this.mode === 'none') {
        this.ctx.filter = 'none';
        this.ctx.drawImage(this.video, 0, 0, w, h);
      } else if (this.mode === 'blur') {
        // Simple fast background blur simulation with centered subject focus
        this.ctx.save();
        this.ctx.filter = 'blur(16px)';
        this.ctx.drawImage(this.video, 0, 0, w, h);
        this.ctx.restore();

        // Draw sharper foreground center ellipse
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.ellipse(w / 2, h / 2 + 30, w * 0.35, h * 0.45, 0, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.filter = 'none';
        this.ctx.drawImage(this.video, 0, 0, w, h);
        this.ctx.restore();
      } else {
        // Virtual backdrop
        if (this.bgImage && this.bgImage.complete) {
          this.ctx.drawImage(this.bgImage, 0, 0, w, h);
        } else {
          // Fallback stylish gradient background
          const grad = this.ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#1e1b4b');
          grad.addColorStop(1, '#0f172a');
          this.ctx.fillStyle = grad;
          this.ctx.fillRect(0, 0, w, h);
        }

        // Clip center presenter cutout
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.ellipse(w / 2, h / 2 + 40, w * 0.32, h * 0.42, 0, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.drawImage(this.video, 0, 0, w, h);
        this.ctx.restore();
      }

      this.animationFrameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const canvasStream = (this.canvas as any).captureStream ? (this.canvas as any).captureStream(30) : rawStream;
    const audioTrack = rawStream.getAudioTracks()[0];
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }
    this.outputStream = canvasStream;
    return canvasStream;
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.video.srcObject) {
      this.video.srcObject = null;
    }
  }
}
