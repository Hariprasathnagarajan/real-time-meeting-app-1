"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FloatingReactionItem {
  id: string;
  emoji: string;
  senderName: string;
  xOffset: number; // percentage across screen width
}

interface FloatingReactionsProps {
  reactions: FloatingReactionItem[];
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: '90vh', scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: '20vh',
              scale: [0.6, 1.3, 1.1, 0.9],
              x: `${r.xOffset}vw`,
            }}
            transition={{
              duration: 3.5,
              ease: 'easeOut',
            }}
            className="absolute bottom-0 flex flex-col items-center select-none"
          >
            <span className="text-4xl md:text-5xl drop-shadow-lg filter">
              {r.emoji}
            </span>
            <span className="mt-1 px-2 py-0.5 rounded-full bg-black/60 text-[11px] font-medium text-white backdrop-blur-sm border border-white/10">
              {r.senderName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
