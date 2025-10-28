"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoTile } from '@/components/VideoTile';
import { MeetingControls } from '@/components/MeetingControls';
import { ChatSidebar, ChatMessage } from '@/components/ChatSidebar';
import { ReactionsPanel } from '@/components/ReactionsPanel';
import { AdminControls } from '@/components/AdminControls';
import { PollsPanel } from '@/components/PollsPanel';
import { WaitingRoom } from '@/components/WaitingRoom';
import { FileSharing } from '@/components/FileSharing';
import { Whiteboard } from '@/components/Whiteboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Copy, Check, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Participant {
  id: string;
  displayName: string;
  role: string;
  status: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
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

interface WaitingParticipant {
  id: string;
  displayName: string;
  joinedAt: string;
}

export default function MeetingRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  const [userName] = useState(() => `User ${Math.floor(Math.random() * 1000)}`);
  const [currentUserId] = useState(() => `user_${Date.now()}`);
  const [meetingId, setMeetingId] = useState<number | null>(null);
  
  // Panel visibility states
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  
  // Feature states
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHost, setIsHost] = useState(true); // Demo: set to true
  const [copied, setCopied] = useState(false);
  
  // Data states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [whiteboardData, setWhiteboardData] = useState<string>('');

  const {
    localStream,
    participants: webrtcParticipants,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    error,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
  } = useWebRTC({ roomId, userName });

  // Initialize meeting and fetch data
  useEffect(() => {
    initializeMeeting();
  }, [roomId]);

  const initializeMeeting = async () => {
    // In a real app, you'd fetch or create the meeting here
    // For now, we'll use demo data
    setMeetingId(1);
    loadParticipants();
    loadPolls();
    loadFiles();
  };

  const loadParticipants = async () => {
    try {
      // Demo participants
      setParticipants([
        {
          id: currentUserId,
          displayName: userName,
          role: 'host',
          status: 'in_meeting',
          isAudioMuted: !isAudioEnabled,
          isVideoOff: !isVideoEnabled,
          isScreenSharing: false,
          isHandRaised: false,
        },
        {
          id: 'user_2',
          displayName: 'Alice Johnson',
          role: 'participant',
          status: 'in_meeting',
          isAudioMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          isHandRaised: false,
        },
        {
          id: 'user_3',
          displayName: 'Bob Smith',
          role: 'participant',
          status: 'in_meeting',
          isAudioMuted: false,
          isVideoOff: true,
          isScreenSharing: false,
          isHandRaised: false,
        },
      ]);

      // Demo waiting room
      setWaitingParticipants([
        {
          id: 'waiting_1',
          displayName: 'Charlie Brown',
          joinedAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const loadPolls = async () => {
    if (!meetingId) return;
    
    try {
      const response = await fetch(`/api/polls?meetingId=${meetingId}`);
      if (response.ok) {
        const data = await response.json();
        setPolls(data);
      }
    } catch (error) {
      console.error('Failed to load polls:', error);
    }
  };

  const loadFiles = async () => {
    if (!meetingId) return;
    
    try {
      const response = await fetch(`/api/meeting-files?meetingId=${meetingId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  // Meeting control handlers
  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleToggleHandRaise = async () => {
    setIsHandRaised(!isHandRaised);
    
    // Update participant state in API
    const currentParticipant = participants.find(p => p.id === currentUserId);
    if (currentParticipant) {
      try {
        await fetch(`/api/meeting-participants?id=${currentParticipant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isHandRaised: !isHandRaised }),
        });
      } catch (error) {
        console.error('Failed to update hand raise:', error);
      }
    }
  };

  const handleToggleRecording = async () => {
    if (!meetingId) return;
    
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      toast.success('Recording stopped');
    } else {
      // Start recording
      try {
        const response = await fetch('/api/meeting-recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId,
            recordingType: 'video',
            startedAt: new Date().toISOString(),
          }),
        });
        
        if (response.ok) {
          setIsRecording(true);
          toast.success('Recording started');
        }
      } catch (error) {
        console.error('Failed to start recording:', error);
        toast.error('Failed to start recording');
      }
    }
  };

  const handleLeave = () => {
    leaveMeeting();
    router.push('/');
  };

  // Chat handlers
  const handleSendMessage = (message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: userName,
      message,
      timestamp: new Date(),
      isLocal: true,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Reaction handler
  const handleReaction = async (type: string) => {
    if (!meetingId) return;
    
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          userId: currentUserId,
          reactionType: type,
        }),
      });
      toast.success(`Sent ${type} reaction!`);
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  };

  // Admin control handlers
  const handleMuteParticipant = async (participantId: string) => {
    try {
      const participant = participants.find(p => p.id === participantId);
      if (!participant) return;

      await fetch(`/api/meeting-participants?id=${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAudioMuted: !participant.isAudioMuted }),
      });

      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, isAudioMuted: !p.isAudioMuted } : p
        )
      );
      toast.success(`${participant.displayName} ${participant.isAudioMuted ? 'unmuted' : 'muted'}`);
    } catch (error) {
      console.error('Failed to mute participant:', error);
    }
  };

  const handleToggleParticipantVideo = async (participantId: string) => {
    try {
      const participant = participants.find(p => p.id === participantId);
      if (!participant) return;

      await fetch(`/api/meeting-participants?id=${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVideoOff: !participant.isVideoOff }),
      });

      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, isVideoOff: !p.isVideoOff } : p
        )
      );
      toast.success(`${participant.displayName} video ${participant.isVideoOff ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const participant = participants.find(p => p.id === participantId);
      if (!participant) return;

      await fetch(`/api/meeting-participants?id=${participantId}`, {
        method: 'DELETE',
      });

      setParticipants(prev => prev.filter(p => p.id !== participantId));
      toast.success(`${participant.displayName} removed from meeting`);
    } catch (error) {
      console.error('Failed to remove participant:', error);
    }
  };

  const handleAssignCoHost = async (participantId: string) => {
    try {
      const participant = participants.find(p => p.id === participantId);
      if (!participant) return;

      await fetch(`/api/meeting-participants?id=${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'co_host' }),
      });

      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, role: 'co_host' } : p
        )
      );
      toast.success(`${participant.displayName} is now a co-host`);
    } catch (error) {
      console.error('Failed to assign co-host:', error);
    }
  };

  // Waiting room handlers
  const handleAdmitParticipant = async (participantId: string) => {
    try {
      await fetch(`/api/meeting-participants?id=${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'admitted' }),
      });

      const admitted = waitingParticipants.find(p => p.id === participantId);
      if (admitted) {
        setWaitingParticipants(prev => prev.filter(p => p.id !== participantId));
        toast.success(`${admitted.displayName} admitted to meeting`);
      }
    } catch (error) {
      console.error('Failed to admit participant:', error);
    }
  };

  const handleRejectParticipant = async (participantId: string) => {
    try {
      await fetch(`/api/meeting-participants?id=${participantId}`, {
        method: 'DELETE',
      });

      const rejected = waitingParticipants.find(p => p.id === participantId);
      if (rejected) {
        setWaitingParticipants(prev => prev.filter(p => p.id !== participantId));
        toast.success(`${rejected.displayName} rejected`);
      }
    } catch (error) {
      console.error('Failed to reject participant:', error);
    }
  };

  const handleAdmitAll = async () => {
    for (const participant of waitingParticipants) {
      await handleAdmitParticipant(participant.id);
    }
  };

  // Poll handlers
  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!meetingId) return;
    
    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          createdByUserId: currentUserId,
          question,
          pollType: 'multiple_choice',
          options,
          isAnonymous: true,
          isActive: true,
        }),
      });

      if (response.ok) {
        const newPoll = await response.json();
        setPolls(prev => [...prev, newPoll]);
        toast.success('Poll created!');
      }
    } catch (error) {
      console.error('Failed to create poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const handleVote = async (pollId: number, response: string) => {
    try {
      await fetch('/api/poll-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId,
          userId: currentUserId,
          response: { answer: response },
        }),
      });
      toast.success('Vote submitted!');
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to submit vote');
    }
  };

  const handleClosePoll = async (pollId: number) => {
    try {
      await fetch(`/api/polls?id=${pollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });

      setPolls(prev =>
        prev.map(p => (p.id === pollId ? { ...p, isActive: false } : p))
      );
      toast.success('Poll closed');
    } catch (error) {
      console.error('Failed to close poll:', error);
    }
  };

  // File handlers
  const handleFileUpload = async (file: File) => {
    if (!meetingId) return;
    
    // In a real app, you'd upload to a storage service first
    // For demo, we'll just create a mock file entry
    const mockFile: SharedFile = {
      id: Date.now(),
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      fileSizeMb: file.size / (1024 * 1024),
      uploadedBy: userName,
      uploadedAt: new Date().toISOString(),
    };

    setFiles(prev => [...prev, mockFile]);
    toast.success(`${file.name} uploaded!`);
  };

  const handleFileDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleFileDelete = async (fileId: number) => {
    try {
      await fetch(`/api/meeting-files?id=${fileId}`, {
        method: 'DELETE',
      });

      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('File deleted');
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  // Whiteboard handler
  const handleSaveWhiteboard = async (data: string) => {
    if (!meetingId) return;
    
    setWhiteboardData(data);
    
    try {
      await fetch('/api/whiteboard-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          whiteboardData: { image: data },
          lastUpdatedByUserId: currentUserId,
        }),
      });
    } catch (error) {
      console.error('Failed to save whiteboard:', error);
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/meeting/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 bg-gray-900 border-red-500">
          <h2 className="text-xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button onClick={handleLeave} className="w-full">
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-white/10 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Meeting Room</h1>
            <p className="text-sm text-gray-400">Room ID: {roomId}</p>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <Button
                onClick={() => setShowAdminControls(!showAdminControls)}
                variant="outline"
                size="sm"
                className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Button>
            )}
            <Button
              onClick={copyRoomLink}
              variant="outline"
              size="sm"
              className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Waiting Room (if host and has waiting participants) */}
      {isHost && waitingParticipants.length > 0 && (
        <div className="container mx-auto px-4 pt-4">
          <WaitingRoom
            participants={waitingParticipants}
            onAdmit={handleAdmitParticipant}
            onReject={handleRejectParticipant}
            onAdmitAll={handleAdmitAll}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div
            className={cn(
              'grid gap-4 h-full',
              participants.length <= 1
                ? 'grid-cols-1'
                : participants.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            )}
          >
            {/* Local Stream */}
            <VideoTile
              stream={localStream}
              name={userName}
              isLocal
              audioEnabled={isAudioEnabled}
              videoEnabled={isVideoEnabled}
            />

            {/* Remote Participants */}
            <VideoTile
              stream={null}
              name="Alice Johnson"
              audioEnabled={true}
              videoEnabled={true}
            />
            <VideoTile
              stream={null}
              name="Bob Smith"
              audioEnabled={true}
              videoEnabled={false}
            />
          </div>
        </div>

        {/* Reactions Panel (floating) */}
        {showReactions && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
            <ReactionsPanel onReaction={handleReaction} />
          </div>
        )}

        {/* Right Sidebar - Dynamic Content */}
        {(showChat || showParticipants || showAdminControls || showPolls || showFiles || showWhiteboard) && (
          <div className="w-96 bg-gray-900 border-l border-white/10 overflow-auto">
            {showChat && (
              <ChatSidebar
                messages={messages}
                onSendMessage={handleSendMessage}
                onClose={() => setShowChat(false)}
              />
            )}

            {showParticipants && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participants ({participants.length})
                  </h3>
                  <Button
                    onClick={() => setShowParticipants(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                  >
                    Close
                  </Button>
                </div>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                        {participant.displayName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {participant.displayName}
                          {participant.id === currentUserId && ' (You)'}
                        </p>
                        <p className="text-xs text-gray-400">{participant.role}</p>
                      </div>
                      {participant.isHandRaised && (
                        <span className="text-yellow-400">✋</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAdminControls && isHost && (
              <div className="p-4">
                <AdminControls
                  participants={participants}
                  currentUserId={currentUserId}
                  onMuteParticipant={handleMuteParticipant}
                  onToggleVideo={handleToggleParticipantVideo}
                  onRemoveParticipant={handleRemoveParticipant}
                  onAssignCoHost={handleAssignCoHost}
                />
              </div>
            )}

            {showPolls && (
              <div className="p-4">
                <PollsPanel
                  polls={polls}
                  onCreatePoll={handleCreatePoll}
                  onVote={handleVote}
                  onClosePoll={handleClosePoll}
                  isHost={isHost}
                />
              </div>
            )}

            {showFiles && (
              <div className="p-4">
                <FileSharing
                  files={files}
                  onUpload={handleFileUpload}
                  onDownload={handleFileDownload}
                  onDelete={handleFileDelete}
                  isHost={isHost}
                />
              </div>
            )}

            {showWhiteboard && (
              <div className="p-4">
                <Whiteboard
                  onSave={handleSaveWhiteboard}
                  initialData={whiteboardData}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meeting Controls */}
      <MeetingControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isRecording={isRecording}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={() => {
          setShowChat(!showChat);
          setShowParticipants(false);
          setShowAdminControls(false);
          setShowPolls(false);
          setShowFiles(false);
          setShowWhiteboard(false);
        }}
        onToggleParticipants={() => {
          setShowParticipants(!showParticipants);
          setShowChat(false);
          setShowAdminControls(false);
          setShowPolls(false);
          setShowFiles(false);
          setShowWhiteboard(false);
        }}
        onToggleHandRaise={handleToggleHandRaise}
        onToggleRecording={handleToggleRecording}
        onToggleFiles={() => {
          setShowFiles(!showFiles);
          setShowChat(false);
          setShowParticipants(false);
          setShowAdminControls(false);
          setShowPolls(false);
          setShowWhiteboard(false);
        }}
        onToggleWhiteboard={() => {
          setShowWhiteboard(!showWhiteboard);
          setShowChat(false);
          setShowParticipants(false);
          setShowAdminControls(false);
          setShowPolls(false);
          setShowFiles(false);
        }}
        onTogglePolls={() => {
          setShowPolls(!showPolls);
          setShowChat(false);
          setShowParticipants(false);
          setShowAdminControls(false);
          setShowFiles(false);
          setShowWhiteboard(false);
        }}
        onToggleReactions={() => setShowReactions(!showReactions)}
        onLeave={handleLeave}
        participantCount={participants.length}
        unreadMessages={0}
      />
    </div>
  );
}