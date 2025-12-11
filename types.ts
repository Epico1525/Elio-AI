export enum Sender {
  User = 'user',
  AI = 'ai'
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64 string
  fileName: string;
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isThinking?: boolean;
  attachments?: Attachment[]; // Add support for displaying attachments in history
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface GeminiConfig {
  useThinking: boolean;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}