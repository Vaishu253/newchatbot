import React, { useState } from 'react';
import { Copy, Check, RotateCw, Sparkles, User } from 'lucide-react';
import { ChatMessage, ToneType } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLastAssistantMessage?: boolean;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}

const TONE_BADGES: Record<ToneType, { label: string; style: string }> = {
  professional: {
    label: 'Professional',
    style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  casual: {
    label: 'Casual',
    style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  concise: {
    label: 'Concise',
    style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isStreaming = false,
  isLastAssistantMessage = false,
  onRegenerate,
  canRegenerate = false,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy message:', e);
    }
  };

  const formattedTime = (() => {
    try {
      return new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  if (isUser) {
    return (
      <div className="flex justify-end my-4 px-2 sm:px-4 group">
        <div className="flex items-start gap-3 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]">
          <div className="flex flex-col items-end">
            <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-sm text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
              {formattedTime && <span>{formattedTime}</span>}
              <button
                onClick={handleCopy}
                title="Copy message"
                className="opacity-0 group-hover:opacity-100 hover:text-zinc-600 dark:hover:text-zinc-200 transition-opacity p-0.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200 dark:border-indigo-800">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  const toneInfo = TONE_BADGES[message.tone] || TONE_BADGES.professional;

  return (
    <div className="flex justify-start my-4 px-2 sm:px-4 group">
      <div className="flex items-start gap-3 max-w-[95%] sm:max-w-[88%] md:max-w-[82%]">
        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-zinc-800/90 border border-zinc-200/90 dark:border-zinc-700/80 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs text-zinc-800 dark:text-zinc-100 text-sm sm:text-base">
            {message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-zinc-400 py-1">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-xs font-medium">Generating response...</span>
              </div>
            ) : (
              <span className="text-zinc-400 italic text-sm">No response received.</span>
            )}

            {isStreaming && message.content && (
              <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between mt-2 px-1 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${toneInfo.style}`}
              >
                {toneInfo.label}
              </span>
              {formattedTime && <span className="text-[11px] text-zinc-400">{formattedTime}</span>}
            </div>

            <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!message.content}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {canRegenerate && onRegenerate && !isStreaming && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium transition-colors cursor-pointer"
                  title="Regenerate this answer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
