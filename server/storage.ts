import { type User, type InsertUser, type Document, type InsertDocument, type ChatSession, type InsertChatSession, type ChatMessage, type InsertChatMessage, type DocumentChunk } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Document methods
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getUserDocuments(userId: string): Promise<Document[]>;
  updateDocumentStatus(id: string, status: string, metadata?: any): Promise<void>;
  
  // Document chunks
  createDocumentChunk(chunk: Omit<DocumentChunk, 'id' | 'createdAt'>): Promise<DocumentChunk>;
  getDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
  
  // Chat sessions
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getUserChatSessions(userId: string): Promise<ChatSession[]>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void>;
  
  // Chat messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private documents: Map<string, Document> = new Map();
  private documentChunks: Map<string, DocumentChunk[]> = new Map();
  private chatSessions: Map<string, ChatSession> = new Map();
  private chatMessages: Map<string, ChatMessage[]> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt: new Date(),
      processedAt: null,
      chunkCount: 0,
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.userId === userId);
  }

  async updateDocumentStatus(id: string, status: string, metadata?: any): Promise<void> {
    const document = this.documents.get(id);
    if (document) {
      this.documents.set(id, {
        ...document,
        status,
        processedAt: status === 'ready' ? new Date() : document.processedAt,
        metadata: metadata || document.metadata,
      });
    }
  }

  async createDocumentChunk(chunk: Omit<DocumentChunk, 'id' | 'createdAt'>): Promise<DocumentChunk> {
    const id = randomUUID();
    const documentChunk: DocumentChunk = {
      ...chunk,
      id,
      createdAt: new Date(),
    };
    
    const chunks = this.documentChunks.get(chunk.documentId) || [];
    chunks.push(documentChunk);
    this.documentChunks.set(chunk.documentId, chunks);
    
    return documentChunk;
  }

  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.documentChunks.get(documentId) || [];
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(session => session.userId === userId);
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void> {
    const session = this.chatSessions.get(id);
    if (session) {
      this.chatSessions.set(id, {
        ...session,
        ...updates,
        updatedAt: new Date(),
      });
    }
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    
    const messages = this.chatMessages.get(insertMessage.sessionId) || [];
    messages.push(message);
    this.chatMessages.set(insertMessage.sessionId, messages);
    
    return message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.chatMessages.get(sessionId) || [];
  }
}

export const storage = new MemStorage();
