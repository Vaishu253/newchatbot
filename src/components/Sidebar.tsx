import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Database,
  LogIn,
  LogOut,
  X,
  Search,
  Sparkles,
  Briefcase,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Conversation, ToneType } from '../types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  firestoreConnected: boolean;
  authLoading: boolean;
}

const TONE_ICONS: Record<ToneType, React.ReactNode> = {
  professional: <Briefcase className="w-3 h-3 text-blue-500" />,
  casual: <MessageCircle className="w-3 h-3 text-emerald-500" />,
  concise: <Zap className="w-3 h-3 text-amber-500" />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  user,
  onSignIn,
  onSignOut,
  firestoreConnected,
  authLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 sm:w-80 bg-zinc-900 text-zinc-100 flex flex-col border-r border-zinc-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & New Chat Button */}
        <div className="p-4 border-b border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">Gemini Chat Studio</span>
            </div>
            <button
              onClick={onClose}
              className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search input if more than 3 conversations */}
        {conversations.length > 3 && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800/70 text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-zinc-700/60 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
            <span>Conversations</span>
            <span className="text-zinc-500 text-[10px]">{conversations.length}</span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-zinc-500 text-xs">
              {searchQuery ? 'No conversations match search' : 'No chats yet. Start a new conversation!'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white font-medium shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="shrink-0">{TONE_ICONS[conv.tone] || <MessageSquare className="w-3.5 h-3.5" />}</span>
                    <span className="truncate">{conv.title || 'Untitled Conversation'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    title="Delete chat"
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1 rounded-md transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Database & Account Status Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 text-xs">
          {/* Firestore status indicator */}
          <div className="flex items-center justify-between mb-2.5 px-1 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Storage:</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                user && firestoreConnected ? 'text-emerald-400' : 'text-zinc-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  user && firestoreConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {user ? (firestoreConnected ? 'Firestore Cloud' : 'Connecting...') : 'Preview Local'}
            </span>
          </div>

          {/* User Sign In / Profile */}
          {user ? (
            <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs text-white font-medium truncate">
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title="Sign out"
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={authLoading}
              onClick={onSignIn}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 active:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
