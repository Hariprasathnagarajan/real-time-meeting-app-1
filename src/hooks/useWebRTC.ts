"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ICE_SERVERS,
  getUserMedia,
  getDisplayMedia,
  stopMediaStream,
  AudioMeter,
  VirtualBackgroundProcessor,
  DEFAULT_MEDIA_CONSTRAINTS,
} from '@/lib/webrtc';

export interface RemoteParticipant {
  id: string;
  name: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  isScreenSharing: boolean;
}

export type VirtualBackgroundMode =
  | 'none'
  | 'blur'
  | 'office'
  | 'beach'
  | 'library'
  | 'living-room';

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
  initialAudio?: boolean;
  initialVideo?: boolean;
}

export function useWebRTC({
  roomId,
  userId,
  userName,
  enabled = true,
  initialAudio = true,
  initialVideo = true,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudio);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [virtualBgMode, setVirtualBgMode] = useState<VirtualBackgroundMode>('none');

  // Media devices
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');

  // Stable references to prevent dependency cascades
  const localStreamRef = useRef<MediaStream | null>(null);
  const rawCameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteMeters = useRef<Map<string, AudioMeter>>(new Map());
  const localMeter = useRef<AudioMeter | null>(null);
  const vbProcessor = useRef<VirtualBackgroundProcessor | null>(null);
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  const lastSignalId = useRef<number>(0);
  const isMounted = useRef<boolean>(true);

  // Sync state to ref
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Send signaling message
  const sendSignal = useCallback(
    async (type: string, payload: any = {}, targetId: string = 'all') => {
      if (!roomId || !userId) return;

      const message = {
        meetingCode: roomId,
        senderId: userId,
        senderName: userName || 'User',
        targetId,
        type,
        payload,
      };

      // 1. BroadcastChannel (fast local tab communication)
      try {
        if (broadcastChannel.current) {
          broadcastChannel.current.postMessage(message);
        }
      } catch (err) {}

      // 2. Server API for network peers
      try {
        await fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
      } catch (err) {}
    },
    [roomId, userId, userName]
  );

  // Enumerate available media devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((d) => d.kind === 'audioinput'));
      setVideoInputs(devices.filter((d) => d.kind === 'videoinput'));
      setAudioOutputs(devices.filter((d) => d.kind === 'audiooutput'));
    } catch (err) {}
  }, []);

  // Create Peer Connection for a remote peer
  const createPeerConnection = useCallback(
    (peerId: string, peerName: string) => {
      if (peerConnections.current.has(peerId)) {
        return peerConnections.current.get(peerId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(peerId, pc);

      // Add local tracks to peer connection using current stream ref
      const activeStream = localStreamRef.current || rawCameraStreamRef.current;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, activeStream);
          } catch (e) {}
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('candidate', event.candidate.toJSON(), peerId);
        }
      };

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        const [incomingStream] = event.streams;
        const remoteStream = incomingStream || new MediaStream([event.track]);

        setParticipants((prev) => {
          const next = new Map(prev);
          const existing = next.get(peerId);
          next.set(peerId, {
            id: peerId,
            name: peerName || existing?.name || 'Participant',
            stream: remoteStream,
            audioEnabled: existing ? existing.audioEnabled : true,
            videoEnabled: existing ? existing.videoEnabled : true,
            isSpeaking: false,
            audioLevel: 0,
            isScreenSharing: false,
          });
          return next;
        });

        // Setup audio level meter for remote participant
        if (!remoteMeters.current.has(peerId) && remoteStream.getAudioTracks().length > 0) {
          const meter = new AudioMeter(remoteStream, (level, speaking) => {
            setParticipants((prev) => {
              const current = prev.get(peerId);
              if (!current) return prev;
              if (current.isSpeaking === speaking && Math.abs(current.audioLevel - level) < 5) {
                return prev;
              }
              const next = new Map(prev);
              next.set(peerId, {
                ...current,
                audioLevel: level,
                isSpeaking: speaking,
              });
              return next;
            });
          });
          remoteMeters.current.set(peerId, meter);
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          remoteMeters.current.get(peerId)?.stop();
          remoteMeters.current.delete(peerId);
          peerConnections.current.delete(peerId);
          setParticipants((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        }
      };

      return pc;
    },
    [sendSignal]
  );

  // Handle incoming signal (Offer / Answer / Candidate / State / Leave)
  const handleSignal = useCallback(
    async (signal: {
      senderId: string;
      senderName: string;
      targetId: string;
      type: string;
      payload: any;
    }) => {
      const { senderId, senderName, targetId, type, payload } = signal;

      if (!senderId || senderId === userId) return;
      if (targetId !== 'all' && targetId !== userId) return;

      let parsedPayload = payload;
      if (typeof payload === 'string') {
        try {
          parsedPayload = JSON.parse(payload);
        } catch (e) {
          parsedPayload = {};
        }
      }

      switch (type) {
        case 'join': {
          const pc = createPeerConnection(senderId, senderName);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal('offer', offer, senderId);
          } catch (err) {}
          break;
        }

        case 'offer': {
          const pc = createPeerConnection(senderId, senderName);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(parsedPayload));

            const queued = pendingCandidates.current.get(senderId) || [];
            for (const cand of queued) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {}
            }
            pendingCandidates.current.delete(senderId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal('answer', answer, senderId);
          } catch (err) {}
          break;
        }

        case 'answer': {
          const pc = peerConnections.current.get(senderId);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(parsedPayload));

              const queued = pendingCandidates.current.get(senderId) || [];
              for (const cand of queued) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {}
              }
              pendingCandidates.current.delete(senderId);
            } catch (err) {}
          }
          break;
        }

        case 'candidate': {
          const pc = peerConnections.current.get(senderId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(parsedPayload));
            } catch (err) {}
          } else {
            const list = pendingCandidates.current.get(senderId) || [];
            list.push(parsedPayload);
            pendingCandidates.current.set(senderId, list);
          }
          break;
        }

        case 'state_change': {
          setParticipants((prev) => {
            const current = prev.get(senderId);
            if (!current) return prev;
            const next = new Map(prev);
            next.set(senderId, {
              ...current,
              audioEnabled: parsedPayload.audioEnabled ?? current.audioEnabled,
              videoEnabled: parsedPayload.videoEnabled ?? current.videoEnabled,
              isScreenSharing: parsedPayload.isScreenSharing ?? current.isScreenSharing,
            });
            return next;
          });
          break;
        }

        case 'leave': {
          remoteMeters.current.get(senderId)?.stop();
          remoteMeters.current.delete(senderId);
          const pc = peerConnections.current.get(senderId);
          if (pc) {
            pc.close();
            peerConnections.current.delete(senderId);
          }
          setParticipants((prev) => {
            const next = new Map(prev);
            next.delete(senderId);
            return next;
          });
          break;
        }
      }
    },
    [userId, createPeerConnection, sendSignal]
  );

  // Keep a stable ref for handleSignal to avoid listener re-attachment
  const handleSignalRef = useRef(handleSignal);
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // Main lifecycle: Initialize Media and WebRTC Mesh ONLY when enabled
  useEffect(() => {
    if (!enabled || !roomId || !userId) {
      return;
    }

    isMounted.current = true;

    async function startMeetingEngine() {
      try {
        const stream = await getUserMedia(DEFAULT_MEDIA_CONSTRAINTS);
        if (!isMounted.current) {
          stopMediaStream(stream);
          return;
        }

        rawCameraStreamRef.current = stream;
        localStreamRef.current = stream;

        // Set initial track states
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = initialAudio;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = initialVideo;

        setLocalStream(stream);
        setIsAudioEnabled(initialAudio);
        setIsVideoEnabled(initialVideo);

        // Setup local audio analyser
        localMeter.current = new AudioMeter(stream, (level, speaking) => {
          if (!isMounted.current) return;
          setAudioLevel(level);
          setIsSpeaking(speaking);
        });

        await refreshDevices();

        // Setup BroadcastChannel for zero-latency local testing
        try {
          const bc = new BroadcastChannel(`zoom_room_${roomId}`);
          broadcastChannel.current = bc;
          bc.onmessage = (e) => {
            if (isMounted.current && e.data) {
              handleSignalRef.current(e.data);
            }
          };
        } catch (e) {}

        // Announce join
        sendSignal('join', { userName }, 'all');
      } catch (err: any) {
        if (isMounted.current) {
          setError(
            err.message ||
              'Failed to access camera/microphone. Please ensure permissions are granted.'
          );
        }
      }
    }

    startMeetingEngine();

    return () => {
      isMounted.current = false;
      sendSignal('leave', {}, 'all').catch(() => {});

      if (broadcastChannel.current) {
        broadcastChannel.current.close();
        broadcastChannel.current = null;
      }

      localMeter.current?.stop();
      remoteMeters.current.forEach((m) => m.stop());
      remoteMeters.current.clear();

      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();

      if (rawCameraStreamRef.current) {
        stopMediaStream(rawCameraStreamRef.current);
        rawCameraStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        stopMediaStream(screenStreamRef.current);
        screenStreamRef.current = null;
      }
      if (vbProcessor.current) {
        vbProcessor.current.stop();
      }
    };
  }, [enabled, roomId, userId]); // Stable dependencies: only re-runs if enabled or room/user changes!

  // Periodic signal polling for cross-machine peers
  useEffect(() => {
    if (!enabled || !roomId || !userId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/signal?meetingCode=${encodeURIComponent(
            roomId
          )}&participantId=${encodeURIComponent(
            userId
          )}&sinceId=${lastSignalId.current}`
        );
        if (!res.ok) return;

        const signals: any[] = await res.json();
        for (const sig of signals) {
          if (sig.id > lastSignalId.current) {
            lastSignalId.current = sig.id;
          }
          await handleSignalRef.current(sig);
        }
      } catch (err) {}
    }, 1200);

    return () => clearInterval(interval);
  }, [enabled, roomId, userId]);

  // Toggle Audio (Mute / Unmute)
  const toggleAudio = useCallback(
    (forceState?: boolean) => {
      const activeStream = localStreamRef.current || rawCameraStreamRef.current;
      if (!activeStream) return;

      const audioTrack = activeStream.getAudioTracks()[0];
      if (audioTrack) {
        const nextState = forceState !== undefined ? forceState : !audioTrack.enabled;
        audioTrack.enabled = nextState;
        setIsAudioEnabled(nextState);

        sendSignal('state_change', {
          audioEnabled: nextState,
          videoEnabled: isVideoEnabled,
          isScreenSharing,
        });
      }
    },
    [isVideoEnabled, isScreenSharing, sendSignal]
  );

  // Toggle Video (Camera On / Off)
  const toggleVideo = useCallback(
    (forceState?: boolean) => {
      const activeStream = localStreamRef.current || rawCameraStreamRef.current;
      if (!activeStream) return;

      const videoTrack = activeStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextState = forceState !== undefined ? forceState : !videoTrack.enabled;
        videoTrack.enabled = nextState;
        setIsVideoEnabled(nextState);

        sendSignal('state_change', {
          audioEnabled: isAudioEnabled,
          videoEnabled: nextState,
          isScreenSharing,
        });
      }
    },
    [isAudioEnabled, isScreenSharing, sendSignal]
  );

  // Start Screen Sharing
  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) return;

    try {
      const displayStream = await getDisplayMedia();
      screenStreamRef.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];

      // Replace video track in all active peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      const combined = new MediaStream();
      combined.addTrack(screenTrack);
      if (localStreamRef.current) {
        const audio = localStreamRef.current.getAudioTracks()[0];
        if (audio) combined.addTrack(audio);
      }
      setLocalStream(combined);
      setIsScreenSharing(true);

      sendSignal('state_change', {
        audioEnabled: isAudioEnabled,
        videoEnabled: isVideoEnabled,
        isScreenSharing: true,
      });

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {}
  }, [isScreenSharing, isAudioEnabled, isVideoEnabled, sendSignal]);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(() => {
    if (!isScreenSharing) return;

    if (screenStreamRef.current) {
      stopMediaStream(screenStreamRef.current);
      screenStreamRef.current = null;
    }

    const cameraStream = rawCameraStreamRef.current;
    if (cameraStream) {
      const cameraTrack = cameraStream.getVideoTracks()[0];

      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      });

      setLocalStream(cameraStream);
    }

    setIsScreenSharing(false);

    sendSignal('state_change', {
      audioEnabled: isAudioEnabled,
      videoEnabled: isVideoEnabled,
      isScreenSharing: false,
    });
  }, [isScreenSharing, isAudioEnabled, isVideoEnabled, sendSignal]);

  // Virtual Background
  const setVirtualBackground = useCallback(
    (mode: VirtualBackgroundMode) => {
      setVirtualBgMode(mode);
      const raw = rawCameraStreamRef.current;
      if (!raw) return;

      if (mode === 'none') {
        if (vbProcessor.current) {
          vbProcessor.current.stop();
        }
        const cameraTrack = raw.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && cameraTrack) {
            sender.replaceTrack(cameraTrack);
          }
        });
        setLocalStream(raw);
        return;
      }

      if (!vbProcessor.current) {
        vbProcessor.current = new VirtualBackgroundProcessor();
      }

      vbProcessor.current.setMode(mode);
      const processedStream = vbProcessor.current.process(raw);
      const processedTrack = processedStream.getVideoTracks()[0];

      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && processedTrack) {
          sender.replaceTrack(processedTrack);
        }
      });

      setLocalStream(processedStream);
    },
    []
  );

  // Switch Device
  const setDevice = useCallback(
    async (kind: 'audioInput' | 'videoInput' | 'audioOutput', deviceId: string) => {
      try {
        if (kind === 'audioInput') {
          setSelectedAudioInput(deviceId);
          const newStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: deviceId } },
          });
          const newTrack = newStream.getAudioTracks()[0];

          if (rawCameraStreamRef.current) {
            const oldTrack = rawCameraStreamRef.current.getAudioTracks()[0];
            if (oldTrack) oldTrack.stop();
            rawCameraStreamRef.current.removeTrack(oldTrack);
            rawCameraStreamRef.current.addTrack(newTrack);
          }

          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
            if (sender) sender.replaceTrack(newTrack);
          });
        } else if (kind === 'videoInput') {
          setSelectedVideoInput(deviceId);
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
          });
          const newTrack = newStream.getVideoTracks()[0];

          if (rawCameraStreamRef.current) {
            const oldTrack = rawCameraStreamRef.current.getVideoTracks()[0];
            if (oldTrack) oldTrack.stop();
            rawCameraStreamRef.current.removeTrack(oldTrack);
            rawCameraStreamRef.current.addTrack(newTrack);
          }

          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(newTrack);
          });
          setLocalStream(new MediaStream(rawCameraStreamRef.current!.getTracks()));
        } else if (kind === 'audioOutput') {
          setSelectedAudioOutput(deviceId);
        }
      } catch (err) {}
    },
    []
  );

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    sendSignal('leave', {}, 'all').catch(() => {});

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    remoteMeters.current.forEach((m) => m.stop());
    remoteMeters.current.clear();
    localMeter.current?.stop();

    if (localStreamRef.current) stopMediaStream(localStreamRef.current);
    if (rawCameraStreamRef.current) stopMediaStream(rawCameraStreamRef.current);
    if (screenStreamRef.current) stopMediaStream(screenStreamRef.current);

    setParticipants(new Map());
  }, [sendSignal]);

  return {
    localStream,
    participants: Array.from(participants.values()),
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isSpeaking,
    audioLevel,
    error,
    virtualBgMode,
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    setVirtualBackground,
    setDevice,
    leaveMeeting,
    sendSignal,
  };
}
