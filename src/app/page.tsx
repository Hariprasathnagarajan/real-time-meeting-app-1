"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Video,
  Users,
  Calendar,
  Monitor,
  Plus,
  Play,
  Copy,
  Check,
  Clock,
  Lock,
  Download,
  Film,
  PenTool,
  Settings,
  Shield,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledMeeting {
  id: number;
  title: string;
  description: string | null;
  meetingCode: string;
  password?: string | null;
  scheduledStartTime: string;
  scheduledEndTime?: string | null;
  isPasswordProtected: boolean;
  isWaitingRoomEnabled: boolean;
  isRecordingEnabled: boolean;
  status: string;
}

interface RecordingItem {
  id: number;
  meetingId: number;
  fileUrl: string;
  fileSizeMb: number;
  durationMinutes: number;
  startedAt: string;
  recordingType: string;
}

export default function Home() {
  const router = useRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'home' | 'meetings' | 'recordings'>('home');

  // Input states
  const [roomId, setRoomId] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [startWithVideo, setStartWithVideo] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Time display
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string } | null>(null);

  // Schedule form state
  const [scheduleData, setScheduleData] = useState({
    title: '',
    description: '',
    scheduledStartTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    password: '',
    isPasswordProtected: false,
    isWaitingRoomEnabled: true,
  });

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial profile & meetings
  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/me');
        if (meRes.ok) {
          const user = await meRes.json();
          setUserProfile(user);
        }

        const meetingsRes = await fetch('/api/meetings');
        if (meetingsRes.ok) {
          const m = await meetingsRes.json();
          setMeetings(m);
        }

        const recRes = await fetch('/api/meeting-recordings');
        if (recRes.ok) {
          const r = await recRes.json();
          setRecordings(r);
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      }
    }

    loadData();
  }, []);

  const createInstantMeeting = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${userProfile?.name || 'Personal'}'s Meeting`,
          scheduledStartTime: new Date().toISOString(),
          isWaitingRoomEnabled: false,
        }),
      });

      if (!response.ok) {
        toast.error('Failed to create instant meeting');
        return;
      }

      const meeting = await response.json();
      router.push(`/meeting/${meeting.meetingCode}`);
    } catch (error) {
      toast.error('Failed to create instant meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!roomId.trim()) {
      toast.error('Please enter a valid Meeting ID');
      return;
    }
    router.push(`/meeting/${roomId.trim().replace(/\s+/g, '')}`);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleData.title.trim()) {
      toast.error('Please enter a meeting topic');
      return;
    }

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scheduleData.title.trim(),
          description: scheduleData.description.trim() || null,
          scheduledStartTime: new Date(scheduleData.scheduledStartTime).toISOString(),
          password: scheduleData.password.trim() || null,
          isPasswordProtected: Boolean(scheduleData.password.trim()),
          isWaitingRoomEnabled: scheduleData.isWaitingRoomEnabled,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setMeetings((prev) => [created, ...prev]);
        setShowScheduleModal(false);
        toast.success('Meeting scheduled successfully!');
      } else {
        toast.error('Failed to schedule meeting');
      }
    } catch (err) {
      toast.error('Failed to schedule meeting');
    }
  };

  const copyInvitation = (m: ScheduledMeeting) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteText = `Topic: ${m.title}
Time: ${new Date(m.scheduledStartTime).toLocaleString()}

Join Zoom Meeting
${origin}/meeting/${m.meetingCode}

Meeting ID: ${m.meetingCode}
${m.password ? `Passcode: ${m.password}` : ''}`;

    navigator.clipboard.writeText(inviteText);
    setCopiedId(m.meetingCode);
    toast.success('Zoom invitation copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const upcomingMeetings = meetings.filter((m) => m.status !== 'completed');

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col select-none">
      {/* Top Zoom Global Header */}
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          {/* Zoom Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-600/30">
              Z
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              zoom
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'home'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('meetings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'meetings'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Meetings ({upcomingMeetings.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('recordings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'recordings'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Recordings ({recordings.length})
            </button>
          </nav>
        </div>

        {/* User Identity Chip */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center font-bold text-[10px] text-white">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <span className="font-medium text-gray-200">{userProfile?.name || 'Local User'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" title="Online" />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left 4 Actions: New Meeting, Join, Schedule, Share Screen */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                  Welcome to Zoom
                </h2>
                <p className="text-sm text-gray-400">
                  Connect face-to-face with high-definition video, audio, screen sharing, and real-time collaboration.
                </p>
              </div>

              {/* 4 Action Grid (Signature Zoom Desktop Style) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. New Meeting (Orange) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={createInstantMeeting}
                    disabled={isCreating}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 transform transition hover:scale-105 active:scale-95"
                  >
                    <Video className="w-9 h-9" />
                  </button>
                  <span className="mt-2.5 text-xs font-semibold text-gray-200">
                    {isCreating ? 'Starting...' : 'New Meeting'}
                  </span>
                </div>

                {/* 2. Join (Blue) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(true)}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 transform transition hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-9 h-9" />
                  </button>
                  <span className="mt-2.5 text-xs font-semibold text-gray-200">
                    Join
                  </span>
                </div>

                {/* 3. Schedule (Blue) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-600/25 transform transition hover:scale-105 active:scale-95"
                  >
                    <Calendar className="w-9 h-9" />
                  </button>
                  <span className="mt-2.5 text-xs font-semibold text-gray-200">
                    Schedule
                  </span>
                </div>

                {/* 4. Share Screen (Green) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!roomId.trim()) {
                        setShowJoinModal(true);
                      } else {
                        handleJoin();
                      }
                    }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 transform transition hover:scale-105 active:scale-95"
                  >
                    <Monitor className="w-9 h-9" />
                  </button>
                  <span className="mt-2.5 text-xs font-semibold text-gray-200">
                    Share Screen
                  </span>
                </div>
              </div>

              {/* Quick Join Bar */}
              <Card className="p-4 bg-gray-900/60 border border-white/10 rounded-2xl backdrop-blur-md">
                <form onSubmit={handleJoin} className="flex gap-2">
                  <Input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter Meeting ID or Personal Link Name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-11 text-xs"
                  />
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 h-11 text-xs shrink-0"
                  >
                    Join
                  </Button>
                </form>
              </Card>

              {/* Features summary row */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <Video className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                  <h4 className="text-xs font-bold text-white">HD Video & Audio</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Ultra clear calling</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <Users className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
                  <h4 className="text-xs font-bold text-white">Breakout Rooms</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Split groups easily</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <PenTool className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <h4 className="text-xs font-bold text-white">Whiteboard</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Collaborative canvas</p>
                </div>
              </div>
            </div>

            {/* Right: Zoom Date / Clock & Next Meeting Card */}
            <div className="lg:col-span-5 space-y-6">
              {/* Zoom Live Date / Clock Card */}
              <Card className="p-6 bg-gradient-to-br from-blue-900/30 via-gray-900/80 to-purple-900/30 border border-white/10 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="space-y-1">
                  <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </h3>
                  <p className="text-sm font-medium text-gray-300">
                    {currentTime.toLocaleDateString([], {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </Card>

              {/* Upcoming Meetings widget */}
              <Card className="p-5 bg-gray-900/80 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Upcoming Meetings
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('meetings')}
                    className="text-xs text-blue-400 hover:text-blue-300 h-7 px-2 hover:bg-blue-500/10"
                  >
                    View All
                  </Button>
                </div>

                {upcomingMeetings.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    No upcoming meetings today. Click "Schedule" to create one!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingMeetings.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white line-clamp-1">{m.title}</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(m.scheduledStartTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded font-semibold border border-blue-500/30">
                            ID: {m.meetingCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => router.push(`/meeting/${m.meetingCode}`)}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs h-8 font-semibold gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyInvitation(m)}
                            className="text-xs h-8 border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
                          >
                            {copiedId === m.meetingCode ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-blue-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* MEETINGS TAB */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Scheduled Meetings</h2>
                <p className="text-xs text-gray-400">Manage, launch, or invite guests to meetings</p>
              </div>
              <Button
                onClick={() => setShowScheduleModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold gap-1.5 h-9"
              >
                <Plus className="w-4 h-4" />
                Schedule Meeting
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {meetings.map((m) => (
                <Card
                  key={m.id}
                  className="p-5 bg-gray-900 border border-white/10 rounded-2xl space-y-4 hover:border-white/20 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{m.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(m.scheduledStartTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {m.isPasswordProtected && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-semibold border border-yellow-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Passcode
                      </span>
                    )}
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Meeting ID:</span>
                      <span className="font-mono font-semibold text-white">{m.meetingCode}</span>
                    </div>
                    {m.password && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Passcode:</span>
                        <span className="font-mono text-white">{m.password}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => router.push(`/meeting/${m.meetingCode}`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs h-9 font-semibold gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Meeting
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => copyInvitation(m)}
                      className="text-xs h-9 border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 gap-1.5"
                    >
                      {copiedId === m.meetingCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-blue-400" />
                          Copy Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* RECORDINGS TAB */}
        {activeTab === 'recordings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Meeting Recordings</h2>
              <p className="text-xs text-gray-400">View and download your recorded meetings</p>
            </div>

            {recordings.length === 0 ? (
              <Card className="p-12 text-center bg-gray-900 border border-white/10 rounded-2xl">
                <Film className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No recordings yet</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Start a meeting and click "Record" to save meeting video sessions here.
                </p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {recordings.map((rec) => (
                  <Card
                    key={rec.id}
                    className="p-5 bg-gray-900 border border-white/10 rounded-2xl space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
                          <Film className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Meeting Recording #{rec.id}</h4>
                          <p className="text-[11px] text-gray-400">
                            {new Date(rec.startedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">
                        {rec.fileSizeMb.toFixed(1)} MB
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = rec.fileUrl;
                          a.download = `Recording_${rec.id}.webm`;
                          a.click();
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs h-9 gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Video
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* JOIN MEETING MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-gray-900 border border-white/10 shadow-2xl rounded-2xl p-6 text-white space-y-5">
            <h3 className="text-lg font-bold text-white">Join Meeting</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="join-id" className="text-xs text-gray-300">
                  Meeting ID or Personal Link Name
                </Label>
                <Input
                  id="join-id"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g. ABC123XYZ"
                  className="mt-1 bg-white/5 border-white/10 text-white h-10 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="join-pass" className="text-xs text-gray-300">
                  Meeting Passcode (if required)
                </Label>
                <Input
                  id="join-pass"
                  type="password"
                  value={joinPasscode}
                  onChange={(e) => setJoinPasscode(e.target.value)}
                  placeholder="Passcode"
                  className="mt-1 bg-white/5 border-white/10 text-white h-10 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <Button
                variant="ghost"
                onClick={() => setShowJoinModal(false)}
                className="flex-1 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowJoinModal(false);
                  handleJoin();
                }}
                disabled={!roomId.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs font-semibold h-10"
              >
                Join
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SCHEDULE MEETING MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-gray-900 border border-white/10 shadow-2xl rounded-2xl p-6 text-white space-y-5">
            <h3 className="text-lg font-bold text-white">Schedule Meeting</h3>
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <Label htmlFor="sched-title" className="text-xs text-gray-300">
                  Meeting Topic
                </Label>
                <Input
                  id="sched-title"
                  value={scheduleData.title}
                  onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                  placeholder="e.g. Weekly Team Sync"
                  required
                  className="mt-1 bg-white/5 border-white/10 text-white h-10 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="sched-time" className="text-xs text-gray-300">
                  Start Time
                </Label>
                <Input
                  id="sched-time"
                  type="datetime-local"
                  value={scheduleData.scheduledStartTime}
                  onChange={(e) => setScheduleData({ ...scheduleData, scheduledStartTime: e.target.value })}
                  className="mt-1 bg-white/5 border-white/10 text-white h-10 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="sched-pass" className="text-xs text-gray-300">
                  Passcode (Optional)
                </Label>
                <Input
                  id="sched-pass"
                  value={scheduleData.password}
                  onChange={(e) => setScheduleData({ ...scheduleData, password: e.target.value })}
                  placeholder="Set meeting password"
                  className="mt-1 bg-white/5 border-white/10 text-white h-10 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="sched-wait" className="text-xs text-gray-300 cursor-pointer">
                  Enable Waiting Room
                </Label>
                <Switch
                  id="sched-wait"
                  checked={scheduleData.isWaitingRoomEnabled}
                  onCheckedChange={(val) => setScheduleData({ ...scheduleData, isWaitingRoomEnabled: val })}
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs font-semibold h-10"
                >
                  Save Schedule
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
