import { apiRequest } from "./queryClient";
import type { Document, ChatSession, ChatMessage, QueryRequest, QueryResponse, VoiceQueryRequest, DocumentProcessingStatus } from "@shared/schema";

export const api = {
  // Document operations
  documents: {
    upload: async (file: File, userId?: string): Promise<Document> => {
      const formData = new FormData();
      formData.append('file', file);
      if (userId) formData.append('userId', userId);
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    getStatus: async (documentId: string): Promise<DocumentProcessingStatus> => {
      const response = await apiRequest('GET', `/api/documents/${documentId}/status`);
      return response.json();
    },
    
    list: async (userId?: string): Promise<Document[]> => {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiRequest('GET', `/api/documents${params}`);
      return response.json();
    },
  },
  
  // Chat operations
  chat: {
    createSession: async (data: { title?: string; mode?: string; settings?: any; userId?: string }): Promise<ChatSession> => {
      const response = await apiRequest('POST', '/api/chat/sessions', data);
      return response.json();
    },
    
    getSessions: async (userId?: string): Promise<ChatSession[]> => {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiRequest('GET', `/api/chat/sessions${params}`);
      return response.json();
    },
    
    getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
      const response = await apiRequest('GET', `/api/chat/sessions/${sessionId}/messages`);
      return response.json();
    },
    
    query: async (request: QueryRequest): Promise<QueryResponse> => {
      const response = await apiRequest('POST', '/api/chat/query', request);
      return response.json();
    },
    
    voiceQuery: async (request: VoiceQueryRequest): Promise<QueryResponse & { transcription: string }> => {
      const response = await apiRequest('POST', '/api/chat/voice-query', request);
      return response.json();
    },
    
    textToSpeech: async (text: string, voice?: string): Promise<{ audioData: string }> => {
      const response = await apiRequest('POST', '/api/chat/text-to-speech', { text, voice });
      return response.json();
    },
  },
};
