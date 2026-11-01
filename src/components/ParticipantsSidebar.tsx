"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Search,
  Hand,
  MoreVertical,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface ParticipantItem {
  id: number | string;
  userId?: string | null;
  displayName: string;
  role: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isHandRaised?: boolean;
  isScreenSharing?: boolean;
}

interface ParticipantsSidebarProps {
  participants: ParticipantItem[];
  currentUserId?: string;
  isHost?: boolean;
  onMuteParticipant?: (participantId: number) => void;
  onToggleVideo?: (participantId: number) => void;
  onAssignCoHost?: (participantId: number) => void;
  onRemoveParticipant?: (participantId: number) => void;
  onMuteAll?: () => void;
  onLowerAllHands?: () => void;
  onInvite?: () => void;
  onClose: () => void;
  className?: string;
}

export function ParticipantsSidebar({
  participants,
  currentUserId,
  isHost = false,
  onMuteParticipant,
  onToggleVideo,
  onAssignCoHost,
  onRemoveParticipant,
  onMuteAll,
  onLowerAllHands,
  onInvite,
  onClose,
  className,
}: ParticipantsSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = participants.filter((p) =>
    p.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const handsRaisedCount = participants.filter((p) => p.isHandRaised).length;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gray-900 border-l border-white/10 text-white select-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Participants ({participants.length})
        </h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="pl-9 bg-white/5 border-white/10 text-xs h-9 text-white placeholder:text-gray-500 rounded-lg"
          />
        </div>
      </div>

      {/* Hand Raise Notice Banner (if any) */}
      {isHost && handsRaisedCount > 0 && (
        <div className="px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between text-xs text-yellow-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Hand className="w-3.5 h-3.5 fill-current" />
            {handsRaisedCount} hand{handsRaisedCount > 1 ? 's' : ''} raised
          </span>
          {onLowerAllHands && (
            <button
              type="button"
              onClick={onLowerAllHands}
              className="text-xs text-yellow-400 underline hover:text-yellow-200"
            >
              Lower All
            </button>
          )}
        </div>
      )}

      {/* Participants List */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-1.5">
          {filtered.map((participant) => {
            const isMe = participant.userId === currentUserId;
            const pid = typeof participant.id === 'number' ? participant.id : parseInt(participant.id);

            return (
              <div
                key={participant.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {participant.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Name & Role */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate flex items-center gap-1">
                    {participant.displayName}
                    {isMe && <span className="text-gray-400 font-normal">(Me)</span>}
                  </p>
                  <p className="text-[10px] text-gray-400 capitalize">
                    {participant.role === 'host'
                      ? 'Host'
                      : participant.role === 'co_host'
                      ? 'Co-host'
                      : 'Participant'}
                  </p>
                </div>

                {/* Status Icons */}
                <div className="flex items-center gap-2 shrink-0">
                  {participant.isHandRaised && (
                    <span className="text-yellow-400 text-sm animate-pulse" title="Hand raised">
                      ✋
                    </span>
                  )}

                  {!participant.isAudioMuted ? (
                    <Mic className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-red-500" />
                  )}

                  {!participant.isVideoOff ? (
                    <Video className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-red-500" />
                  )}

                  {/* Context menu for Host actions */}
                  {isHost && !isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-900 border-white/10 text-white text-xs">
                        {onMuteParticipant && (
                          <DropdownMenuItem onClick={() => onMuteParticipant(pid)} className="hover:bg-white/10 cursor-pointer">
                            {participant.isAudioMuted ? 'Ask to Unmute' : 'Mute'}
                          </DropdownMenuItem>
                        )}
                        {onToggleVideo && (
                          <DropdownMenuItem onClick={() => onToggleVideo(pid)} className="hover:bg-white/10 cursor-pointer">
                            {participant.isVideoOff ? 'Ask to Start Video' : 'Stop Video'}
                          </DropdownMenuItem>
                        )}
                        {onAssignCoHost && participant.role !== 'co_host' && (
                          <DropdownMenuItem onClick={() => onAssignCoHost(pid)} className="hover:bg-white/10 cursor-pointer">
                            Make Co-Host
                          </DropdownMenuItem>
                        )}
                        {onRemoveParticipant && (
                          <DropdownMenuItem
                            onClick={() => onRemoveParticipant(pid)}
                            className="text-red-400 hover:bg-red-500/20 cursor-pointer"
                          >
                            Remove
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer Controls: Invite, Mute All */}
      <div className="p-3 border-t border-white/10 bg-gray-950/60 flex items-center justify-between gap-2">
        {onInvite && (
          <Button
            onClick={onInvite}
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8 border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-400" />
            Invite
          </Button>
        )}

        {isHost && onMuteAll && (
          <Button
            onClick={onMuteAll}
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8 border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 gap-1.5"
          >
            <MicOff className="w-3.5 h-3.5 text-red-400" />
            Mute All
          </Button>
        )}
      </div>
    </div>
  );
}
