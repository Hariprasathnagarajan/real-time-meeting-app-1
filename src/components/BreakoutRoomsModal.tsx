"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Grid,
  Plus,
  Play,
  Square,
  Radio,
  Send,
  X,
  Users,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export interface BreakoutRoomItem {
  id: number | string;
  name: string;
  assignedParticipantIds: string[];
}

interface ParticipantOption {
  id: string;
  displayName: string;
}

interface BreakoutRoomsModalProps {
  isOpen: boolean;
  isHost: boolean;
  participants: ParticipantOption[];
  rooms: BreakoutRoomItem[];
  roomsActive: boolean;
  currentRoomId?: string | number | null;
  onCreateRooms: (rooms: BreakoutRoomItem[]) => void;
  onOpenRooms: () => void;
  onCloseRooms: () => void;
  onBroadcastMessage: (message: string) => void;
  onJoinRoom: (roomId: string | number) => void;
  onLeaveBreakout: () => void;
  onCloseModal: () => void;
}

export function BreakoutRoomsModal({
  isOpen,
  isHost,
  participants,
  rooms,
  roomsActive,
  currentRoomId,
  onCreateRooms,
  onOpenRooms,
  onCloseRooms,
  onBroadcastMessage,
  onJoinRoom,
  onLeaveBreakout,
  onCloseModal,
}: BreakoutRoomsModalProps) {
  const [roomCount, setRoomCount] = useState<number>(2);
  const [broadcastText, setBroadcastText] = useState('');
  const [customRooms, setCustomRooms] = useState<BreakoutRoomItem[]>(
    rooms.length > 0
      ? rooms
      : [
          { id: '1', name: 'Room 1', assignedParticipantIds: [] },
          { id: '2', name: 'Room 2', assignedParticipantIds: [] },
        ]
  );

  if (!isOpen) return null;

  const handleGenerateRooms = () => {
    const count = Math.max(1, Math.min(10, roomCount));
    const newRooms: BreakoutRoomItem[] = [];

    // Automatically distribute participants evenly
    for (let i = 1; i <= count; i++) {
      newRooms.push({
        id: String(i),
        name: `Breakout Room ${i}`,
        assignedParticipantIds: [],
      });
    }

    participants.forEach((p, index) => {
      const roomIndex = index % count;
      newRooms[roomIndex].assignedParticipantIds.push(p.id);
    });

    setCustomRooms(newRooms);
    onCreateRooms(newRooms);
    toast.success(`Created ${count} breakout rooms with auto-assigned participants`);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    onBroadcastMessage(broadcastText.trim());
    setBroadcastText('');
    toast.success('Message broadcasted to all breakout rooms!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-xl w-full bg-gray-900 border border-white/10 shadow-2xl rounded-2xl p-6 text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Breakout Rooms</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseModal}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Host Setup section when rooms not active */}
          {isHost && !roomsActive && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-200">Create Breakout Rooms</h3>
              <div className="flex items-center gap-3">
                <Label htmlFor="room-count" className="text-xs text-gray-300">
                  Assign participants into:
                </Label>
                <Input
                  id="room-count"
                  type="number"
                  min="1"
                  max="10"
                  value={roomCount}
                  onChange={(e) => setRoomCount(parseInt(e.target.value) || 2)}
                  className="w-20 bg-gray-800 border-white/10 text-white h-9 text-center"
                />
                <span className="text-xs text-gray-400">rooms automatically</span>
                <Button
                  onClick={handleGenerateRooms}
                  size="sm"
                  className="ml-auto bg-blue-600 hover:bg-blue-500 text-xs"
                >
                  Create
                </Button>
              </div>
            </div>
          )}

          {/* Rooms List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Rooms ({customRooms.length})
            </h3>
            {customRooms.map((room) => {
              const assigned = participants.filter((p) =>
                room.assignedParticipantIds.includes(p.id)
              );
              const isCurrent = currentRoomId === room.id;

              return (
                <div
                  key={room.id}
                  className={`p-3 rounded-xl border transition-colors ${
                    isCurrent
                      ? 'bg-blue-600/10 border-blue-500/40'
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        {room.name}
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">
                            Current
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {assigned.length > 0
                          ? assigned.map((p) => p.displayName).join(', ')
                          : 'No participants assigned'}
                      </p>
                    </div>

                    {roomsActive && !isCurrent && (
                      <Button
                        size="sm"
                        onClick={() => onJoinRoom(room.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-xs h-7"
                      >
                        Join
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Broadcast Message to All Rooms (when active) */}
          {isHost && roomsActive && (
            <form onSubmit={handleBroadcast} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
              <Label className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                Broadcast Message to All Breakout Rooms
              </Label>
              <div className="flex gap-2">
                <Input
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="e.g. 2 minutes remaining..."
                  className="bg-gray-800 border-white/10 text-white text-xs h-9"
                />
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 h-9 px-3">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          {currentRoomId && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLeaveBreakout}
              className="text-xs text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
            >
              Return to Main Session
            </Button>
          )}

          {isHost && (
            <div className="flex items-center gap-2 ml-auto">
              {!roomsActive ? (
                <Button
                  onClick={onOpenRooms}
                  disabled={customRooms.length === 0}
                  className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold h-9 px-4 gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Open All Rooms
                </Button>
              ) : (
                <Button
                  onClick={onCloseRooms}
                  variant="destructive"
                  className="text-xs font-semibold h-9 px-4 gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Close All Rooms
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
