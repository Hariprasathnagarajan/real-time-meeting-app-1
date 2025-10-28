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
  { type: 'thumbs_up', icon: ThumbsUp, label: '👍', color: 'text-blue-400' },
  { type: 'heart', icon: Heart, label: '❤️', color: 'text-red-400' },
  { type: 'clap', icon: HandMetal, label: '👏', color: 'text-yellow-400' },
  { type: 'laugh', icon: Laugh, label: '😂', color: 'text-green-400' },
  { type: 'thinking', icon: Brain, label: '🤔', color: 'text-purple-400' },
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
            className="text-2xl hover:scale-125 transition-transform"
          >
            {reaction.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}