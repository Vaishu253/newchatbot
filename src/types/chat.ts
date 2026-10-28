export type ToneType = 'professional' | 'casual' | 'concise';

export type MessageRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  tone: ToneType;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  tone: ToneType;
  createdAt: string;
  updatedAt: string;
}

export interface ToneOption {
  id: ToneType;
  label: string;
  description: string;
  badge: string;
  iconName: string;
}
