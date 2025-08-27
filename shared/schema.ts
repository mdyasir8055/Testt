import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  sourceType: text("source_type").notNull().default("pdf"), // pdf, url
  sourceUrl: text("source_url"), // for URL-based documents
  status: text("status").notNull().default("processing"), // processing, ready, error
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  metadata: jsonb("metadata"),
  industry: text("industry"), // medical, finance, retail, education, etc.
  chunkCount: integer("chunk_count").default(0),
});

export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  startPage: integer("start_page"),
  endPage: integer("end_page"),
  embedding: jsonb("embedding"), // vector embedding
  metadata: jsonb("metadata"), // additional chunk metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title"),
  mode: text("mode").notNull().default("standard"), // standard, industry, comparison
  settings: jsonb("settings"), // model, temperature, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  sources: jsonb("sources"), // source chunks used for RAG
  metadata: jsonb("metadata"), // additional message metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type DocumentChunk = typeof documentChunks.$inferSelect;

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// API types
export type QueryRequest = {
  sessionId: string;
  message: string;
  mode?: string;
  documentIds?: string[];
};

export type QueryResponse = {
  message: string;
  sources: {
    documentId: string;
    documentName: string;
    chunkContent: string;
    page?: number;
    relevance: number;
  }[];
  sessionId: string;
};

export type VoiceQueryRequest = {
  sessionId: string;
  audioData: string; // base64 encoded audio
  mode?: string;
};

export type DocumentProcessingStatus = {
  id: string;
  status: "processing" | "ready" | "error";
  progress?: number;
  error?: string;
  chunkCount?: number;
  industry?: string;
};

export type APIKeyRequest = {
  provider: string;
  apiKey: string;
};

export type ModelInfo = {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  provider: string;
};

export type ProviderModelsResponse = {
  provider: string;
  models: ModelInfo[];
  isValid: boolean;
  error?: string;
};
