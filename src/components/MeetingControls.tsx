"use client";

import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, MessageSquare, Users, PhoneOff, Hand, Circle, FileText, PenTool, BarChart3, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleHandRaise: () => void;
  onToggleRecording: () => void;
  onToggleFiles: () => void;
  onToggleWhiteboard: () => void;
  onTogglePolls: () => void;
  onToggleReactions: () => void;
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
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleHandRaise,
  onToggleRecording,
  onToggleFiles,
  onToggleWhiteboard,
  onTogglePolls,
  onToggleReactions,
  onLeave,
  participantCount,
  unreadMessages,
}: MeetingControlsProps) {
  return (
    <div className="bg-gray-900 border-t border-white/10 p-4">
      <div className="container mx-auto flex items-center justify-between gap-4">
        {/* Left: Audio/Video Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onToggleAudio}
            size="lg"
            variant={isAudioEnabled ? "default" : "destructive"}
            className={cn(
              "rounded-full w-12 h-12 p-0",
              isAudioEnabled ? "bg-gray-700 hover:bg-gray-600" : ""
            )}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>

          <Button
            onClick={onToggleVideo}
            size="lg"
            variant={isVideoEnabled ? "default" : "destructive"}
            className={cn(
              "rounded-full w-12 h-12 p-0",
              isVideoEnabled ? "bg-gray-700 hover:bg-gray-600" : ""
            )}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </Button>

          <Button
            onClick={onToggleScreenShare}
            size="lg"
            variant={isScreenSharing ? "default" : "outline"}
            className={cn(
              "rounded-full w-12 h-12 p-0",
              isScreenSharing ? "bg-primary" : "bg-gray-700 hover:bg-gray-600 border-gray-600"
            )}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Center: Additional Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onToggleHandRaise}
            size="lg"
            variant="outline"
            className={cn(
              "rounded-full w-12 h-12 p-0 border-gray-600",
              isHandRaised ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500" : "bg-gray-700 hover:bg-gray-600"
            )}
            title="Raise hand"
          >
            <Hand className="w-5 h-5" />
          </Button>

          <Button
            onClick={onToggleReactions}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0 bg-gray-700 hover:bg-gray-600 border-gray-600"
            title="Reactions"
          >
            <Smile className="w-5 h-5" />
          </Button>

          <Button
            onClick={onTogglePolls}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0 bg-gray-700 hover:bg-gray-600 border-gray-600"
            title="Polls"
          >
            <BarChart3 className="w-5 h-5" />
          </Button>

          <Button
            onClick={onToggleFiles}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0 bg-gray-700 hover:bg-gray-600 border-gray-600"
            title="Files"
          >
            <FileText className="w-5 h-5" />
          </Button>

          <Button
            onClick={onToggleWhiteboard}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0 bg-gray-700 hover:bg-gray-600 border-gray-600"
            title="Whiteboard"
          >
            <PenTool className="w-5 h-5" />
          </Button>

          <Button
            onClick={onToggleRecording}
            size="lg"
            variant="outline"
            className={cn(
              "rounded-full w-12 h-12 p-0 border-gray-600",
              isRecording ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "bg-gray-700 hover:bg-gray-600"
            )}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            <Circle className={cn("w-5 h-5", isRecording && "fill-current")} />
          </Button>

          <Button
            onClick={onToggleChat}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0 bg-gray-700 hover:bg-gray-600 border-gray-600 relative"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </Button>

          <Button
            onClick={onToggleParticipants}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0 bg-gray-700 hover:bg-gray-600 border-gray-600 relative"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-xs flex items-center justify-center">
              {participantCount}
            </span>
          </Button>
        </div>

        {/* Right: Leave Button */}
        <div>
          <Button
            onClick={onLeave}
            size="lg"
            variant="destructive"
            className="rounded-full px-6 h-12"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
}