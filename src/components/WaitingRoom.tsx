"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitingParticipant {
  id: number;
  displayName: string;
  joinedAt: string;
}

interface WaitingRoomProps {
  participants: WaitingParticipant[];
  onAdmit: (participantId: number) => void;
  onReject: (participantId: number) => void;
  onAdmitAll: () => void;
  className?: string;
}

export function WaitingRoom({
  participants,
  onAdmit,
  onReject,
  onAdmitAll,
  className,
}: WaitingRoomProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <Card className={cn("p-4 bg-yellow-500/10 border-yellow-500/20", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Waiting Room ({participants.length})
        </h3>
        {participants.length > 1 && (
          <Button
            onClick={onAdmitAll}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            Admit All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5"
          >
            <div>
              <p className="text-sm font-medium text-white">
                {participant.displayName}
              </p>
              <p className="text-xs text-gray-400">
                Waiting since {new Date(participant.joinedAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => onAdmit(participant.id)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 gap-1"
              >
                <Check className="w-4 h-4" />
                Admit
              </Button>
              <Button
                onClick={() => onReject(participant.id)}
                size="sm"
                variant="outline"
                className="gap-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}