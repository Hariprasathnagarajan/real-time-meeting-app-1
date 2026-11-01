"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Mic,
  Video,
  Volume2,
  Keyboard,
  X,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import type { VirtualBackgroundMode } from '@/hooks/useWebRTC';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  selectedAudioInput?: string;
  selectedVideoInput?: string;
  selectedAudioOutput?: string;
  onSelectDevice: (kind: 'audioInput' | 'videoInput' | 'audioOutput', deviceId: string) => void;
  virtualBgMode: VirtualBackgroundMode;
  onSelectVirtualBg: (mode: VirtualBackgroundMode) => void;
  audioLevel: number;
}

export function SettingsModal({
  isOpen,
  onClose,
  audioInputs,
  videoInputs,
  audioOutputs,
  selectedAudioInput,
  selectedVideoInput,
  selectedAudioOutput,
  onSelectDevice,
  virtualBgMode,
  onSelectVirtualBg,
  audioLevel,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'shortcuts'>('audio');
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);

  if (!isOpen) return null;

  const testSpeaker = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

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

  const bgOptions: { id: VirtualBackgroundMode; label: string; previewColor: string }[] = [
    { id: 'none', label: 'None', previewColor: 'bg-gray-800' },
    { id: 'blur', label: 'Blur', previewColor: 'bg-gradient-to-br from-blue-900 to-indigo-950 blur-sm' },
    { id: 'office', label: 'Office', previewColor: 'bg-gradient-to-tr from-slate-800 via-gray-700 to-zinc-900' },
    { id: 'living-room', label: 'Living Room', previewColor: 'bg-gradient-to-r from-amber-950 via-stone-800 to-yellow-950' },
    { id: 'library', label: 'Library', previewColor: 'bg-gradient-to-bl from-amber-900 via-yellow-950 to-stone-900' },
    { id: 'beach', label: 'Beach', previewColor: 'bg-gradient-to-tr from-sky-900 via-teal-800 to-cyan-900' },
  ];

  const shortcuts = [
    { key: 'Space (Hold)', desc: 'Push-to-Talk (temporarily unmute)' },
    { key: 'Alt + A', desc: 'Mute / Unmute microphone' },
    { key: 'Alt + V', desc: 'Start / Stop camera' },
    { key: 'Alt + S', desc: 'Start / Stop screen sharing' },
    { key: 'Alt + C', desc: 'Open / Close meeting chat' },
    { key: 'Alt + P', desc: 'Open / Close participant panel' },
    { key: 'Alt + H', desc: 'Raise / Lower hand' },
    { key: 'Alt + R', desc: 'Start / Stop local recording' },
    { key: 'F', desc: 'Toggle fullscreen mode' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-gray-900 border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row text-white h-[520px]">
        {/* Left Tabs Bar */}
        <div className="w-full md:w-48 bg-gray-950 p-4 border-b md:border-b-0 md:border-r border-white/10 flex md:flex-col gap-1.5 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 mb-3 text-white font-bold text-sm">
            <Settings className="w-4 h-4 text-blue-400" />
            Settings
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold w-full transition-colors ${
              activeTab === 'audio'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mic className="w-4 h-4" />
            Audio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold w-full transition-colors ${
              activeTab === 'video'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video className="w-4 h-4" />
            Video
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold w-full transition-colors ${
              activeTab === 'shortcuts'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Shortcuts
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-semibold text-sm capitalize text-white">
              {activeTab} Settings
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Audio Tab */}
            {activeTab === 'audio' && (
              <div className="space-y-6">
                {/* Microphone */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-gray-300">Microphone</Label>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => onSelectDevice('audioInput', e.target.value)}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500"
                  >
                    {audioInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                    {audioInputs.length === 0 && <option value="">Default System Microphone</option>}
                  </select>

                  {/* Level meter */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-gray-400">Input Level:</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-75"
                        style={{ width: `${Math.min(100, audioLevel * 1.5)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Speaker */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-xs font-semibold text-gray-300">Speaker</Label>
                  <div className="flex gap-2">
                    <select
                      value={selectedAudioOutput}
                      onChange={(e) => onSelectDevice('audioOutput', e.target.value)}
                      className="flex-1 bg-gray-800 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500"
                    >
                      {audioOutputs.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Speaker ${i + 1}`}
                        </option>
                      ))}
                      {audioOutputs.length === 0 && <option value="">Default System Speaker</option>}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={testSpeaker}
                      className="text-xs border-white/10 text-gray-200 hover:text-white hover:bg-white/10 gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Test
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Video Tab */}
            {activeTab === 'video' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-gray-300">Camera</Label>
                  <select
                    value={selectedVideoInput}
                    onChange={(e) => onSelectDevice('videoInput', e.target.value)}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500"
                  >
                    {videoInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                    {videoInputs.length === 0 && <option value="">Default System Camera</option>}
                  </select>
                </div>

                {/* Video Options */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mirror-video" className="text-xs text-gray-300 cursor-pointer">
                      Mirror My Video
                    </Label>
                    <Switch
                      id="mirror-video"
                      checked={mirrorVideo}
                      onCheckedChange={setMirrorVideo}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hd-video" className="text-xs text-gray-300 cursor-pointer">
                      Enable HD Video
                    </Label>
                    <Switch
                      id="hd-video"
                      checked={hdVideo}
                      onCheckedChange={setHdVideo}
                    />
                  </div>
                </div>

                {/* Virtual Background */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    Virtual Background
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {bgOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSelectVirtualBg(opt.id);
                          toast.success(`Virtual background set to ${opt.label}`);
                        }}
                        className={`relative h-16 rounded-xl border flex items-center justify-center text-xs font-semibold overflow-hidden transition-all ${
                          opt.previewColor
                        } ${
                          virtualBgMode === opt.id
                            ? 'border-blue-500 ring-2 ring-blue-500/50'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <span className="relative z-10 text-white font-medium drop-shadow-md">
                          {opt.label}
                        </span>
                        {virtualBgMode === opt.id && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Shortcuts Tab */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-3">
                  Quick keyboard actions available inside any active meeting room:
                </p>
                <div className="divide-y divide-white/5">
                  {shortcuts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 text-xs">
                      <span className="text-gray-300">{s.desc}</span>
                      <kbd className="px-2 py-1 rounded bg-gray-800 text-gray-200 border border-white/10 font-mono text-[11px] shadow-sm">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
