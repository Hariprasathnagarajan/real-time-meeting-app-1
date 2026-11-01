"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneOff, LogOut, Star, X, Check } from 'lucide-react';

interface EndMeetingModalProps {
  isOpen: boolean;
  isHost: boolean;
  onEndForAll: () => void;
  onLeaveOnly: () => void;
  onClose: () => void;
}

export function EndMeetingModal({
  isOpen,
  isHost,
  onEndForAll,
  onLeaveOnly,
  onClose,
}: EndMeetingModalProps) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [submittedRating, setSubmittedRating] = useState(false);

  if (!isOpen) return null;

  if (showRating) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-900 border border-white/10 shadow-2xl rounded-2xl p-6 text-white text-center space-y-5">
          {!submittedRating ? (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">How was your meeting?</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Rate the audio and video quality of this session
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-yellow-400 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${star <= rating ? 'fill-current' : 'text-gray-600'}`}
                    />
                  </button>
                ))}
              </div>

              <Button
                onClick={() => {
                  setSubmittedRating(true);
                  setTimeout(() => {
                    onLeaveOnly();
                  }, 1200);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 font-semibold h-10"
              >
                Submit Feedback
              </Button>
            </>
          ) : (
            <div className="py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Thank you!</h3>
              <p className="text-xs text-gray-400">Leaving meeting room...</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gray-900 border border-white/10 shadow-2xl rounded-2xl p-6 text-white space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white">
            {isHost ? 'End or Leave Meeting' : 'Leave Meeting'}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          {isHost
            ? 'You are the host of this meeting. You can end the meeting for everyone or leave and let the session continue.'
            : 'Are you sure you want to leave this meeting?'}
        </p>

        <div className="flex flex-col gap-2.5">
          {isHost && (
            <Button
              onClick={onEndForAll}
              variant="destructive"
              className="w-full h-11 font-semibold text-xs gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="w-4 h-4" />
              End Meeting for All
            </Button>
          )}

          <Button
            onClick={() => setShowRating(true)}
            variant="outline"
            className="w-full h-11 font-semibold text-xs gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            <LogOut className="w-4 h-4" />
            Leave Meeting
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full h-9 text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
