"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoTile } from '@/components/VideoTile';
import { MeetingControls } from '@/components/MeetingControls';
import { ChatSidebar, ChatMessage, ChatParticipantOption } from '@/components/ChatSidebar';
import { ParticipantsSidebar } from '@/components/ParticipantsSidebar';
import { PreJoinLobby } from '@/components/PreJoinLobby';
import { FloatingReactions, FloatingReactionItem } from '@/components/FloatingReactions';
import { LiveCaptions, CaptionEntry } from '@/components/LiveCaptions';
import { TranscriptSidebar } from '@/components/TranscriptSidebar';
import { SecurityMenu } from '@/components/SecurityMenu';
import { BreakoutRoomsModal, BreakoutRoomItem } from '@/components/BreakoutRoomsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { EndMeetingModal } from '@/components/EndMeetingModal';
import { WhiteboardStage } from '@/components/WhiteboardStage';
import { AdminControls } from '@/components/AdminControls';
import { PollsPanel } from '@/components/PollsPanel';
import { WaitingRoom } from '@/components/WaitingRoom';
import { FileSharing } from '@/components/FileSharing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  Users,
  Copy,
  Check,
  Shield,
  Clock,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Square,
  Sparkles,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

interface Meeting {
  id: number;
  hostUserId: string;
  title: string;
  meetingCode: string;
  password?: string | null;
  isPasswordProtected: boolean;
  isWaitingRoomEnabled: boolean;
  isLocked: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowUnmute: boolean;
  allowVideo: boolean;
  allowRename: boolean;
  status: string;
}

interface Participant {
  id: number;
  userId: string | null;
  displayName: string;
  role: string;
  status: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: string | null;
}

interface Poll {
  id: number;
  question: string;
  pollType: string;
  options: string[];
  isActive: boolean;
  responses?: { [key: string]: number };
}

interface SharedFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSizeMb: number;
  uploadedBy: string;
  uploadedAt: string;
}

export default function MeetingRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  // Initial user and meeting resolution
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [initialAudio, setInitialAudio] = useState(true);
  const [initialVideo, setInitialVideo] = useState(true);

  // View Layout
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sidebars & Modals
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showBreakout, setShowBreakout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Feature states
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);

  // Captions & Subtitles
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);
  const [activeCaption, setActiveCaption] = useState<CaptionEntry | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<CaptionEntry[]>([]);

  // Floating Reactions
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);

  // Breakout Rooms
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoomItem[]>([]);
  const [breakoutRoomsActive, setBreakoutRoomsActive] = useState(false);
  const [currentBreakoutRoomId, setCurrentBreakoutRoomId] = useState<string | number | null>(null);
  const [broadcastBanner, setBroadcastBanner] = useState<string | null>(null);

  // Data states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [whiteboardData, setWhiteboardData] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const captionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC hook initialization
  const {
    localStream,
    participants: webrtcParticipants,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isSpeaking: isLocalSpeaking,
    audioLevel: localAudioLevel,
    error: mediaError,
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
  } = useWebRTC({
    roomId,
    userId: currentUser?.id ?? '',
    userName: currentUser?.name ?? 'User',
    enabled: hasJoinedLobby && Boolean(currentUser?.id),
    initialAudio,
    initialVideo,
  });

  // Resolve meeting on mount
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const meRes = await fetch('/api/me');
        if (!meRes.ok) throw new Error('Failed to load user profile');
        const user: CurrentUser = await meRes.json();
        if (cancelled) return;
        setCurrentUser(user);

        // Fetch meeting by code
        const meetingRes = await fetch(`/api/meetings?code=${encodeURIComponent(roomId)}`);
        if (meetingRes.ok) {
          const m: Meeting = await meetingRes.json();
          if (cancelled) return;
          setMeeting(m);
          setIsHost(m.hostUserId === user.id);
        } else if (meetingRes.status === 404) {
          // Auto-create instant meeting
          const createRes = await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Instant Meeting',
              scheduledStartTime: new Date().toISOString(),
              isWaitingRoomEnabled: false,
            }),
          });
          if (createRes.ok) {
            const created: Meeting = await createRes.json();
            if (cancelled) return;
            router.replace(`/meeting/${created.meetingCode}`);
          }
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        if (!cancelled) setPageError('Failed to load meeting room.');
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [roomId, router]);

  // Load chat messages
  const loadMessages = useCallback(async (meetingId: number, userId: string) => {
    try {
      const res = await fetch(`/api/chat-messages?meetingId=${meetingId}&userId=${userId}&limit=200`);
      if (!res.ok) return;
      const data: any[] = await res.json();
      setMessages(
        data.map((m) => ({
          id: String(m.id),
          sender: m.senderName,
          message: m.message,
          timestamp: new Date(m.createdAt),
          isLocal: m.userId === userId,
          recipientUserId: m.recipientUserId,
          recipientName: m.recipientName,
        }))
      );
    } catch (e) {}
  }, []);

  // Refresh participants
  const refreshParticipants = useCallback(async (meetingId: number) => {
    try {
      const res = await fetch(`/api/meeting-participants?meetingId=${meetingId}&limit=100`);
      if (!res.ok) return;
      const data: Participant[] = await res.json();
      setParticipants(data);
    } catch (e) {}
  }, []);

  // Load polls
  const loadPolls = useCallback(async (meetingId: number) => {
    try {
      const res = await fetch(`/api/polls?meetingId=${meetingId}&limit=100`);
      if (!res.ok) return;
      const data: Poll[] = await res.json();
      setPolls(data);
    } catch (e) {}
  }, []);

  // Load files
  const loadFiles = useCallback(async (meetingId: number, userId: string, userName: string) => {
    try {
      const res = await fetch(`/api/meeting-files?meetingId=${meetingId}&limit=100`);
      if (!res.ok) return;
      const data: any[] = await res.json();
      setFiles(
        data.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          fileSizeMb: f.fileSizeMb,
          uploadedBy: f.uploadedByUserId === userId ? userName : 'Participant',
          uploadedAt: f.uploadedAt,
        }))
      );
    } catch (e) {}
  }, []);

  // Setup periodic polling sync
  useEffect(() => {
    if (!meeting || !currentUser || !hasJoinedLobby) return;

    refreshParticipants(meeting.id);
    loadMessages(meeting.id, currentUser.id);
    loadPolls(meeting.id);
    loadFiles(meeting.id, currentUser.id, currentUser.name);

    const interval = setInterval(() => {
      refreshParticipants(meeting.id);
      loadMessages(meeting.id, currentUser.id);
    }, 2500);

    return () => clearInterval(interval);
  }, [meeting, currentUser, hasJoinedLobby, refreshParticipants, loadMessages, loadPolls, loadFiles]);

  // Handle participant admission / check waiting room
  const meParticipant = participants.find((p) => p.userId === currentUser?.id);
  const inMeetingParticipants = participants.filter(
    (p) => p.status === 'admitted' || p.status === 'in_meeting'
  );
  const waitingParticipants = participants.filter((p) => p.status === 'waiting');
  const isWaitingForAdmission = !isHost && meParticipant?.status === 'waiting';

  // Push-to-Talk (Spacebar listener)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.repeat
      ) {
        return;
      }

      if (e.code === 'Space' && !isAudioEnabled) {
        e.preventDefault();
        toggleAudio(true);
        setIsPushToTalkActive(true);
      } else if (e.altKey && e.code === 'KeyA') {
        e.preventDefault();
        toggleAudio();
      } else if (e.altKey && e.code === 'KeyV') {
        e.preventDefault();
        toggleVideo();
      } else if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        if (isScreenSharing) stopScreenShare();
        else startScreenShare();
      } else if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        setShowChat((p) => !p);
      } else if (e.altKey && e.code === 'KeyP') {
        e.preventDefault();
        setShowParticipants((p) => !p);
      } else if (e.altKey && e.code === 'KeyH') {
        e.preventDefault();
        handleToggleHandRaise();
      } else if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPushToTalkActive) {
        toggleAudio(false);
        setIsPushToTalkActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isAudioEnabled, isPushToTalkActive, isScreenSharing, toggleAudio, toggleVideo, startScreenShare, stopScreenShare]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Join meeting from lobby
  const handleJoinFromLobby = async (options: {
    displayName: string;
    isAudioMuted: boolean;
    isVideoOff: boolean;
    passcode?: string;
  }) => {
    if (!meeting || !currentUser) return;

    if (meeting.isPasswordProtected && meeting.password && options.passcode !== meeting.password) {
      toast.error('Incorrect passcode for this meeting');
      return;
    }

    if (meeting.isLocked && !isHost) {
      toast.error('This meeting has been locked by the host');
      return;
    }

    setInitialAudio(!options.isAudioMuted);
    setInitialVideo(!options.isVideoOff);

    try {
      // Register participant
      const res = await fetch('/api/meeting-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          userId: currentUser.id,
          displayName: options.displayName,
          role: isHost ? 'host' : 'participant',
        }),
      });

      if (res.ok) {
        const p: Participant = await res.json();
        const shouldAdmit = isHost || !meeting.isWaitingRoomEnabled;
        if (shouldAdmit) {
          await fetch(`/api/meeting-participants?id=${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'admitted',
              joinedAt: new Date().toISOString(),
            }),
          });
        }
      }

      setHasJoinedLobby(true);
    } catch (e) {
      toast.error('Failed to enter meeting room');
    }
  };

  // Hand raise
  const handleToggleHandRaise = async () => {
    if (!meParticipant) return;
    const nextVal = !isHandRaised;
    setIsHandRaised(nextVal);

    try {
      await fetch(`/api/meeting-participants?id=${meParticipant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHandRaised: nextVal }),
      });
      sendSignal('reaction', { emoji: '✋', senderName: currentUser?.name || 'User' });
    } catch (e) {}
  };

  // Floating reaction trigger
  const triggerReaction = (emoji: string) => {
    const item: FloatingReactionItem = {
      id: `${Date.now()}_${Math.random()}`,
      emoji,
      senderName: currentUser?.name || 'You',
      xOffset: 30 + Math.random() * 40,
    };
    setFloatingReactions((prev) => [...prev, item]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== item.id));
    }, 3800);

    sendSignal('reaction', {
      emoji,
      senderName: currentUser?.name || 'User',
      xOffset: item.xOffset,
    });
  };

  // Local caption speech
  const handleNewLocalCaption = (text: string) => {
    const entry: CaptionEntry = {
      id: `${Date.now()}_${Math.random()}`,
      senderName: currentUser?.name || 'You',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActiveCaption(entry);
    setTranscriptHistory((prev) => [...prev, entry]);

    if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
    captionTimeoutRef.current = setTimeout(() => {
      setActiveCaption(null);
    }, 4500);

    sendSignal('caption', entry);
  };

  // Meeting Recording
  const handleToggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!localStream) {
      toast.error('No media stream available to record');
      return;
    }

    try {
      const recorder = new MediaRecorder(localStream);
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Zoom_Meeting_Recording_${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Meeting recording saved and downloaded!');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.success('Recording started');
    } catch (e) {
      toast.error('Recording not supported on this browser');
    }
  };

  // Chat message send
  const handleSendMessage = async (msg: string, recipient?: { userId: string; name: string }) => {
    if (!meeting || !currentUser) return;
    try {
      const res = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          userId: currentUser.id,
          senderName: currentUser.name,
          recipientUserId: recipient?.userId || null,
          recipientName: recipient?.name || null,
          message: msg,
        }),
      });
      if (res.ok) {
        await loadMessages(meeting.id, currentUser.id);
      }
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  // File upload
  const handleFileUpload = async (file: File) => {
    if (!meeting || !currentUser) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const upRes = await fetch('/api/meeting-files/upload', {
        method: 'POST',
        body: formData,
      });
      if (!upRes.ok) throw new Error('Upload failed');
      const uploaded = await upRes.json();

      await fetch('/api/meeting-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          uploadedByUserId: currentUser.id,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          fileSizeMb: uploaded.fileSizeMb,
          fileType: uploaded.fileType,
        }),
      });

      // Post message in chat mentioning file
      await handleSendMessage(`Shared a file: ${file.name}`);
      await loadFiles(meeting.id, currentUser.id, currentUser.name);
      toast.success(`File ${file.name} uploaded!`);
    } catch (e) {
      toast.error('Failed to upload file');
    }
  };

  // Security settings update
  const handleUpdateSecurity = async (key: string, value: boolean) => {
    if (!meeting) return;
    setMeeting((prev) => (prev ? { ...prev, [key]: value } : prev));
    try {
      await fetch(`/api/meetings?id=${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      toast.success('Security settings updated');
    } catch (e) {}
  };

  // Suspend activities
  const handleSuspendAll = async () => {
    if (!meeting) return;
    try {
      await fetch(`/api/meetings?id=${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isLocked: true,
          allowChat: false,
          allowScreenShare: false,
          allowUnmute: false,
          allowVideo: false,
        }),
      });
      toast.warning('Emergency: Suspended all participant activities and locked room');
    } catch (e) {}
  };

  // End meeting for all
  const handleEndMeetingForAll = async () => {
    if (meeting) {
      try {
        await fetch(`/api/meetings?id=${meeting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });
      } catch (e) {}
    }
    leaveMeeting();
    router.push('/');
  };

  const handleLeaveMeeting = () => {
    leaveMeeting();
    router.push('/');
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/meeting/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Meeting invitation link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Errors view
  if (pageError || mediaError) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 bg-gray-900 border-red-500/50 text-white shadow-2xl">
          <h2 className="text-xl font-bold text-red-500 mb-2">Connection Issue</h2>
          <p className="text-sm text-gray-300 mb-6">{pageError || mediaError}</p>
          <Button onClick={() => router.push('/')} className="w-full bg-blue-600 hover:bg-blue-500">
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  // 2. Loading state
  if (!currentUser || !meeting) {
    return (
      <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center gap-3 p-4 text-white">
        <Spinner className="size-8 text-blue-500" />
        <p className="text-sm text-gray-400 font-medium">Connecting to Zoom Meeting...</p>
      </div>
    );
  }

  // 3. Pre-Join Preview Lobby
  if (!hasJoinedLobby) {
    return (
      <PreJoinLobby
        meetingTitle={meeting.title}
        meetingCode={meeting.meetingCode}
        isPasswordProtected={meeting.isPasswordProtected}
        defaultName={currentUser.name}
        onJoin={handleJoinFromLobby}
        onCancel={() => router.push('/')}
      />
    );
  }

  // 4. Waiting room view
  if (isWaitingForAdmission) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-gray-900 border border-white/10 text-center shadow-2xl rounded-2xl">
          <Clock className="w-14 h-14 text-yellow-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">Please wait</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            The meeting host will let you in soon to <span className="text-white font-semibold">{meeting.title}</span>.
          </p>
          <Button onClick={handleLeaveMeeting} variant="outline" className="w-full border-white/10 hover:bg-white/10 text-white">
            Leave Meeting
          </Button>
        </Card>
      </div>
    );
  }

  // Active participants list
  const remoteParticipants = inMeetingParticipants.filter(
    (p) => p.userId !== currentUser.id
  );

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col overflow-hidden relative select-none">
      {/* Floating Reactions overlay */}
      <FloatingReactions reactions={floatingReactions} />

      {/* Live Closed Captions */}
      <LiveCaptions
        isEnabled={isCaptionsEnabled}
        activeCaption={activeCaption}
        onNewLocalCaption={handleNewLocalCaption}
        isAudioEnabled={isAudioEnabled}
      />

      {/* Push-to-Talk active banner */}
      {isPushToTalkActive && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600/90 text-white px-4 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg animate-pulse flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5" />
          Push-to-Talk Active (Unmuted)
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-gray-900/90 border-b border-white/10 px-4 py-2.5 backdrop-blur-md z-30 shrink-0">
        <div className="container mx-auto flex items-center justify-between gap-3">
          {/* Left: Meeting Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
              Z
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate flex items-center gap-2">
                {meeting.title}
                {meeting.isLocked && (
                  <span className="text-[10px] bg-red-600/80 text-white px-1.5 py-0.5 rounded font-semibold">
                    Locked
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-gray-400 font-mono truncate">
                ID: {meeting.meetingCode}
              </p>
            </div>
          </div>

          {/* Right: Layout Switcher, Copy Link, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* View Switcher: Speaker View vs Gallery View */}
            <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
                  viewMode === 'gallery'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                )}
                title="Gallery View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('speaker')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
                  viewMode === 'speaker'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                )}
                title="Speaker View"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Speaker</span>
              </button>
            </div>

            {/* Copy Link */}
            <Button
              onClick={copyRoomLink}
              variant="outline"
              size="sm"
              className="text-xs h-8 border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Invite'}</span>
            </Button>

            {/* Fullscreen */}
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="icon"
              title="Fullscreen (F)"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Host Waiting Room Admission Strip */}
      {isHost && waitingParticipants.length > 0 && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 z-20">
          <div className="container mx-auto flex items-center justify-between text-xs text-yellow-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {waitingParticipants.length} person(s) waiting to enter
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  for (const p of waitingParticipants) {
                    await fetch(`/api/meeting-participants?id=${p.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'admitted', joinedAt: new Date().toISOString() }),
                    });
                  }
                  refreshParticipants(meeting.id);
                  toast.success('Admitted all waiting participants');
                }}
                className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded text-[11px]"
              >
                Admit All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Video & Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Fullscreen Whiteboard Presentation Mode */}
        {showWhiteboard && (
          <WhiteboardStage
            initialData={whiteboardData}
            onSave={(data) => setWhiteboardData(data)}
            onBroadcast={(data) => sendSignal('whiteboard', { image: data })}
            onClose={() => setShowWhiteboard(false)}
          />
        )}

        {/* Video Canvas Stage */}
        <div className="flex-1 p-3 md:p-4 overflow-auto flex flex-col justify-center">
          {viewMode === 'gallery' ? (
            /* Gallery View */
            <div
              className={cn(
                'grid gap-3 w-full h-full max-h-[85vh] auto-rows-fr',
                remoteParticipants.length === 0
                  ? 'grid-cols-1 max-w-4xl mx-auto'
                  : remoteParticipants.length === 1
                  ? 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto'
                  : remoteParticipants.length <= 3
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2'
                  : remoteParticipants.length <= 5
                  ? 'grid-cols-2 md:grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              )}
            >
              {/* Local Video Tile */}
              <VideoTile
                stream={localStream}
                name={currentUser.name}
                isLocal
                audioEnabled={isAudioEnabled}
                videoEnabled={isVideoEnabled}
                isSpeaking={isLocalSpeaking}
                audioLevel={localAudioLevel}
                isHandRaised={isHandRaised}
                isScreenSharing={isScreenSharing}
                role={isHost ? 'host' : 'participant'}
              />

              {/* Remote Participant Tiles */}
              {remoteParticipants.map((p) => {
                const peer = webrtcParticipants.find((c) => c.name === p.displayName);

                return (
                  <VideoTile
                    key={p.id}
                    stream={peer?.stream ?? null}
                    name={p.displayName}
                    audioEnabled={!p.isAudioMuted}
                    videoEnabled={!p.isVideoOff}
                    isSpeaking={peer?.isSpeaking ?? false}
                    audioLevel={peer?.audioLevel ?? 0}
                    isHandRaised={p.isHandRaised}
                    isScreenSharing={peer?.isScreenSharing ?? false}
                    role={p.role}
                    isHost={isHost}
                    onPin={() => setPinnedParticipantId(String(p.id))}
                  />
                );
              })}
            </div>
          ) : (
            /* Speaker View (Central Stage with Top Filmstrip) */
            <div className="flex flex-col h-full gap-3">
              {/* Top Filmstrip */}
              <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 h-28">
                <div className="w-44 shrink-0 h-full">
                  <VideoTile
                    stream={localStream}
                    name={currentUser.name}
                    isLocal
                    audioEnabled={isAudioEnabled}
                    videoEnabled={isVideoEnabled}
                    isSpeaking={isLocalSpeaking}
                    className="h-full aspect-video"
                  />
                </div>
                {remoteParticipants.map((p) => {
                  const peer = webrtcParticipants.find((c) => c.name === p.displayName);
                  return (
                    <div key={p.id} className="w-44 shrink-0 h-full">
                      <VideoTile
                        stream={peer?.stream ?? null}
                        name={p.displayName}
                        audioEnabled={!p.isAudioMuted}
                        videoEnabled={!p.isVideoOff}
                        isSpeaking={peer?.isSpeaking ?? false}
                        className="h-full aspect-video"
                        onPin={() => setPinnedParticipantId(String(p.id))}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Central Active / Pinned Speaker Stage */}
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div className="w-full h-full max-w-5xl">
                  {pinnedParticipantId ? (
                    (() => {
                      const pinned = remoteParticipants.find((p) => String(p.id) === pinnedParticipantId);
                      const peer = webrtcParticipants.find((c) => c.name === pinned?.displayName);
                      return (
                        <VideoTile
                          stream={peer?.stream ?? null}
                          name={pinned?.displayName || 'Speaker'}
                          audioEnabled={!pinned?.isAudioMuted}
                          videoEnabled={!pinned?.isVideoOff}
                          isSpeaking={peer?.isSpeaking ?? false}
                          isPinned
                          onPin={() => setPinnedParticipantId(null)}
                          className="w-full h-full"
                        />
                      );
                    })()
                  ) : (
                    <VideoTile
                      stream={localStream}
                      name={currentUser.name}
                      isLocal
                      audioEnabled={isAudioEnabled}
                      videoEnabled={isVideoEnabled}
                      isSpeaking={isLocalSpeaking}
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Popup Menu */}
        {showSecurity && isHost && (
          <SecurityMenu
            settings={{
              isLocked: meeting.isLocked,
              isWaitingRoomEnabled: meeting.isWaitingRoomEnabled,
              allowScreenShare: meeting.allowScreenShare,
              allowChat: meeting.allowChat,
              allowRename: meeting.allowRename,
              allowUnmute: meeting.allowUnmute,
              allowVideo: meeting.allowVideo,
            }}
            onUpdateSetting={handleUpdateSecurity}
            onSuspendAll={handleSuspendAll}
            onClose={() => setShowSecurity(false)}
          />
        )}

        {/* Right Sidebars */}
        {(showChat || showParticipants || showTranscript || showPolls || showFiles || showAdminControls) && (
          <div className="w-full shrink-0 bg-gray-900 border-l border-white/10 sm:w-96 z-30">
            {showChat && (
              <ChatSidebar
                messages={messages}
                currentUserId={currentUser.id}
                participants={inMeetingParticipants.map((p) => ({
                  userId: p.userId || String(p.id),
                  displayName: p.displayName,
                }))}
                onSendMessage={handleSendMessage}
                onUploadFile={handleFileUpload}
                onClose={() => setShowChat(false)}
              />
            )}

            {showParticipants && (
              <ParticipantsSidebar
                participants={inMeetingParticipants}
                currentUserId={currentUser.id}
                isHost={isHost}
                onInvite={copyRoomLink}
                onMuteParticipant={async (pid) => {
                  const part = participants.find((p) => p.id === pid);
                  if (part) {
                    await fetch(`/api/meeting-participants?id=${pid}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isAudioMuted: !part.isAudioMuted }),
                    });
                    refreshParticipants(meeting.id);
                  }
                }}
                onToggleVideo={async (pid) => {
                  const part = participants.find((p) => p.id === pid);
                  if (part) {
                    await fetch(`/api/meeting-participants?id=${pid}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isVideoOff: !part.isVideoOff }),
                    });
                    refreshParticipants(meeting.id);
                  }
                }}
                onAssignCoHost={async (pid) => {
                  await fetch(`/api/meeting-participants?id=${pid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'co_host' }),
                  });
                  refreshParticipants(meeting.id);
                }}
                onRemoveParticipant={async (pid) => {
                  await fetch(`/api/meeting-participants?id=${pid}`, { method: 'DELETE' });
                  refreshParticipants(meeting.id);
                }}
                onMuteAll={async () => {
                  for (const p of remoteParticipants) {
                    await fetch(`/api/meeting-participants?id=${p.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isAudioMuted: true }),
                    });
                  }
                  refreshParticipants(meeting.id);
                  toast.success('Muted all participants');
                }}
                onLowerAllHands={async () => {
                  for (const p of participants) {
                    if (p.isHandRaised) {
                      await fetch(`/api/meeting-participants?id=${p.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isHandRaised: false }),
                      });
                    }
                  }
                  refreshParticipants(meeting.id);
                  toast.success('Lowered all hands');
                }}
                onClose={() => setShowParticipants(false)}
              />
            )}

            {showTranscript && (
              <TranscriptSidebar
                entries={transcriptHistory}
                meetingTitle={meeting.title}
                onClose={() => setShowTranscript(false)}
              />
            )}

            {showPolls && (
              <div className="p-4 h-full overflow-y-auto">
                <PollsPanel
                  className="border-0 bg-transparent p-0 shadow-none text-white"
                  polls={polls}
                  onCreatePoll={async (q, opts) => {
                    const res = await fetch('/api/polls', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        meetingId: meeting.id,
                        createdByUserId: currentUser.id,
                        question: q,
                        pollType: 'multiple_choice',
                        options: opts,
                        isActive: true,
                      }),
                    });
                    if (res.ok) {
                      loadPolls(meeting.id);
                      toast.success('Poll created');
                    }
                  }}
                  onVote={async (pollId, opt) => {
                    await fetch('/api/poll-responses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        pollId,
                        userId: currentUser.id,
                        response: { answer: opt },
                      }),
                    });
                    toast.success('Vote submitted');
                  }}
                  onClosePoll={async (pollId) => {
                    await fetch(`/api/polls?id=${pollId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isActive: false }),
                    });
                    loadPolls(meeting.id);
                  }}
                  isHost={isHost}
                />
              </div>
            )}

            {showFiles && (
              <div className="p-4 h-full overflow-y-auto">
                <FileSharing
                  className="border-0 bg-transparent p-0 shadow-none text-white"
                  files={files}
                  onUpload={handleFileUpload}
                  onDownload={(url, name) => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = name;
                    a.click();
                  }}
                  onDelete={async (id) => {
                    await fetch(`/api/meeting-files?id=${id}`, { method: 'DELETE' });
                    loadFiles(meeting.id, currentUser.id, currentUser.name);
                  }}
                  isHost={isHost}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Breakout Rooms Modal */}
      <BreakoutRoomsModal
        isOpen={showBreakout}
        isHost={isHost}
        participants={inMeetingParticipants.map((p) => ({
          id: String(p.id),
          displayName: p.displayName,
        }))}
        rooms={breakoutRooms}
        roomsActive={breakoutRoomsActive}
        currentRoomId={currentBreakoutRoomId}
        onCreateRooms={(rooms) => setBreakoutRooms(rooms)}
        onOpenRooms={() => {
          setBreakoutRoomsActive(true);
          toast.success('Breakout rooms opened');
        }}
        onCloseRooms={() => {
          setBreakoutRoomsActive(false);
          setCurrentBreakoutRoomId(null);
          toast.success('Breakout rooms closed');
        }}
        onBroadcastMessage={(msg) => {
          toast.info(`Broadcast to rooms: ${msg}`);
        }}
        onJoinRoom={(rid) => {
          setCurrentBreakoutRoomId(rid);
          toast.success(`Joined Breakout Room`);
        }}
        onLeaveBreakout={() => {
          setCurrentBreakoutRoomId(null);
          toast.success('Returned to Main Session');
        }}
        onCloseModal={() => setShowBreakout(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        audioInputs={audioInputs}
        videoInputs={videoInputs}
        audioOutputs={audioOutputs}
        selectedAudioInput={selectedAudioInput}
        selectedVideoInput={selectedVideoInput}
        selectedAudioOutput={selectedAudioOutput}
        onSelectDevice={setDevice}
        virtualBgMode={virtualBgMode}
        onSelectVirtualBg={setVirtualBackground}
        audioLevel={localAudioLevel}
      />

      {/* End / Leave Meeting Modal */}
      <EndMeetingModal
        isOpen={showEndModal}
        isHost={isHost}
        onEndForAll={handleEndMeetingForAll}
        onLeaveOnly={handleLeaveMeeting}
        onClose={() => setShowEndModal(false)}
      />

      {/* Zoom Bottom Control Deck */}
      <MeetingControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isRecording={isRecording}
        isCaptionsEnabled={isCaptionsEnabled}
        isHost={isHost}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={() => {
          if (isScreenSharing) stopScreenShare();
          else startScreenShare();
        }}
        onToggleChat={() => {
          setShowChat(!showChat);
          setShowParticipants(false);
          setShowPolls(false);
          setShowFiles(false);
          setShowTranscript(false);
        }}
        onToggleParticipants={() => {
          setShowParticipants(!showParticipants);
          setShowChat(false);
          setShowPolls(false);
          setShowFiles(false);
          setShowTranscript(false);
        }}
        onToggleHandRaise={handleToggleHandRaise}
        onToggleRecording={handleToggleRecording}
        onToggleCaptions={() => {
          setIsCaptionsEnabled((prev) => !prev);
          toast.success(!isCaptionsEnabled ? 'Closed Captions turned on' : 'Closed Captions turned off');
        }}
        onToggleSecurity={() => setShowSecurity((prev) => !prev)}
        onToggleBreakoutRooms={() => setShowBreakout(true)}
        onOpenSettings={() => setShowSettings(true)}
        onToggleFiles={() => {
          setShowFiles(!showFiles);
          setShowChat(false);
          setShowParticipants(false);
          setShowPolls(false);
          setShowTranscript(false);
        }}
        onToggleWhiteboard={() => setShowWhiteboard((prev) => !prev)}
        onTogglePolls={() => {
          setShowPolls(!showPolls);
          setShowChat(false);
          setShowParticipants(false);
          setShowFiles(false);
          setShowTranscript(false);
        }}
        onToggleReactions={() => {}}
        onReactionSelect={triggerReaction}
        onLeave={() => setShowEndModal(true)}
        participantCount={inMeetingParticipants.length}
        unreadMessages={0}
      />
    </div>
  );
}
