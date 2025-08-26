import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertDocumentSchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";
import type { QueryRequest, QueryResponse, VoiceQueryRequest, DocumentProcessingStatus } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Upload PDF endpoint
  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.body.userId || "default-user"; // In production, get from auth
      
      const document = await storage.createDocument({
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        status: "processing",
        metadata: null,
        industry: null,
      });

      // Start processing the PDF asynchronously
      processPDF(document.id, req.file.path).catch(console.error);

      res.json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Get document status
  app.get("/api/documents/:id/status", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const status: DocumentProcessingStatus = {
        id: document.id,
        status: document.status as any,
        chunkCount: document.chunkCount || 0,
        industry: document.industry || undefined,
      };

      res.json(status);
    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({ error: "Failed to check document status" });
    }
  });

  // Get user documents
  app.get("/api/documents", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default-user";
      const documents = await storage.getUserDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  // Create chat session
  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse({
        ...req.body,
        userId: req.body.userId || "default-user",
      });
      
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Create session error:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Get chat sessions
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default-user";
      const sessions = await storage.getUserChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ error: "Failed to get chat sessions" });
    }
  });

  // Get chat messages
  app.get("/api/chat/sessions/:sessionId/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get chat messages" });
    }
  });

  // Query endpoint - main RAG functionality
  app.post("/api/chat/query", async (req, res) => {
    try {
      const queryRequest: QueryRequest = req.body;
      
      // Validate session exists
      const session = await storage.getChatSession(queryRequest.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      // Store user message
      await storage.createChatMessage({
        sessionId: queryRequest.sessionId,
        role: "user",
        content: queryRequest.message,
        sources: null,
        metadata: { mode: queryRequest.mode },
      });

      // Process query through RAG pipeline (this would use the Python services)
      const response = await processRAGQuery(queryRequest);

      // Store assistant response
      await storage.createChatMessage({
        sessionId: queryRequest.sessionId,
        role: "assistant",
        content: response.message,
        sources: response.sources,
        metadata: { mode: queryRequest.mode },
      });

      res.json(response);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  });

  // Voice query endpoint
  app.post("/api/chat/voice-query", async (req, res) => {
    try {
      const voiceRequest: VoiceQueryRequest = req.body;
      
      // Process voice to text (would use Whisper)
      const transcription = await processVoiceToText(voiceRequest.audioData);
      
      // Process as regular query
      const queryRequest: QueryRequest = {
        sessionId: voiceRequest.sessionId,
        message: transcription,
        mode: voiceRequest.mode,
      };
      
      const response = await processRAGQuery(queryRequest);
      
      // Store messages
      await storage.createChatMessage({
        sessionId: queryRequest.sessionId,
        role: "user",
        content: transcription,
        sources: null,
        metadata: { mode: voiceRequest.mode, inputType: "voice" },
      });

      await storage.createChatMessage({
        sessionId: queryRequest.sessionId,
        role: "assistant",
        content: response.message,
        sources: response.sources,
        metadata: { mode: voiceRequest.mode },
      });

      res.json({
        ...response,
        transcription,
      });
    } catch (error) {
      console.error("Voice query error:", error);
      res.status(500).json({ error: "Failed to process voice query" });
    }
  });

  // Text-to-speech endpoint
  app.post("/api/chat/text-to-speech", async (req, res) => {
    try {
      const { text, voice = "default" } = req.body;
      
      // Generate audio (would use TTS service)
      const audioData = await processTextToSpeech(text, voice);
      
      res.json({ audioData });
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Placeholder functions that would integrate with Python services
async function processPDF(documentId: string, filePath: string): Promise<void> {
  try {
    // This would call the Python PDF processing service
    // For now, simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await storage.updateDocumentStatus(documentId, "ready", {
      pages: 10,
      extractedImages: 2,
    });
    
    // Create some sample chunks
    for (let i = 0; i < 5; i++) {
      await storage.createDocumentChunk({
        documentId,
        content: `Sample chunk ${i + 1} content from processed PDF`,
        chunkIndex: i,
        startPage: Math.floor(i / 2) + 1,
        endPage: Math.floor(i / 2) + 1,
        embedding: null, // Would contain actual embeddings
        metadata: { chunkType: "text" },
      });
    }
    
    // Update chunk count
    await storage.updateDocumentStatus(documentId, "ready", {
      pages: 10,
      extractedImages: 2,
    });
    
  } catch (error) {
    console.error("PDF processing error:", error);
    await storage.updateDocumentStatus(documentId, "error", { error: error.message });
  }
}

async function processRAGQuery(request: QueryRequest): Promise<QueryResponse> {
  // This would integrate with Python RAG services
  // For now, return a structured response
  return {
    message: `I understand you're asking: "${request.message}". Based on your uploaded documents, I can help analyze and answer questions about the content.`,
    sources: [
      {
        documentId: "sample-doc-1",
        documentName: "uploaded-document.pdf",
        chunkContent: "Relevant content chunk from the document that was used to generate this response.",
        page: 1,
        relevance: 0.95,
      },
    ],
    sessionId: request.sessionId,
  };
}

async function processVoiceToText(audioData: string): Promise<string> {
  // This would use Whisper for transcription
  // For now, return placeholder
  return "This is a transcription of the voice input.";
}

async function processTextToSpeech(text: string, voice: string): Promise<string> {
  // This would use TTS service to generate audio
  // For now, return placeholder base64 audio data
  return "base64-encoded-audio-data";
}
