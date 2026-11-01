"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Poll {
  id: number;
  question: string;
  pollType: string;
  options: string[];
  isActive: boolean;
  responses?: { [key: string]: number };
}

interface PollsPanelProps {
  polls: Poll[];
  onCreatePoll: (question: string, options: string[]) => void;
  onVote: (pollId: number, response: string) => void;
  onClosePoll: (pollId: number) => void;
  isHost: boolean;
  className?: string;
}

export function PollsPanel({
  polls,
  onCreatePoll,
  onVote,
  onClosePoll,
  isHost,
  className,
}: PollsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleCreatePoll = () => {
    const validOptions = options.filter(opt => opt.trim());
    if (question.trim() && validOptions.length >= 2) {
      onCreatePoll(question, validOptions);
      setQuestion('');
      setOptions(['', '']);
      setShowCreateForm(false);
    }
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <Card className={cn("p-4 bg-gray-900 border-white/10", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Polls
        </h3>
        {isHost && !showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Poll
          </Button>
        )}
      </div>

      {showCreateForm && isHost && (
        <Card className="p-4 mb-4 bg-white/5 border-white/10">
          <div className="space-y-3">
            <div>
              <Label htmlFor="poll-question" className="text-white">Question</Label>
              <Input
                id="poll-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What's your question?"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Options</Label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                  />
                  {options.length > 2 && (
                    <Button
                      onClick={() => removeOption(index)}
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove option ${index + 1}`}
                      className="h-10 w-10 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={addOption}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreatePoll} className="flex-1">
                Create Poll
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {polls.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No polls yet</p>
        ) : (
          polls.map((poll) => (
            <Card key={poll.id} className="p-4 bg-white/5 border-white/10">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-white font-medium">{poll.question}</h4>
                {isHost && poll.isActive && (
                  <Button
                    onClick={() => onClosePoll(poll.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    Close
                  </Button>
                )}
              </div>

              {poll.isActive ? (
                <RadioGroup onValueChange={(value) => onVote(poll.id, value)}>
                  <div className="space-y-2">
                    {poll.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${poll.id}-${index}`} />
                        <Label
                          htmlFor={`${poll.id}-${index}`}
                          className="text-white cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {poll.options.map((option, index) => {
                    const totalVotes = Object.values(poll.responses || {}).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const votes = poll.responses?.[option] || 0;
                    const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                    return (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white">{option}</span>
                          <span className="text-gray-400 tabular-nums">
                            {votes} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </Card>
  );
}