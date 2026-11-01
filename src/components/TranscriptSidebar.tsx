"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Search, X } from 'lucide-react';
import type { CaptionEntry } from '@/components/LiveCaptions';
import { toast } from 'sonner';

interface TranscriptSidebarProps {
  entries: CaptionEntry[];
  meetingTitle: string;
  onClose: () => void;
}

export function TranscriptSidebar({
  entries,
  meetingTitle,
  onClose,
}: TranscriptSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = entries.filter(
    (e) =>
      e.senderName.toLowerCase().includes(search.toLowerCase()) ||
      e.text.toLowerCase().includes(search.toLowerCase())
  );

  const exportTranscript = () => {
    if (entries.length === 0) {
      toast.error('No transcript recorded yet');
      return;
    }

    const content = entries
      .map((e) => `[${e.timestamp}] ${e.senderName}: ${e.text}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meetingTitle.replace(/\s+/g, '_')}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript exported!');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-white/10 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Live Transcript</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={exportTranscript}
            variant="ghost"
            size="icon"
            title="Download Transcript"
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcript..."
            className="pl-9 bg-white/5 border-white/10 text-xs h-9 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Transcript list */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-xs">
                {entries.length === 0
                  ? 'Speak with Closed Captions enabled to view live transcript here.'
                  : 'No matching entries found.'}
              </div>
            ) : (
              filtered.map((entry) => (
                <div key={entry.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400">
                      {entry.senderName}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed bg-white/5 p-2 rounded-lg">
                    {entry.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
