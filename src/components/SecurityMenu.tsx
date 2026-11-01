"use client";

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Lock,
  Users,
  Monitor,
  MessageSquare,
  Edit2,
  Mic,
  Video,
  AlertTriangle,
  X,
} from 'lucide-react';

interface SecuritySettings {
  isLocked: boolean;
  isWaitingRoomEnabled: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowRename: boolean;
  allowUnmute: boolean;
  allowVideo: boolean;
}

interface SecurityMenuProps {
  settings: SecuritySettings;
  onUpdateSetting: (key: keyof SecuritySettings, value: boolean) => void;
  onSuspendAll: () => void;
  onClose: () => void;
}

export function SecurityMenu({
  settings,
  onUpdateSetting,
  onSuspendAll,
  onClose,
}: SecurityMenuProps) {
  return (
    <Card className="absolute bottom-20 left-4 z-50 w-80 bg-gray-900 border border-white/10 shadow-2xl rounded-xl p-4 text-white backdrop-blur-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Security Controls</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4 pt-3 text-xs">
        {/* Meeting Locks */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="lock-meeting" className="flex items-center gap-2 text-gray-200 cursor-pointer">
              <Lock className="w-4 h-4 text-gray-400" />
              Lock Meeting
            </Label>
            <Switch
              id="lock-meeting"
              checked={settings.isLocked}
              onCheckedChange={(val) => onUpdateSetting('isLocked', val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="waiting-room" className="flex items-center gap-2 text-gray-200 cursor-pointer">
              <Users className="w-4 h-4 text-gray-400" />
              Enable Waiting Room
            </Label>
            <Switch
              id="waiting-room"
              checked={settings.isWaitingRoomEnabled}
              onCheckedChange={(val) => onUpdateSetting('isWaitingRoomEnabled', val)}
            />
          </div>
        </div>

        <div className="border-t border-white/10 pt-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Allow participants to:
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-share" className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <Monitor className="w-3.5 h-3.5 text-gray-400" />
                Share Screen
              </Label>
              <Switch
                id="allow-share"
                checked={settings.allowScreenShare}
                onCheckedChange={(val) => onUpdateSetting('allowScreenShare', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow-chat" className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                Chat
              </Label>
              <Switch
                id="allow-chat"
                checked={settings.allowChat}
                onCheckedChange={(val) => onUpdateSetting('allowChat', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow-rename" className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                Rename Themselves
              </Label>
              <Switch
                id="allow-rename"
                checked={settings.allowRename}
                onCheckedChange={(val) => onUpdateSetting('allowRename', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow-unmute" className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <Mic className="w-3.5 h-3.5 text-gray-400" />
                Unmute Themselves
              </Label>
              <Switch
                id="allow-unmute"
                checked={settings.allowUnmute}
                onCheckedChange={(val) => onUpdateSetting('allowUnmute', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow-video" className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <Video className="w-3.5 h-3.5 text-gray-400" />
                Start Video
              </Label>
              <Switch
                id="allow-video"
                checked={settings.allowVideo}
                onCheckedChange={(val) => onUpdateSetting('allowVideo', val)}
              />
            </div>
          </div>
        </div>

        {/* Emergency Lock down */}
        <div className="border-t border-white/10 pt-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={onSuspendAll}
            className="w-full text-xs h-8 bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            Suspend Participant Activities
          </Button>
        </div>
      </div>
    </Card>
  );
}
