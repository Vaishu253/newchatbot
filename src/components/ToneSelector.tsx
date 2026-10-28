import React from 'react';
import { Briefcase, MessageCircle, Zap } from 'lucide-react';
import { ToneType } from '../types/chat';

interface ToneSelectorProps {
  currentTone: ToneType;
  onSelectTone: (tone: ToneType) => void;
  disabled?: boolean;
}

export const ToneSelector: React.FC<ToneSelectorProps> = ({ currentTone, onSelectTone, disabled = false }) => {
  const tones: { id: ToneType; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      id: 'professional',
      label: 'Professional',
      icon: <Briefcase className="w-3.5 h-3.5" />,
      tooltip: 'Articulate, well-structured, and comprehensive',
    },
    {
      id: 'casual',
      label: 'Casual',
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      tooltip: 'Warm, conversational, and approachable',
    },
    {
      id: 'concise',
      label: 'Concise',
      icon: <Zap className="w-3.5 h-3.5" />,
      tooltip: 'Direct, sharp, with zero fluff',
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 select-none hidden sm:inline">
        Tone:
      </span>
      {tones.map((t) => {
        const isActive = currentTone === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectTone(t.id)}
            title={t.tooltip}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};
