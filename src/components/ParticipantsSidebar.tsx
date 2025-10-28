"use client";

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, X, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ParticipantInfo {
  id: string;
  name: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost?: boolean;
}

interface ParticipantsSidebarProps {
  participants: ParticipantInfo[];
  onClose: () => void;
  className?: string;
}

export function ParticipantsSidebar({
  participants,
  onClose,
  className,
}: ParticipantsSidebarProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gray-900 border-l border-white/10',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Participants ({participants.length})
        </h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Participants List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                {participant.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {participant.name}
                </p>
                <p className="text-xs text-gray-400">
                  {participant.isHost ? 'Host' : 'Participant'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {participant.audioEnabled ? (
                  <Mic className="w-4 h-4 text-green-500" />
                ) : (
                  <MicOff className="w-4 h-4 text-red-500" />
                )}
                {participant.videoEnabled ? (
                  <Video className="w-4 h-4 text-green-500" />
                ) : (
                  <VideoOff className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}