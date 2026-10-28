/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from './lib/firebase';
import { ChatMessage, Conversation, ToneType } from './types/chat';
import {
  createFirestoreConversation,
  updateFirestoreConversation,
  deleteFirestoreConversation,
  subscribeFirestoreConversations,
  addFirestoreMessage,
  updateFirestoreMessage,
  subscribeFirestoreMessages,
  getLocalConversations,
  saveLocalConversations,
  getLocalMessages,
  saveLocalMessages,
  deleteLocalConversation,
  syncGuestDataToFirestore,
} from './services/chatStorage';
import { Sidebar } from './components/Sidebar';
import { ToneSelector } from './components/ToneSelector';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { EmptyChatState } from './components/EmptyChatState';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTone, setCurrentTone] = useState<ToneType>('professional');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth & Database states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom(isStreaming ? 'auto' : 'smooth');
  }, [messages, isStreaming]);

  // Test Firestore connection on boot
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
    });
  }, []);

  // Monitor Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Sync any guest chat history created before sign in
        try {
          await syncGuestDataToFirestore(currentUser.uid);
        } catch (e) {
          console.error('Failed to sync guest data:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to conversations list (Firestore if authenticated, LocalStorage if guest)
  useEffect(() => {
    if (user) {
      const unsub = subscribeFirestoreConversations(
        user.uid,
        (convs) => {
          setConversations(convs);
          setFirestoreConnected(true);
        },
        (err) => {
          console.warn('Firestore subscription fallback:', err);
        }
      );
      return () => unsub();
    } else {
      // Guest mode
      const localConvs = getLocalConversations();
      setConversations(localConvs);
    }
  }, [user]);

  // Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    if (user) {
      const unsub = subscribeFirestoreMessages(
        user.uid,
        activeConversationId,
        (msgs) => {
          // If we are currently streaming a new message, do not overwrite the in-progress stream
          if (!isStreaming) {
            setMessages(msgs);
          }
        },
        (err) => {
          console.warn('Error loading messages from Firestore:', err);
        }
      );
      return () => unsub();
    } else {
      // Guest mode
      const localMsgs = getLocalMessages(activeConversationId);
      setMessages(localMsgs);
    }
  }, [activeConversationId, user, isStreaming]);

  // Synchronize active tone with selected conversation
  useEffect(() => {
    if (activeConversationId) {
      const activeConv = conversations.find((c) => c.id === activeConversationId);
      if (activeConv) {
        setCurrentTone(activeConv.tone);
      }
    }
  }, [activeConversationId, conversations]);

  // Handlers
  const handleSelectConversation = (id: string) => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
    setActiveConversationId(id);
    setErrorMessage(null);
  };

  const handleNewConversation = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      if (user) {
        await deleteFirestoreConversation(user.uid, id);
      } else {
        deleteLocalConversation(id);
        setConversations(getLocalConversations());
      }

      if (activeConversationId === id) {
        handleNewConversation();
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const handleToneChange = async (newTone: ToneType) => {
    setCurrentTone(newTone);
    if (activeConversationId) {
      if (user) {
        await updateFirestoreConversation(user.uid, activeConversationId, { tone: newTone });
      } else {
        const updated = conversations.map((c) => (c.id === activeConversationId ? { ...c, tone: newTone } : c));
        setConversations(updated);
        saveLocalConversations(updated);
      }
    }
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign In error:', err);
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setErrorMessage(`Authentication notice: ${msg}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      handleNewConversation();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  // Send message and stream Gemini response
  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isStreaming) return;

    setInput('');
    setErrorMessage(null);

    const userId = user ? user.uid : 'guest_user';
    let convId = activeConversationId;
    let currentConversationList = [...conversations];

    // Create a new conversation if none active
    if (!convId) {
      convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const title = textToSend.length > 45 ? `${textToSend.slice(0, 42)}...` : textToSend;

      const newConv: Conversation = {
        id: convId,
        userId,
        title,
        tone: currentTone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (user) {
        try {
          await createFirestoreConversation(user.uid, convId, title, currentTone);
        } catch (e) {
          console.error('Error creating conversation in Firestore:', e);
        }
      } else {
        currentConversationList = [newConv, ...currentConversationList];
        setConversations(currentConversationList);
        saveLocalConversations(currentConversationList);
      }

      setActiveConversationId(convId);
    }

    // Prepare User Message
    const userMsgId = `msg_${Date.now()}_user`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      conversationId: convId,
      userId,
      role: 'user',
      content: textToSend,
      tone: currentTone,
      createdAt: new Date().toISOString(),
    };

    // Prepare Assistant Message Placeholder
    const assistantMsgId = `msg_${Date.now() + 1}_model`;
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      conversationId: convId,
      userId,
      role: 'model',
      content: '',
      tone: currentTone,
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage, assistantMessage];
    setMessages(updatedMessages);

    // Save user message
    if (user) {
      try {
        await addFirestoreMessage(user.uid, convId, userMessage);
      } catch (e) {
        console.error('Error saving user message to Firestore:', e);
      }
    } else {
      saveLocalMessages(convId, [...messages, userMessage]);
    }

    // Start Streaming Call to Server
    setIsStreaming(true);
    setStreamingMessageId(assistantMsgId);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedContent = '';

    try {
      // Build messages payload for API
      const conversationHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          tone: currentTone,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable response stream received.');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                accumulatedContent += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m))
                );
              }
            } catch (err) {
              if (err instanceof Error && err.message.includes('API_KEY')) {
                throw err;
              }
            }
          }
        }
      }

      // Persist assistant completed message
      const finalAssistantMessage: ChatMessage = {
        ...assistantMessage,
        content: accumulatedContent,
      };

      if (user) {
        await addFirestoreMessage(user.uid, convId, finalAssistantMessage);
      } else {
        saveLocalMessages(convId, [...messages, userMessage, finalAssistantMessage]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Stream stopped by user.');
        // Save partial text if any
        if (accumulatedContent) {
          const partialMessage: ChatMessage = { ...assistantMessage, content: accumulatedContent };
          if (user) {
            await addFirestoreMessage(user.uid, convId, partialMessage);
          } else {
            saveLocalMessages(convId, [...messages, userMessage, partialMessage]);
          }
        }
      } else {
        console.error('Chat error:', err);
        const errMsg = err instanceof Error ? err.message : 'Unknown generation error';
        setErrorMessage(errMsg);
        // Put error in assistant content if empty
        if (!accumulatedContent) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `**Error generating response:** ${errMsg}` }
                : m
            )
          );
        }
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = async () => {
    if (isStreaming || messages.length === 0) return;

    // Find the last assistant message
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'model') return;

    // Find the prompt before this assistant response
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove the last assistant message from state
    const trimmedMessages = messages.slice(0, -1);
    setMessages(trimmedMessages);

    // Call handleSend with the last user's prompt
    // Note: trimmedMessages already contains the user message, so we stream a fresh answer
    const userId = user ? user.uid : 'guest_user';
    const convId = activeConversationId!;
    const assistantMsgId = `msg_${Date.now()}_model_regen`;
    const newAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      conversationId: convId,
      userId,
      role: 'model',
      content: '',
      tone: currentTone,
      createdAt: new Date().toISOString(),
    };

    setMessages([...trimmedMessages, newAssistantMsg]);
    setIsStreaming(true);
    setStreamingMessageId(assistantMsgId);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let accumulatedContent = '';

    try {
      const conversationHistory = trimmedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          tone: currentTone,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream.');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulatedContent += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m))
                );
              }
            } catch (err) {
              if (err instanceof Error && err.message.includes('API_KEY')) throw err;
            }
          }
        }
      }

      // Persist regenerated message
      const finalMsg: ChatMessage = { ...newAssistantMsg, content: accumulatedContent };
      if (user) {
        await updateFirestoreMessage(user.uid, convId, lastMsg.id, accumulatedContent, currentTone).catch(() =>
          addFirestoreMessage(user.uid, convId, finalMsg)
        );
      } else {
        saveLocalMessages(convId, [...trimmedMessages, finalMsg]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const msg = err.message;
        setErrorMessage(msg);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: `**Error:** ${msg}` } : m))
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar with Chat History & Firebase Auth */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        firestoreConnected={firestoreConnected}
        authLoading={authLoading}
      />

      {/* Main Chat Screen */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-14 sm:h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors md:hidden"
              title="Open chat history"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0 hidden sm:flex shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {activeConversation ? activeConversation.title : 'New Chat'}
                </h1>
                <p className="text-[11px] text-zinc-400 hidden sm:block">
                  Gemini 3.8 Flash &bull; {user ? 'Firestore Synced' : 'Ready'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Tone Selector */}
          <div className="flex items-center gap-2">
            <ToneSelector
              currentTone={currentTone}
              onSelectTone={handleToneChange}
              disabled={isStreaming}
            />
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 z-10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-semibold underline ml-2 hover:text-amber-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-2">
          {messages.length === 0 ? (
            <EmptyChatState
              currentTone={currentTone}
              onSelectPrompt={(prompt) => handleSend(prompt)}
            />
          ) : (
            messages.map((message, index) => {
              const isAssistant = message.role === 'model';
              const isStreamingThisMessage = isStreaming && message.id === streamingMessageId;
              const isLastAssistant = isAssistant && index === messages.length - 1;

              return (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  isStreaming={isStreamingThisMessage}
                  isLastAssistantMessage={isLastAssistant}
                  onRegenerate={handleRegenerate}
                  canRegenerate={isLastAssistant && !isStreaming}
                />
              );
            })
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Chat Input Bar */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSend()}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </main>
    </div>
  );
}
