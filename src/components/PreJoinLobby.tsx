"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AudioMeter, getUserMedia, stopMediaStream, DEFAULT_MEDIA_CONSTRAINTS } from '@/lib/webrtc';
import { toast } from 'sonner';

interface PreJoinLobbyProps {
  meetingTitle: string;
  meetingCode: string;
  isPasswordProtected: boolean;
  defaultName: string;
  onJoin: (options: {
    displayName: string;
    isAudioMuted: boolean;
    isVideoOff: boolean;
    passcode?: string;
  }) => void;
  onCancel: () => void;
}

export function PreJoinLobby({
  meetingTitle,
  meetingCode,
  isPasswordProtected,
  defaultName,
  onJoin,
  onCancel,
}: PreJoinLobbyProps) {
  const [displayName, setDisplayName] = useState(defaultName || '');
  const [passcode, setPasscode] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioMeterRef = useRef<AudioMeter | null>(null);

  // Initialize camera preview & devices
  useEffect(() => {
    let mounted = true;

    async function initPreview() {
      try {
        const stream = await getUserMedia(DEFAULT_MEDIA_CONSTRAINTS);
        if (!mounted) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio level meter for mic test
        audioMeterRef.current = new AudioMeter(stream, (level) => {
          if (mounted && !isAudioMuted) {
            setAudioLevel(level);
          }
        });

        // Enumerate devices
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (mounted) {
            setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
            setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
          }
        }
      } catch (err) {
        console.warn('Lobby camera preview error:', err);
      }
    }

    initPreview();

    return () => {
      mounted = false;
      audioMeterRef.current?.stop();
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
      }
    };
  }, []);

  // Update mute/video tracks in preview
  useEffect(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !isAudioMuted;
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !isVideoOff;
    }
    if (isAudioMuted) {
      setAudioLevel(0);
    }
  }, [isAudioMuted, isVideoOff]);

  const toggleMic = () => setIsAudioMuted((prev) => !prev);
  const toggleCam = () => setIsVideoOff((prev) => !prev);

  // Play Zoom-like audio test chime
  const testSpeaker = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      toast.success('Speaker test tone played!');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }
    if (isPasswordProtected && !passcode.trim()) {
      toast.error('This meeting requires a passcode');
      return;
    }

    // Stop lobby stream before entering actual meeting room
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }

    onJoin({
      displayName: displayName.trim(),
      isAudioMuted,
      isVideoOff,
      passcode: passcode.trim(),
    });
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full bg-gray-900/90 border border-white/10 shadow-2xl backdrop-blur-xl p-6 md:p-8 rounded-2xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Ready to Join
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {meetingTitle}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Meeting ID: <span className="font-mono text-gray-300 font-semibold">{meetingCode}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-gray-400 hover:text-white hover:bg-white/5 self-start md:self-auto"
          >
            Cancel
          </Button>
        </div>

        {/* Body Grid */}
        <div className="grid md:grid-cols-2 gap-8 mt-6">
          {/* Left: Video Preview & Fast Toggles */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-inner group">
              {!isVideoOff ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-500">
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-3xl font-bold mb-3 border border-blue-500/30">
                    {displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Camera is off</span>
                </div>
              )}

              {/* Floating Media Toggles on Preview */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isAudioMuted
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isVideoOff
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isVideoOff ? 'Start Video' : 'Stop Video'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Microphone Volume Meter */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
              <Mic className={`w-4 h-4 shrink-0 ${audioLevel > 10 ? 'text-green-400' : 'text-gray-400'}`} />
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, audioLevel * 1.5)}%` }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={testSpeaker}
                className="text-xs text-gray-300 hover:text-white h-7 gap-1 px-2 hover:bg-white/10"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Test Speaker
              </Button>
            </div>
          </div>

          {/* Right: Join Form & Preferences */}
          <form onSubmit={handleJoin} className="flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName" className="text-white text-sm font-semibold">
                  Your Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  required
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-11 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isPasswordProtected && (
                <div>
                  <Label htmlFor="passcode" className="text-white text-sm font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-yellow-400" />
                    Meeting Passcode
                  </Label>
                  <Input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter meeting passcode"
                    required
                    className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-11 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Hardware Selection (Optional dropdowns) */}
              <div className="space-y-3 pt-2">
                {videoDevices.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-400">Camera</Label>
                    <select
                      value={selectedVideoId}
                      onChange={(e) => setSelectedVideoId(e.target.value)}
                      className="w-full mt-1 bg-gray-800 text-white text-xs rounded-lg p-2.5 border border-white/10 outline-none focus:border-blue-500"
                    >
                      {videoDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {audioDevices.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-400">Microphone</Label>
                    <select
                      value={selectedAudioId}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                      className="w-full mt-1 bg-gray-800 text-white text-xs rounded-lg p-2.5 border border-white/10 outline-none focus:border-blue-500"
                    >
                      {audioDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Microphone ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center gap-3">
              <Button
                type="submit"
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12 shadow-lg shadow-blue-600/25 gap-2"
              >
                Join Meeting
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
