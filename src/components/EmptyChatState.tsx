import React from 'react';
import { Sparkles, HelpCircle, Code2, PenLine, Compass } from 'lucide-react';
import { ToneType } from '../types/chat';

interface EmptyChatStateProps {
  currentTone: ToneType;
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS: Record<ToneType, { icon: React.ReactNode; title: string; prompt: string }[]> = {
  professional: [
    {
      icon: <PenLine className="w-4 h-4 text-blue-500" />,
      title: 'Executive Project Update',
      prompt: 'Draft an executive status report highlighting project milestones, deliverables, and upcoming timeline risks.',
    },
    {
      icon: <Code2 className="w-4 h-4 text-indigo-500" />,
      title: 'Code Architecture Review',
      prompt: 'Explain the architectural differences between event-driven microservices and monolithic architectures with pros and cons.',
    },
    {
      icon: <Compass className="w-4 h-4 text-purple-500" />,
      title: 'Strategic Decision Framework',
      prompt: 'Provide a structured decision framework for evaluating build-versus-buy software investments.',
    },
  ],
  casual: [
    {
      icon: <HelpCircle className="w-4 h-4 text-emerald-500" />,
      title: 'Explain Simply',
      prompt: 'How does quantum computing work, explained like I am talking to a friend over coffee?',
    },
    {
      icon: <Sparkles className="w-4 h-4 text-pink-500" />,
      title: 'Trip Recommendation',
      prompt: 'What are 3 fun, off-the-beaten-path things to do in Tokyo during autumn?',
    },
    {
      icon: <PenLine className="w-4 h-4 text-amber-500" />,
      title: 'Creative Writing',
      prompt: 'Write a witty, lighthearted story about a barista who discovers their espresso machine predicts tomorrow’s weather.',
    },
  ],
  concise: [
    {
      icon: <ZapIcon />,
      title: 'Quick Command Reference',
      prompt: 'List the top 5 most useful git commands for undoing recent mistakes with short 1-line explanations.',
    },
    {
      icon: <PenLine className="w-4 h-4 text-amber-500" />,
      title: 'TL;DR Summary',
      prompt: 'Give me a bullet-point summary of how transformers in AI work in under 60 words.',
    },
    {
      icon: <Compass className="w-4 h-4 text-indigo-500" />,
      title: 'Direct Comparison',
      prompt: 'Compare React vs Svelte in 3 concise bullet points.',
    },
  ],
};

function ZapIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({ currentTone, onSelectPrompt }) => {
  const prompts = STARTER_PROMPTS[currentTone] || STARTER_PROMPTS.professional;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto text-center">
      <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-bounce-subtle">
        <Sparkles className="w-7 h-7" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
        How can I help you today?
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-md">
        Choose a prompt below or type your question. Responses stream using Gemini with your selected{' '}
        <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">{currentTone}</span> tone.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {prompts.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectPrompt(p.prompt)}
            className="flex flex-col text-left p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700/60 w-fit mb-2.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 transition-colors">
              {p.icon}
            </div>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{p.title}</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {p.prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
