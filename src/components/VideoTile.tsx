"use client";

import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  className?: string;
}

export function VideoTile({
  stream,
  name,
  isLocal = false,
  audioEnabled = true,
  videoEnabled = true,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        'relative bg-gray-900 rounded-lg overflow-hidden aspect-video',
        className
      )}
    >
      {videoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-semibold text-primary-foreground">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {name} {isLocal && '(You)'}
          </span>
          <div className="flex items-center gap-2">
            {!audioEnabled && (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <MicOff className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            {!videoEnabled && (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <VideoOff className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}