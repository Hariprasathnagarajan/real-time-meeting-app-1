"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Video, Users, MessageSquare, Monitor, Shield, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const createNewMeeting = () => {
    const newRoomId = generateRoomId();
    router.push(`/meeting/${newRoomId}`);
  };

  const joinMeeting = () => {
    if (roomId.trim()) {
      router.push(`/meeting/${roomId.trim()}`);
    }
  };

  const features = [
    {
      icon: Video,
      title: 'HD Video & Audio',
      description: 'Crystal clear video calls with high-quality audio',
    },
    {
      icon: Users,
      title: 'Group Meetings',
      description: 'Connect with multiple participants simultaneously',
    },
    {
      icon: Monitor,
      title: 'Screen Sharing',
      description: 'Share your screen with one click for presentations',
    },
    {
      icon: MessageSquare,
      title: 'Real-time Chat',
      description: 'Send messages during meetings without interrupting',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'End-to-end encrypted peer-to-peer connections',
    },
    {
      icon: Zap,
      title: 'Instant Connect',
      description: 'No downloads or signups required to get started',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Video className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">WebRTC-Powered Video Conferencing</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Connect Face-to-Face,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Anywhere, Anytime
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Host secure video meetings with HD quality, screen sharing, and real-time chat. 
            No downloads or account required.
          </p>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
            {/* Create Meeting Card */}
            <Card className="p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40 transition-all">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Start New Meeting</h3>
              <p className="text-gray-400 text-sm mb-6">
                Create an instant meeting room and invite others
              </p>
              <Button
                onClick={createNewMeeting}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Create Meeting
              </Button>
            </Card>

            {/* Join Meeting Card */}
            <Card className="p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Join Meeting</h3>
              <p className="text-gray-400 text-sm mb-6">
                Enter a meeting code to join an existing room
              </p>
              <div className="flex gap-2">
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && joinMeeting()}
                  placeholder="Enter room code"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <Button
                  onClick={joinMeeting}
                  disabled={!roomId.trim()}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Join
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything You Need for Seamless Collaboration
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Demo CTA */}
        <div className="max-w-4xl mx-auto mt-16 text-center">
          <Card className="p-12 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-primary/20">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Create a meeting room now and experience high-quality video conferencing 
              with powerful features built on WebRTC technology.
            </p>
            <Button
              onClick={createNewMeeting}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            >
              <Video className="w-5 h-5 mr-2" />
              Start Your First Meeting
            </Button>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>Built with Next.js, React, TypeScript, and WebRTC</p>
        </div>
      </footer>
    </div>
  );
}