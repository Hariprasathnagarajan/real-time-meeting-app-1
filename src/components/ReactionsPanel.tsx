"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThumbsUp, Heart, Laugh, Brain, HandMetal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReactionsPanelProps {
  onReaction: (type: string) => void;
  className?: string;
}

const reactions = [
  { type: 'thumbs_up', icon: ThumbsUp, label: '👍', name: 'Thumbs up', color: 'text-blue-400' },
  { type: 'heart', icon: Heart, label: '❤️', name: 'Heart', color: 'text-red-400' },
  { type: 'clap', icon: HandMetal, label: '👏', name: 'Applause', color: 'text-yellow-400' },
  { type: 'laugh', icon: Laugh, label: '😂', name: 'Laugh', color: 'text-green-400' },
  { type: 'thinking', icon: Brain, label: '🤔', name: 'Thinking', color: 'text-purple-400' },
];

export function ReactionsPanel({ onReaction, className }: ReactionsPanelProps) {
  return (
    <Card className={cn("p-3 bg-gray-900/95 border-white/10", className)}>
      <div className="flex gap-2">
        {reactions.map((reaction) => (
          <Button
            key={reaction.type}
            onClick={() => onReaction(reaction.type)}
            variant="ghost"
            size="sm"
            aria-label={`Send ${reaction.name} reaction`}
            className="text-2xl transition-transform duration-150 ease-out motion-safe:hover:scale-110"
          >
            {reaction.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}