"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CaptionEntry {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
}

interface LiveCaptionsProps {
  isEnabled: boolean;
  activeCaption: CaptionEntry | null;
  onNewLocalCaption: (text: string) => void;
  isAudioEnabled: boolean;
}

export function LiveCaptions({
  isEnabled,
  activeCaption,
  onNewLocalCaption,
  isAudioEnabled,
}: LiveCaptionsProps) {
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition when CC is enabled and mic is on
  useEffect(() => {
    if (!isEnabled || !isAudioEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          onNewLocalCaption(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still enabled
        if (isEnabled && isAudioEnabled) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition failed to start:', err);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [isEnabled, isAudioEnabled, onNewLocalCaption]);

  if (!isEnabled || !activeCaption) return null;

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none max-w-2xl w-full px-4 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCaption.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="inline-block bg-black/80 backdrop-blur-md px-6 py-2.5 rounded-xl border border-white/10 shadow-2xl"
        >
          <span className="text-blue-400 font-semibold text-xs mr-2">
            {activeCaption.senderName}:
          </span>
          <span className="text-white text-sm font-medium tracking-wide">
            {activeCaption.text}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
