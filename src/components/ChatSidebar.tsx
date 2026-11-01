"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Paperclip, Download, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  isLocal?: boolean;
  recipientUserId?: string | null;
  recipientName?: string | null;
  fileUrl?: string;
  fileName?: string;
}

export interface ChatParticipantOption {
  userId: string;
  displayName: string;
}

interface ChatSidebarProps {
  messages: ChatMessage[];
  participants?: ChatParticipantOption[];
  currentUserId?: string;
  onSendMessage: (message: string, recipient?: { userId: string; name: string }) => void;
  onUploadFile?: (file: File) => void;
  onClose: () => void;
  className?: string;
}

export function ChatSidebar({
  messages,
  participants = [],
  currentUserId,
  onSendMessage,
  onUploadFile,
  onClose,
  className,
}: ChatSidebarProps) {
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<string>('everyone');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    if (recipient === 'everyone') {
      onSendMessage(message.trim());
    } else {
      const selected = participants.find((p) => p.userId === recipient);
      if (selected) {
        onSendMessage(message.trim(), {
          userId: selected.userId,
          name: selected.displayName,
        });
      } else {
        onSendMessage(message.trim());
      }
    }
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveChatHistory = () => {
    if (messages.length === 0) {
      toast.error('No chat messages to save');
      return;
    }

    const lines = messages.map((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      const direct = m.recipientName ? ` (to ${m.recipientName})` : '';
      return `[${time}] ${m.sender}${direct}: ${m.message}`;
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting_chat_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Chat saved as text file!');
  };

  const otherParticipants = participants.filter((p) => p.userId !== currentUserId);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gray-900 border-l border-white/10 text-white',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <h3 className="text-base font-semibold text-white">Meeting Chat</h3>
        <div className="flex items-center gap-1">
          <Button
            onClick={saveChatHistory}
            variant="ghost"
            size="icon"
            title="Save Chat"
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

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1">
        <ScrollArea className="h-full p-4">
          <div className="space-y-3.5">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-xs">
                No messages yet. Send a message to everyone or direct message a participant!
              </div>
            ) : (
              messages.map((msg) => {
                const isDirect = Boolean(msg.recipientUserId);

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col gap-1',
                      msg.isLocal ? 'items-end' : 'items-start'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-semibold text-gray-300">
                        {msg.sender}
                      </span>
                      {isDirect && (
                        <span className="inline-flex items-center gap-0.5 text-purple-400 font-medium">
                          <Lock className="w-2.5 h-2.5" />
                          (Direct Message)
                        </span>
                      )}
                      <span className="text-gray-500 text-[10px] tabular-nums">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={cn(
                        'max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-sm',
                        isDirect
                          ? msg.isLocal
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-950/80 border border-purple-500/30 text-purple-100'
                          : msg.isLocal
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-gray-100'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Recipient Selector & Input */}
      <div className="p-3 border-t border-white/10 bg-gray-950/40 space-y-2 shrink-0">
        {/* "To:" Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium text-[11px]">To:</span>
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="flex-1 bg-gray-800 border border-white/10 rounded-md p-1.5 text-xs text-white outline-none focus:border-blue-500"
          >
            <option value="everyone">Everyone (Meeting)</option>
            {otherParticipants.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.displayName} (Direct Message)
              </option>
            ))}
          </select>
        </div>

        {/* Input & Action Buttons */}
        <div className="flex items-center gap-2">
          {onUploadFile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file to chat"
                className="h-10 w-10 text-gray-400 hover:text-white hover:bg-white/10 shrink-0 rounded-lg"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </>
          )}

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              recipient === 'everyone'
                ? 'Type message to everyone...'
                : 'Type direct message...'
            }
            className="h-10 flex-1 bg-white/5 border-white/10 text-white text-xs placeholder:text-gray-500 rounded-lg focus:ring-1 focus:ring-blue-500"
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            size="icon"
            className="h-10 w-10 bg-blue-600 hover:bg-blue-500 text-white shrink-0 rounded-lg shadow-md"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
