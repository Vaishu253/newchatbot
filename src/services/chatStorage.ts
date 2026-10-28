import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ChatMessage, Conversation, ToneType } from '../types/chat';

const LOCAL_STORAGE_KEY = 'gemini_chat_guest_conversations';
const LOCAL_MESSAGES_PREFIX = 'gemini_chat_guest_msgs_';

// Format Firestore timestamp safely to ISO string
function formatTimestamp(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}

// ----------------- FIRESTORE CONVERSATION REPO -----------------

export async function createFirestoreConversation(
  userId: string,
  id: string,
  title: string,
  tone: ToneType
): Promise<Conversation> {
  const path = `users/${userId}/conversations/${id}`;
  try {
    const now = Timestamp.now();
    const docRef = doc(db, 'users', userId, 'conversations', id);
    const data = {
      id,
      userId,
      title: title.slice(0, 200),
      tone,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, data);
    return {
      id,
      userId,
      title,
      tone,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirestoreConversation(
  userId: string,
  id: string,
  updates: { title?: string; tone?: ToneType }
): Promise<void> {
  const path = `users/${userId}/conversations/${id}`;
  try {
    const docRef = doc(db, 'users', userId, 'conversations', id);
    const payload: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (updates.title) payload.title = updates.title.slice(0, 200);
    if (updates.tone) payload.tone = updates.tone;

    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreConversation(userId: string, id: string): Promise<void> {
  const path = `users/${userId}/conversations/${id}`;
  try {
    // Delete conversation document
    await deleteDoc(doc(db, 'users', userId, 'conversations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeFirestoreConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = `users/${userId}/conversations`;
  const colRef = collection(db, 'users', userId, 'conversations');
  const q = query(colRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Conversation[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: d.id,
          userId: d.userId,
          title: d.title || 'Untitled Chat',
          tone: d.tone || 'professional',
          createdAt: formatTimestamp(d.createdAt),
          updatedAt: formatTimestamp(d.updatedAt),
        };
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Snapshot error for conversations:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ----------------- FIRESTORE MESSAGES REPO -----------------

export async function addFirestoreMessage(
  userId: string,
  conversationId: string,
  message: ChatMessage
): Promise<void> {
  const path = `users/${userId}/conversations/${conversationId}/messages/${message.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'conversations', conversationId, 'messages', message.id);
    const now = Timestamp.now();
    await setDoc(docRef, {
      id: message.id,
      conversationId,
      userId,
      role: message.role,
      content: message.content,
      tone: message.tone,
      createdAt: now,
    });

    // Bump conversation updatedAt
    const convRef = doc(db, 'users', userId, 'conversations', conversationId);
    await updateDoc(convRef, {
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirestoreMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  content: string,
  tone: ToneType
): Promise<void> {
  const path = `users/${userId}/conversations/${conversationId}/messages/${messageId}`;
  try {
    const docRef = doc(db, 'users', userId, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(docRef, {
      content,
      tone,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeFirestoreMessages(
  userId: string,
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = `users/${userId}/conversations/${conversationId}/messages`;
  const colRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
  const q = query(colRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatMessage[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: d.id,
          conversationId: d.conversationId,
          userId: d.userId,
          role: d.role,
          content: d.content,
          tone: d.tone,
          createdAt: formatTimestamp(d.createdAt),
        };
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Snapshot error for messages:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ----------------- LOCAL / GUEST STORAGE FALLBACK -----------------
// Enables immediate preview functionality even before sign-in

export function getLocalConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalConversations(convs: Conversation[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(convs));
  } catch (e) {
    console.error('Failed to save local conversations:', e);
  }
}

export function getLocalMessages(conversationId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalMessages(conversationId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save local messages:', e);
  }
}

export function deleteLocalConversation(conversationId: string): void {
  try {
    const convs = getLocalConversations().filter((c) => c.id !== conversationId);
    saveLocalConversations(convs);
    localStorage.removeItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`);
  } catch (e) {
    console.error('Failed to delete local conversation:', e);
  }
}

// Migrate guest conversations to Firestore on login
export async function syncGuestDataToFirestore(userId: string): Promise<void> {
  const localConvs = getLocalConversations();
  if (localConvs.length === 0) return;

  for (const conv of localConvs) {
    try {
      await createFirestoreConversation(userId, conv.id, conv.title, conv.tone);
      const msgs = getLocalMessages(conv.id);
      for (const msg of msgs) {
        await addFirestoreMessage(userId, conv.id, {
          ...msg,
          userId,
        });
      }
    } catch (e) {
      console.error('Error syncing guest conversation to Firestore:', e);
    }
  }

  // Clear guest data once migrated
  try {
    for (const conv of localConvs) {
      localStorage.removeItem(`${LOCAL_MESSAGES_PREFIX}${conv.id}`);
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing local storage after sync:', e);
  }
}
