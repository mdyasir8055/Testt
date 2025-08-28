import { apiRequest } from "./queryClient";
import type { Document, ChatSession, ChatMessage, QueryRequest, QueryResponse, VoiceQueryRequest, DocumentProcessingStatus, APIKeyRequest, ProviderModelsResponse, ModelInfo } from "@shared/schema";

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
    
    uploadFromUrl: async (url: string, userId?: string): Promise<Document> => {
      const response = await apiRequest('POST', '/api/documents/upload-url', { url, userId });
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

    listWithStatus: async (userId?: string): Promise<(Document & { progress?: number })[]> => {
      const docs = await api.documents.list(userId);
      // Fetch status for processing docs in parallel
      const results = await Promise.all(docs.map(async d => {
        if (d.status === 'processing') {
          try {
            const s = await api.documents.getStatus(d.id);
            return { ...d, progress: s.progress };
          } catch {
            return d;
          }
        }
        return d;
      }));
      return results;
    },

    delete: async (documentId: string): Promise<{ success: boolean }> => {
      const response = await apiRequest('DELETE', `/api/documents/${documentId}`);
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
    
    compare: async (documentIds: string[], question: string): Promise<QueryResponse> => {
      const response = await apiRequest('POST', '/api/chat/compare', { documentIds, question });
      return response.json();
    },

    clearHistory: async (sessionId: string): Promise<{ success: boolean }> => {
      const response = await apiRequest('DELETE', `/api/chat/sessions/${sessionId}/messages`);
      return response.json();
    },
  },

  // Model and API key management
  models: {
    setApiKey: async (provider: string, apiKey: string): Promise<{ success: boolean; provider: string }> => {
      const response = await apiRequest('POST', '/api/models/set-api-key', { provider, apiKey });
      return response.json();
    },

    getProviderModels: async (provider: string): Promise<ProviderModelsResponse> => {
      const response = await apiRequest('GET', `/api/models/${provider}`, undefined);
      return response.json();
    },

    testApiKey: async (provider: string, apiKey: string): Promise<{ isValid: boolean; provider: string }> => {
      const response = await apiRequest('POST', '/api/models/test-key', { provider, apiKey });
      return response.json();
    }
  },
};