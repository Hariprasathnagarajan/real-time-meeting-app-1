"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { PeerConnection, getUserMedia, stopMediaStream, DEFAULT_MEDIA_CONSTRAINTS } from '@/lib/webrtc';

export interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface UseWebRTCOptions {
  roomId: string;
  userName: string;
}

export function useWebRTC({ roomId, userName }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const screenStream = useRef<MediaStream | null>(null);
  const originalStream = useRef<MediaStream | null>(null);

  // Initialize local media stream
  useEffect(() => {
    let mounted = true;

    const initializeMedia = async () => {
      try {
        const stream = await getUserMedia(DEFAULT_MEDIA_CONSTRAINTS);
        if (mounted) {
          setLocalStream(stream);
          originalStream.current = stream;
        }
      } catch (err) {
        console.error('Failed to get user media:', err);
        if (mounted) {
          setError('Failed to access camera/microphone. Please check permissions.');
        }
      }
    };

    initializeMedia();

    return () => {
      mounted = false;
      if (localStream) {
        stopMediaStream(localStream);
      }
      if (screenStream.current) {
        stopMediaStream(screenStream.current);
      }
    };
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!localStream || isScreenSharing) return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      screenStream.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.connection
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Replace local video track
      const videoTrack = localStream.getVideoTracks()[0];
      localStream.removeTrack(videoTrack);
      localStream.addTrack(screenTrack);
      
      setLocalStream(new MediaStream(localStream.getTracks()));
      setIsScreenSharing(true);

      // Handle screen share stop
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Failed to start screen sharing:', err);
      setError('Failed to start screen sharing');
    }
  }, [localStream, isScreenSharing]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (!isScreenSharing || !originalStream.current) return;

    if (screenStream.current) {
      stopMediaStream(screenStream.current);
      screenStream.current = null;
    }

    const videoTrack = originalStream.current.getVideoTracks()[0];

    // Replace screen track with camera track in all peer connections
    peerConnections.current.forEach((pc) => {
      const sender = pc.connection
        .getSenders()
        .find((s) => s.track?.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    });

    // Replace local video track
    if (localStream) {
      const screenTrack = localStream.getVideoTracks()[0];
      localStream.removeTrack(screenTrack);
      if (videoTrack) {
        localStream.addTrack(videoTrack);
      }
      setLocalStream(new MediaStream(localStream.getTracks()));
    }

    setIsScreenSharing(false);
  }, [isScreenSharing, localStream]);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    // Close all peer connections
    peerConnections.current.forEach((pc) => {
      pc.close();
    });
    peerConnections.current.clear();

    // Stop all streams
    if (localStream) {
      stopMediaStream(localStream);
      setLocalStream(null);
    }
    if (screenStream.current) {
      stopMediaStream(screenStream.current);
      screenStream.current = null;
    }

    setParticipants(new Map());
  }, [localStream]);

  return {
    localStream,
    participants: Array.from(participants.values()),
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    error,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
  };
}