"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Users,
  Hand,
  Circle,
  FileText,
  PenTool,
  BarChart3,
  Smile,
  Shield,
  Grid,
  Subtitles,
  Settings,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  recordingAvailable?: boolean;
  isCaptionsEnabled?: boolean;
  isHost?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleHandRaise: () => void;
  onToggleRecording: () => void;
  onToggleCaptions?: () => void;
  onToggleSecurity?: () => void;
  onToggleBreakoutRooms?: () => void;
  onOpenSettings?: () => void;
  onToggleFiles: () => void;
  onToggleWhiteboard: () => void;
  onTogglePolls: () => void;
  onToggleReactions: () => void;
  onReactionSelect?: (emoji: string) => void;
  onLeave: () => void;
  participantCount: number;
  unreadMessages: number;
}

export function MeetingControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isHandRaised,
  isRecording,
  recordingAvailable = false,
  isCaptionsEnabled = false,
  isHost = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleHandRaise,
  onToggleRecording,
  onToggleCaptions,
  onToggleSecurity,
  onToggleBreakoutRooms,
  onOpenSettings,
  onToggleFiles,
  onToggleWhiteboard,
  onTogglePolls,
  onToggleReactions,
  onReactionSelect,
  onLeave,
  participantCount,
  unreadMessages,
}: MeetingControlsProps) {
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  const emojiList = ['👏', '👍', '❤️', '😂', '😮', '🎉'];

  return (
    <div className="bg-gray-950/95 border-t border-white/10 px-4 py-2 select-none backdrop-blur-xl relative z-40">
      <div className="container mx-auto flex items-center justify-between gap-2">
        {/* Left: Audio & Video Group with quick settings dropdown */}
        <div className="flex items-center gap-1">
          {/* Audio Button */}
          <div className="flex items-center rounded-lg hover:bg-white/5 transition-colors">
            <button
              type="button"
              onClick={onToggleAudio}
              className={cn(
                'flex flex-col items-center justify-center px-2.5 py-1.5 rounded-l-lg transition-colors min-w-[54px]',
                !isAudioEnabled ? 'text-red-400' : 'text-gray-200 hover:text-white'
              )}
            >
              {isAudioEnabled ? (
                <Mic className="w-5 h-5 mb-0.5" />
              ) : (
                <MicOff className="w-5 h-5 mb-0.5 text-red-500" />
              )}
              <span className="text-[10px] font-medium tracking-tight">
                {isAudioEnabled ? 'Mute' : 'Unmute'}
              </span>
            </button>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Audio Settings"
                className="px-1 py-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-r-lg"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Video Button */}
          <div className="flex items-center rounded-lg hover:bg-white/5 transition-colors">
            <button
              type="button"
              onClick={onToggleVideo}
              className={cn(
                'flex flex-col items-center justify-center px-2.5 py-1.5 rounded-l-lg transition-colors min-w-[54px]',
                !isVideoEnabled ? 'text-red-400' : 'text-gray-200 hover:text-white'
              )}
            >
              {isVideoEnabled ? (
                <Video className="w-5 h-5 mb-0.5" />
              ) : (
                <VideoOff className="w-5 h-5 mb-0.5 text-red-500" />
              )}
              <span className="text-[10px] font-medium tracking-tight">
                {isVideoEnabled ? 'Stop Video' : 'Start Video'}
              </span>
            </button>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Video Settings"
                className="px-1 py-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-r-lg"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Center: In-Meeting Feature Deck */}
        <div className="flex items-center gap-0.5 md:gap-1 overflow-x-auto py-1">
          {/* Security (Host) */}
          {isHost && onToggleSecurity && (
            <button
              type="button"
              onClick={onToggleSecurity}
              className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors min-w-[50px]"
            >
              <Shield className="w-5 h-5 mb-0.5 text-blue-400" />
              <span className="text-[10px] font-medium">Security</span>
            </button>
          )}

          {/* Participants */}
          <button
            type="button"
            onClick={onToggleParticipants}
            className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors relative min-w-[54px]"
          >
            <div className="relative">
              <Users className="w-5 h-5 mb-0.5" />
              <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] font-bold rounded-full px-1 min-w-[14px] text-center">
                {participantCount}
              </span>
            </div>
            <span className="text-[10px] font-medium">Participants</span>
          </button>

          {/* Chat */}
          <button
            type="button"
            onClick={onToggleChat}
            className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors relative min-w-[50px]"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 mb-0.5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full px-1 min-w-[14px] text-center">
                  {unreadMessages}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Chat</span>
          </button>

          {/* Share Screen (Zoom signature green icon) */}
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={cn(
              'flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg transition-colors min-w-[54px]',
              isScreenSharing
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            )}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5 mb-0.5" />
            ) : (
              <Monitor className="w-5 h-5 mb-0.5" />
            )}
            <span className="text-[10px] font-medium">
              {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </span>
          </button>

          {/* Record */}
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={!recordingAvailable}
            title={recordingAvailable ? 'Start or stop recording' : 'Recording is unavailable until server recording is configured'}
            className={cn(
              'flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg transition-colors min-w-[50px]',
              isRecording
                ? 'text-red-400 bg-red-600/10'
                : recordingAvailable
                  ? 'text-gray-300 hover:text-white hover:bg-white/5'
                  : 'text-gray-600 cursor-not-allowed opacity-60'
            )}
          >
            <Circle className={cn('w-5 h-5 mb-0.5', isRecording && 'fill-red-500 text-red-500 animate-pulse')} />
            <span className="text-[10px] font-medium">
              {isRecording ? 'Recording' : 'Record'}
            </span>
          </button>

          {/* Captions (CC) */}
          {onToggleCaptions && (
            <button
              type="button"
              onClick={onToggleCaptions}
              className={cn(
                'flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg transition-colors min-w-[50px]',
                isCaptionsEnabled
                  ? 'text-blue-400 bg-blue-600/10'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              )}
            >
              <Subtitles className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Captions</span>
            </button>
          )}

          {/* Breakout Rooms */}
          {onToggleBreakoutRooms && (
            <button
              type="button"
              onClick={onToggleBreakoutRooms}
              className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors min-w-[54px]"
            >
              <Grid className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Breakout</span>
            </button>
          )}

          {/* Whiteboard */}
          <button
            type="button"
            onClick={onToggleWhiteboard}
            className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors min-w-[54px]"
          >
            <PenTool className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Whiteboard</span>
          </button>

          {/* Reactions Dropdown / Popup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionsMenu((prev) => !prev)}
              className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors min-w-[50px]"
            >
              <Smile className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Reactions</span>
            </button>

            {/* Floating Reactions Bar */}
            {showReactionsMenu && (
              <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-white/10 rounded-full px-3 py-2 shadow-2xl flex items-center gap-2 z-50 backdrop-blur-md">
                {emojiList.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReactionSelect?.(emoji);
                      setShowReactionsMenu(false);
                    }}
                    className="text-2xl hover:scale-130 transition-transform p-1 select-none"
                  >
                    {emoji}
                  </button>
                ))}
                <div className="h-5 w-px bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => {
                    onToggleHandRaise();
                    setShowReactionsMenu(false);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors',
                    isHandRaised
                      ? 'bg-yellow-500 text-black font-bold'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  )}
                >
                  <Hand className="w-3.5 h-3.5" />
                  {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                </button>
              </div>
            )}
          </div>

          {/* Polls */}
          <button
            type="button"
            onClick={onTogglePolls}
            className="hidden sm:flex flex-col items-center justify-center px-2 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors min-w-[46px]"
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Polls</span>
          </button>

          {/* Files */}
          <button
            type="button"
            onClick={onToggleFiles}
            className="hidden sm:flex flex-col items-center justify-center px-2 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors min-w-[46px]"
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Files</span>
          </button>

          {/* Settings gear */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors min-w-[46px]"
            >
              <Settings className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          )}
        </div>

        {/* Right: End / Leave Button */}
        <div>
          <Button
            onClick={onLeave}
            variant="destructive"
            className="font-bold text-xs px-5 h-9 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md"
          >
            {isHost ? 'End' : 'Leave'}
          </Button>
        </div>
      </div>
    </div>
  );
}
