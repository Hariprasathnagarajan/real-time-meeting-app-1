"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Users, Lock, Video, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledMeeting {
  id: number;
  title: string;
  description: string;
  meetingCode: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  isPasswordProtected: boolean;
  isWaitingRoomEnabled: boolean;
  isRecordingEnabled: boolean;
  maxParticipants: number;
  status: string;
}

export default function ScheduleMeetingPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    password: '',
    isPasswordProtected: false,
    isWaitingRoomEnabled: true,
    isRecordingEnabled: false,
    maxParticipants: 100,
  });

  useEffect(() => {
    loadScheduledMeetings();
  }, []);

  const loadScheduledMeetings = async () => {
    try {
      const response = await fetch('/api/meetings');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
      toast.error('Failed to load scheduled meetings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.scheduledStartTime) {
      toast.error('Title and start time are required');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newMeeting = await response.json();
        setMeetings(prev => [newMeeting, ...prev]);
        toast.success('Meeting scheduled successfully!');
        setShowForm(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to schedule meeting');
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast.error('Failed to schedule meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (meetingId: number) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const response = await fetch(`/api/meetings?id=${meetingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMeetings(prev => prev.filter(m => m.id !== meetingId));
        toast.success('Meeting deleted');
      }
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const handleJoinMeeting = (meetingCode: string) => {
    router.push(`/meeting/${meetingCode}`);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      scheduledStartTime: '',
      scheduledEndTime: '',
      password: '',
      isPasswordProtected: false,
      isWaitingRoomEnabled: true,
      isRecordingEnabled: false,
      maxParticipants: 100,
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-400 bg-blue-400/10';
      case 'in_progress':
        return 'text-green-400 bg-green-400/10';
      case 'completed':
        return 'text-gray-400 bg-gray-400/10';
      case 'cancelled':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Schedule Meeting</h1>
            <p className="text-gray-400">Plan and manage your upcoming meetings</p>
          </div>
          
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-5 h-5" />
              New Meeting
            </Button>
          )}
        </div>

        {/* Create Meeting Form */}
        {showForm && (
          <Card className="p-6 mb-8 bg-gray-900 border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create New Meeting</h2>
              <Button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">
                    Meeting Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Weekly Team Sync"
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants" className="text-white">
                    Max Participants
                  </Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxParticipants: parseInt(e.target.value),
                      })
                    }
                    min="2"
                    max="500"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the meeting agenda..."
                  className="bg-white/5 border-white/10 text-white min-h-24"
                />
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Start Date & Time *
                  </Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.scheduledStartTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduledStartTime: e.target.value,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    End Date & Time
                  </Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.scheduledEndTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduledEndTime: e.target.value,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Security Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Security Settings</h3>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-white font-medium">Password Protection</p>
                      <p className="text-sm text-gray-400">
                        Require password to join meeting
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isPasswordProtected}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isPasswordProtected: checked })
                    }
                  />
                </div>

                {formData.isPasswordProtected && (
                  <div className="ml-12 space-y-2">
                    <Label htmlFor="password" className="text-white">
                      Meeting Password
                    </Label>
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Enter password"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-white font-medium">Waiting Room</p>
                      <p className="text-sm text-gray-400">
                        Admit participants before joining
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isWaitingRoomEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isWaitingRoomEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-white font-medium">Auto Recording</p>
                      <p className="text-sm text-gray-400">
                        Automatically record meeting
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isRecordingEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isRecordingEnabled: checked })
                    }
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? 'Creating...' : 'Schedule Meeting'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Scheduled Meetings List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">Your Scheduled Meetings</h2>
          
          {meetings.length === 0 ? (
            <Card className="p-12 text-center bg-gray-900 border-white/10">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No scheduled meetings
              </h3>
              <p className="text-gray-400 mb-6">
                Create your first meeting to get started
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="w-5 h-5" />
                Schedule Meeting
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="p-6 bg-gray-900 border-white/10 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {meeting.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {meeting.description || 'No description'}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        meeting.status
                      )}`}
                    >
                      {meeting.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDateTime(meeting.scheduledStartTime)}
                    </div>
                    
                    {meeting.scheduledEndTime && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Clock className="w-4 h-4 text-gray-400" />
                        Ends: {formatDateTime(meeting.scheduledEndTime)}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Users className="w-4 h-4 text-gray-400" />
                      Max: {meeting.maxParticipants} participants
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Meeting Code:</span>
                      <code className="px-2 py-1 bg-white/5 rounded text-primary font-mono">
                        {meeting.meetingCode}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {meeting.isPasswordProtected && (
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Password
                      </span>
                    )}
                    {meeting.isWaitingRoomEnabled && (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Waiting Room
                      </span>
                    )}
                    {meeting.isRecordingEnabled && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        Recording
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleJoinMeeting(meeting.meetingCode)}
                      className="flex-1 bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      Join Meeting
                    </Button>
                    <Button
                      onClick={() => handleDelete(meeting.id)}
                      variant="outline"
                      size="sm"
                      className="px-3 border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}