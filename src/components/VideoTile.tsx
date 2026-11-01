"use client";

import { useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Pin, PinOff, Hand, MoreVertical, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  isHandRaised?: boolean;
  isPinned?: boolean;
  isScreenSharing?: boolean;
  role?: string;
  className?: string;
  onPin?: () => void;
  onMute?: () => void;
  onToggleVideo?: () => void;
  onRename?: () => void;
  onRemove?: () => void;
  isHost?: boolean;
}

export function VideoTile({
  stream,
  name,
  isLocal = false,
  audioEnabled = true,
  videoEnabled = true,
  isSpeaking = false,
  audioLevel = 0,
  isHandRaised = false,
  isPinned = false,
  isScreenSharing = false,
  role,
  className,
  onPin,
  onMute,
  onToggleVideo,
  onRename,
  onRemove,
  isHost = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const attachStream = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      if (element && stream) {
        element.srcObject = stream;
      }
    },
    [stream]
  );

  return (
    <div
      className={cn(
        'group relative bg-gray-900 rounded-xl overflow-hidden aspect-video border transition-all duration-200 select-none shadow-md',
        isSpeaking
          ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-500/20'
          : 'border-white/10 hover:border-white/20',
        isPinned ? 'ring-2 ring-blue-500' : '',
        className
      )}
    >
      {/* Video element or Avatar fallback */}
      {videoEnabled && stream ? (
        <video
          ref={attachStream}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            'w-full h-full object-cover',
            isLocal && !isScreenSharing ? '-scale-x-100' : ''
          )}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950">
          <div
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl transition-transform duration-200',
              isSpeaking ? 'scale-110 ring-4 ring-emerald-500/40 bg-emerald-600' : 'bg-blue-600'
            )}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-gray-400 mt-2 font-medium">
            {videoEnabled ? 'Connecting video...' : 'Camera Off'}
          </span>
        </div>
      )}

      {/* Top right buttons (Pin, Screen Share indicator, Context Menu) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        {isScreenSharing && (
          <div className="px-2 py-0.5 rounded-md bg-blue-600/90 text-[10px] font-semibold text-white flex items-center gap-1 shadow">
            <Monitor className="w-3 h-3" />
            Screen
          </div>
        )}

        {isHandRaised && (
          <div className="px-2 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center gap-1 animate-bounce shadow-lg">
            <Hand className="w-3.5 h-3.5 fill-current" />
            Raised
          </div>
        )}

        {onPin && (
          <button
            type="button"
            onClick={onPin}
            title={isPinned ? 'Unpin' : 'Pin to main view'}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
              isPinned
                ? 'bg-blue-600 text-white'
                : 'bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white'
            )}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Dropdown for participant options */}
        {(isHost || onRename) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-white/10 text-white text-xs">
              {onPin && (
                <DropdownMenuItem onClick={onPin} className="hover:bg-white/10 cursor-pointer">
                  {isPinned ? 'Unpin' : 'Pin for me'}
                </DropdownMenuItem>
              )}
              {isHost && !isLocal && onMute && (
                <DropdownMenuItem onClick={onMute} className="hover:bg-white/10 cursor-pointer">
                  {audioEnabled ? 'Mute' : 'Ask to Unmute'}
                </DropdownMenuItem>
              )}
              {isHost && !isLocal && onToggleVideo && (
                <DropdownMenuItem onClick={onToggleVideo} className="hover:bg-white/10 cursor-pointer">
                  {videoEnabled ? 'Stop Video' : 'Ask to Start Video'}
                </DropdownMenuItem>
              )}
              {onRename && (
                <DropdownMenuItem onClick={onRename} className="hover:bg-white/10 cursor-pointer">
                  Rename
                </DropdownMenuItem>
              )}
              {isHost && !isLocal && onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-red-400 hover:bg-red-500/20 cursor-pointer">
                  Remove from meeting
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Speaking border pulse effect */}
      {isSpeaking && (
        <div className="absolute inset-0 pointer-events-none rounded-xl ring-2 ring-emerald-500 animate-pulse" />
      )}

      {/* Participant info bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="min-w-0 truncate text-white text-xs font-semibold drop-shadow-sm">
            {name} {isLocal && '(You)'}
          </span>
          {role && (role === 'host' || role === 'co_host') && (
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-600/80 text-[10px] font-bold text-white uppercase tracking-wider">
              {role === 'host' ? 'Host' : 'Co-host'}
            </span>
          )}
        </div>

        {/* Audio / Video indicator icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {audioEnabled ? (
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                isSpeaking ? 'bg-emerald-500 text-white' : 'bg-black/50 text-gray-300'
              )}
            >
              <Mic className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white shadow-sm">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          )}

          {!videoEnabled && (
            <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white shadow-sm">
              <VideoOff className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
