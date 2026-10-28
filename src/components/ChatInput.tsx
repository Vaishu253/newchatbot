import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pb-4">
      <div className="relative flex items-end gap-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-md p-2 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Gemini... (Shift+Enter for newline)"
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent border-0 focus:ring-0 p-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm sm:text-base resize-none max-h-44 outline-none leading-relaxed"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer"
            title="Stop generating"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || disabled}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-xs ${
              input.trim() && !disabled
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-center text-zinc-400 mt-2">
        Powered by Google Gemini 3.8 Flash &bull; Responses stream in real-time
      </p>
    </div>
  );
};
