"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, UserX, Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  displayName: string;
  role: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
}

interface AdminControlsProps {
  participants: Participant[];
  currentUserId: string;
  onMuteParticipant: (participantId: string) => void;
  onToggleVideo: (participantId: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  onAssignCoHost: (participantId: string) => void;
  className?: string;
}

export function AdminControls({
  participants,
  currentUserId,
  onMuteParticipant,
  onToggleVideo,
  onRemoveParticipant,
  onAssignCoHost,
  className,
}: AdminControlsProps) {
  return (
    <Card className={cn("p-4 bg-gray-900 border-white/10", className)}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Admin Controls
      </h3>
      
      <div className="space-y-3">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-white flex items-center gap-2">
                {participant.displayName}
                {participant.role === 'host' && (
                  <Crown className="w-4 h-4 text-yellow-400" />
                )}
                {participant.role === 'co_host' && (
                  <Shield className="w-4 h-4 text-blue-400" />
                )}
              </p>
              <p className="text-xs text-gray-400">{participant.role}</p>
            </div>

            {participant.id !== currentUserId && (
              <div className="flex gap-1">
                <Button
                  onClick={() => onMuteParticipant(participant.id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={participant.isAudioMuted ? "Unmute" : "Mute"}
                >
                  {participant.isAudioMuted ? (
                    <MicOff className="w-4 h-4 text-red-400" />
                  ) : (
                    <Mic className="w-4 h-4 text-green-400" />
                  )}
                </Button>

                <Button
                  onClick={() => onToggleVideo(participant.id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={participant.isVideoOff ? "Enable video" : "Disable video"}
                >
                  {participant.isVideoOff ? (
                    <VideoOff className="w-4 h-4 text-red-400" />
                  ) : (
                    <Video className="w-4 h-4 text-green-400" />
                  )}
                </Button>

                {participant.role !== 'host' && participant.role !== 'co_host' && (
                  <Button
                    onClick={() => onAssignCoHost(participant.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Assign as co-host"
                  >
                    <Shield className="w-4 h-4 text-blue-400" />
                  </Button>
                )}

                <Button
                  onClick={() => onRemoveParticipant(participant.id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Remove participant"
                >
                  <UserX className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}