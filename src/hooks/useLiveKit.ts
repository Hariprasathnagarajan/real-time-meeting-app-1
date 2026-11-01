"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

export interface LiveKitParticipant {
  id: string;
  name: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
}

interface UseLiveKitOptions {
  meetingCode: string;
  enabled: boolean;
}

function streamForParticipant(participant: Participant) {
  const stream = new MediaStream();
  participant.trackPublications.forEach((publication) => {
    const track = publication.track?.mediaStreamTrack;
    if (track && (track.kind === "audio" || track.kind === "video")) stream.addTrack(track);
  });
  return stream.getTracks().length ? stream : null;
}

function participantState(participant: Participant): LiveKitParticipant {
  const tracks = [...participant.trackPublications.values()];
  return {
    id: participant.identity,
    name: participant.name || participant.identity,
    stream: streamForParticipant(participant),
    audioEnabled: tracks.some((publication) => publication.kind === Track.Kind.Audio && !publication.isMuted),
    videoEnabled: tracks.some((publication) => publication.kind === Track.Kind.Video && !publication.isMuted),
    isScreenSharing: tracks.some((publication) => publication.source === Track.Source.ScreenShare && !publication.isMuted),
  };
}

export function useLiveKit({ meetingCode, enabled }: UseLiveKitOptions) {
  const roomRef = useRef<Room | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, LiveKitParticipant>>(new Map());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const refreshParticipant = useCallback((participant: Participant) => {
    setParticipants((previous) => {
      const next = new Map(previous);
      next.set(participant.identity, participantState(participant));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !meetingCode) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const handleTrackChanged = (track: RemoteTrack | null, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (track || publication) refreshParticipant(participant);
    };
    const handleParticipant = (participant: RemoteParticipant) => refreshParticipant(participant);
    const handleDisconnected = () => setConnectionState(ConnectionState.Disconnected);

    room.on(RoomEvent.ConnectionStateChanged, setConnectionState);
    room.on(RoomEvent.ParticipantConnected, handleParticipant);
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setParticipants((previous) => {
        const next = new Map(previous);
        next.delete(participant.identity);
        return next;
      });
    });
    room.on(RoomEvent.TrackSubscribed, handleTrackChanged);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackChanged);
    const refreshLocalStream = () => setLocalStream(streamForParticipant(room.localParticipant));
    room.on(RoomEvent.LocalTrackPublished, refreshLocalStream);
    room.on(RoomEvent.LocalTrackUnpublished, refreshLocalStream);
    room.on(RoomEvent.TrackMuted, refreshLocalStream);
    room.on(RoomEvent.TrackUnmuted, refreshLocalStream);
    room.on(RoomEvent.ParticipantMetadataChanged, (_metadata, participant) => refreshParticipant(participant));
    room.on(RoomEvent.TrackMuted, (_publication, participant) => refreshParticipant(participant));
    room.on(RoomEvent.TrackUnmuted, (_publication, participant) => refreshParticipant(participant));
    room.on(RoomEvent.Disconnected, handleDisconnected);

    (async () => {
      try {
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingCode }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to connect to LiveKit");
        if (cancelled) return;
        await room.connect(payload.serverUrl, payload.token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
        if (!cancelled) {
          setIsAudioEnabled(true);
          setIsVideoEnabled(true);
          setConnectionState(room.state);
          setLocalStream(streamForParticipant(room.localParticipant));
          refreshParticipant(room.localParticipant);
          room.remoteParticipants.forEach(refreshParticipant);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to connect to LiveKit");
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      room.disconnect();
      roomRef.current = null;
      setParticipants(new Map());
      setLocalStream(null);
    };
  }, [enabled, meetingCode, refreshParticipant]);

  const toggleAudio = useCallback(async (enabledValue?: boolean) => {
    const next = enabledValue ?? !isAudioEnabled;
    await roomRef.current?.localParticipant.setMicrophoneEnabled(next);
    setIsAudioEnabled(next);
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(async (enabledValue?: boolean) => {
    const next = enabledValue ?? !isVideoEnabled;
    await roomRef.current?.localParticipant.setCameraEnabled(next);
    setIsVideoEnabled(next);
  }, [isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    const next = !isScreenSharing;
    await roomRef.current?.localParticipant.setScreenShareEnabled(next);
    setIsScreenSharing(next);
  }, [isScreenSharing]);

  const leaveRoom = useCallback(async () => {
    await roomRef.current?.disconnect();
  }, []);

  return {
    room: roomRef.current,
    localStream,
    participants,
    connectionState,
    error,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveRoom,
  };
}
