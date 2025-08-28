import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertDocumentSchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";
import type { QueryRequest, QueryResponse, VoiceQueryRequest, DocumentProcessingStatus, APIKeyRequest, ProviderModelsResponse } from "@shared/schema";

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

// In-memory storage for API keys (in production, use secure storage)
const apiKeys: Record<string, string> = {};

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

      // If a document with same originalName and size exists, reuse it (prefer ready; otherwise return processing)
      try {
        const userDocs = await storage.getUserDocuments(userId);
        const existingReady = userDocs.find(d => d.originalName === req.file.originalname && d.size === req.file.size && d.status === 'ready');
        if (existingReady) {
          const tempPath = req.file.path;
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          return res.json(existingReady);
        }
        const existingProcessing = userDocs.find(d => d.originalName === req.file.originalname && d.size === req.file.size && d.status === 'processing');
        if (existingProcessing) {
          const tempPath = req.file.path;
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          return res.json(existingProcessing);
        }
      } catch {}
      
      const document = await storage.createDocument({
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        sourceType: "pdf",
        sourceUrl: null,
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

  // URL upload and processing
  app.post("/api/documents/upload-url", async (req, res) => {
    try {
      const { url, userId = "default-user" } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Extract domain for document name
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const originalName = `${domain} - Web Content`;

      const document = await storage.createDocument({
        userId,
        filename: `url_${Date.now()}.html`,
        originalName,
        size: 0, // Will be updated after content fetch
        mimeType: "text/html",
        sourceType: "url",
        sourceUrl: url,
        status: "processing",
        metadata: { sourceUrl: url },
        industry: null,
      });

      // Start processing URL content asynchronously
      processUrlContent(document.id, url).catch(console.error);

      res.json(document);
    } catch (error) {
      console.error("URL upload error:", error);
      res.status(500).json({ error: "URL processing failed" });
    }
  });

  // Get document status with simple progress estimate
  app.get("/api/documents/:id/status", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Heuristic progress: based on chunkCount if available, fallback to time since upload
      let progress: number | undefined = undefined;
      const totalExpectedChunks = (document.metadata as any)?.chunkCount || document.chunkCount || 8; // default 8 in mock
      if (document.status === 'ready') {
        progress = 100;
      } else if (document.status === 'processing') {
        const currentChunks = await storage.getDocumentChunks(document.id);
        if (currentChunks.length > 0 && totalExpectedChunks > 0) {
          progress = Math.min(99, Math.round((currentChunks.length / totalExpectedChunks) * 100));
        } else if (document.uploadedAt) {
          const elapsed = Date.now() - new Date(document.uploadedAt).getTime();
          progress = Math.max(5, Math.min(95, Math.round((elapsed / 3000) * 100))); // ~3s simulated
        } else {
          progress = 10;
        }
      }

      const status: DocumentProcessingStatus = {
        id: document.id,
        status: document.status as any,
        progress,
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

  // Delete a document (and its chunks)
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await storage.getDocument(id);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      await storage.deleteDocument(id);
      // Optionally remove file from uploads folder
      try {
        const filePath = path.join(process.cwd(), 'uploads', doc.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Delete a chat session (and its messages)
  app.delete("/api/chat/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getChatSession(sessionId);
      if (!session) return res.status(404).json({ error: "Chat session not found" });
      await storage.deleteChatSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete chat session error:", error);
      res.status(500).json({ error: "Failed to delete chat session" });
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

      // Extract industry and chat mode from combined mode
      const [industry = 'general', chatMode = 'standard'] = (queryRequest.mode || 'general_standard').split('_');

      // Store user message
      await storage.createChatMessage({
        sessionId: queryRequest.sessionId,
        role: "user",
        content: queryRequest.message,
        sources: null,
        metadata: { mode: queryRequest.mode, industry, chatMode, documentIds: queryRequest.documentIds },
      });

      // Process query through RAG pipeline with industry-specific processing
      const response = await processRAGQuery(queryRequest, industry, chatMode);

      // Store assistant response
      await storage.createChatMessage({
        sessionId: queryRequest.sessionId,
        role: "assistant",
        content: response.message,
        sources: response.sources,
        metadata: { mode: queryRequest.mode, industry, chatMode },
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

  // Document comparison endpoint
  app.post("/api/chat/compare", async (req, res) => {
    try {
      const { documentIds, question, mode = "comparison" } = req.body;
      
      if (!documentIds || documentIds.length < 2) {
        return res.status(400).json({ error: "At least 2 documents are required for comparison" });
      }
      
      // Process comparison through RAG engine
      const response = await processDocumentComparison(documentIds, question, mode);
      
      res.json(response);
    } catch (error) {
      console.error("Comparison error:", error);
      res.status(500).json({ error: "Failed to compare documents" });
    }
  });

  // API Key management endpoints
  app.post("/api/models/set-api-key", async (req, res) => {
    try {
      const { provider, apiKey }: APIKeyRequest = req.body;
      
      if (!provider || !apiKey) {
        return res.status(400).json({ error: "Provider and API key are required" });
      }

      // Store API key (in production, encrypt and store securely)
      apiKeys[provider] = apiKey;

      res.json({ success: true, provider });
    } catch (error) {
      console.error("Set API key error:", error);
      res.status(500).json({ error: "Failed to set API key" });
    }
  });

  // Get available models for a provider
  app.get("/api/models/:provider", async (req, res) => {
    try {
      const provider = req.params.provider;
      const response = await getProviderModels(provider);
      res.json(response);
    } catch (error) {
      console.error("Get models error:", error);
      res.status(500).json({ error: "Failed to get models" });
    }
  });

  // Test API key validity
  app.post("/api/models/test-key", async (req, res) => {
    try {
      const { provider, apiKey }: APIKeyRequest = req.body;
      const isValid = await testAPIKey(provider, apiKey);
      res.json({ isValid, provider });
    } catch (error) {
      console.error("Test API key error:", error);
      res.status(500).json({ error: "Failed to test API key" });
    }
  });

  // Retry processing endpoint
  app.post("/api/documents/:id/retry", async (req, res) => {
    try {
      const documentId = req.params.id;
      await retryProcessing(documentId);
      res.json({ success: true, message: "Processing retry initiated" });
    } catch (error) {
      console.error("Retry processing error:", error);
      res.status(500).json({ error: "Failed to retry processing" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// URL content processing function
async function processUrlContent(documentId: string, url: string): Promise<void> {
  console.log(`Starting URL processing for document ${documentId} from ${url}...`);
  
  try {
    // Fetch content from URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDFKnowledgeBot/1.0)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Basic HTML content extraction (remove scripts, styles, etc.)
    const textContent = extractTextFromHtml(html);
    const contentSize = new TextEncoder().encode(textContent).length;
    
    // Detect industry based on content
    const detectedIndustry = detectIndustryFromContent(textContent);
    
    // Create content chunks
    const chunks = createContentChunks(textContent);
    
    // Update document status
    await storage.updateDocumentStatus(documentId, "ready", {
      pages: 1,
      extractedText: textContent.length,
      detectedIndustry,
      chunkCount: chunks.length,
      originalUrl: url,
      contentSize,
    });
    
    // Store chunks
    for (let i = 0; i < chunks.length; i++) {
      await storage.createDocumentChunk({
        documentId,
        content: chunks[i],
        chunkIndex: i,
        startPage: 1,
        endPage: 1,
        embedding: null,
        metadata: { 
          chunkType: "text", 
          industry: detectedIndustry,
          tokenCount: chunks[i].split(' ').length,
          sourceUrl: url
        },
      });
    }

    // Update final document with industry metadata
    const document = await storage.getDocument(documentId);
    if (document) {
      const updatedMetadata = {
        ...(document.metadata || {}),
        detectedIndustry,
        processingComplete: true,
        chunkCount: chunks.length,
        contentSize,
        originalUrl: url
      };
      
      await storage.updateDocumentStatus(documentId, "ready", {
        pages: 1,
        extractedText: textContent.length,
        detectedIndustry,
        chunkCount: chunks.length,
        metadata: updatedMetadata
      });
    }
    
    console.log(`Successfully processed URL content for document ${documentId}`);
    
  } catch (error) {
    console.error(`URL processing error for ${documentId}:`, error);
    await storage.updateDocumentStatus(documentId, "error", { 
      error: error instanceof Error ? error.message : String(error),
      originalUrl: url
    });
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  
  // Extract text content
  const textContent = cleanHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return textContent;
}

function detectIndustryFromContent(content: string): string {
  const industryKeywords = {
    medical: ['health', 'medical', 'patient', 'diagnosis', 'treatment', 'clinical', 'hospital', 'doctor', 'medicine', 'pharmaceutical'],
    finance: ['financial', 'investment', 'banking', 'credit', 'loan', 'insurance', 'portfolio', 'equity', 'revenue', 'profit'],
    retail: ['product', 'shopping', 'price', 'discount', 'sale', 'customer', 'purchase', 'order', 'shipping', 'inventory'],
    education: ['education', 'learning', 'course', 'student', 'teacher', 'university', 'school', 'academic', 'study', 'research'],
    legal: ['legal', 'law', 'contract', 'agreement', 'attorney', 'court', 'litigation', 'compliance', 'regulation', 'policy']
  };

  const contentLower = content.toLowerCase();
  let maxScore = 0;
  let detectedIndustry = 'general';

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    const score = keywords.reduce((acc, keyword) => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      return acc + matches;
    }, 0);

    if (score > maxScore) {
      maxScore = score;
      detectedIndustry = industry;
    }
  }

  return detectedIndustry;
}

function createContentChunks(content: string, maxChunkSize: number = 1000): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence.trim();
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [content.substring(0, maxChunkSize)];
}

// Placeholder functions that would integrate with Python services
async function processPDF(documentId: string, filePath: string): Promise<void> {
  console.log(`Starting processing for document ${documentId}...`);
  
  try {
    // This would call the Python PDF processing service
    // Simulate enhanced processing with industry detection - reduced timeout
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate industry detection
    const industries = ['medical', 'finance', 'retail', 'education', 'legal', 'general'];
    const detectedIndustry = industries[Math.floor(Math.random() * industries.length)];
    
    await storage.updateDocumentStatus(documentId, "ready", {
      pages: 10,
      extractedImages: 2,
      detectedIndustry,
      chunkCount: 8,
    });
    
    // Create enhanced sample chunks with industry context
    for (let i = 0; i < 8; i++) {
      const industryContent = getIndustrySpecificContent(detectedIndustry, i + 1);
      await storage.createDocumentChunk({
        documentId,
        content: industryContent,
        chunkIndex: i,
        startPage: Math.floor(i / 2) + 1,
        endPage: Math.floor(i / 2) + 1,
        embedding: null, // Would contain actual embeddings from SentenceTransformers
        metadata: { 
          chunkType: "text", 
          industry: detectedIndustry,
          tokenCount: industryContent.split(' ').length
        },
      });
    }
    
    // Update final document with industry metadata
    const document = await storage.getDocument(documentId);
    if (document) {
      const updatedMetadata = {
        ...(document.metadata || {}),
        detectedIndustry,
        processingComplete: true,
        chunkCount: 8 
      };
      
      // Update document status with enhanced metadata
      await storage.updateDocumentStatus(documentId, "ready", {
        pages: 10,
        extractedImages: 2,
        detectedIndustry,
        chunkCount: 8,
        metadata: updatedMetadata
      });
    }
    
    console.log(`Successfully processed document ${documentId}`);
    
  } catch (error) {
    console.error(`PDF processing error for ${documentId}:`, error);
    await storage.updateDocumentStatus(documentId, "error", { error: error instanceof Error ? error.message : String(error) });
  }
}

// Add endpoint to manually retry stuck documents
async function retryProcessing(documentId: string): Promise<void> {
  console.log(`Retrying processing for document ${documentId}...`);
  const document = await storage.getDocument(documentId);
  if (document && document.status === 'processing') {
    await processPDF(documentId, `uploads/${document.filename}`);
  }
}

async function processRAGQuery(request: QueryRequest, industry?: string, chatMode?: string): Promise<QueryResponse> {
  // Handle comparison mode specially
  if (chatMode === 'comparison' && request.documentIds && request.documentIds.length >= 2) {
    return await processDocumentComparison(request.documentIds, request.message, chatMode);
  }
  
  try {
    // Get the configured API key and model
    const { provider, model, apiKey } = getConfiguredModel();
    
    if (!apiKey) {
      return {
        message: "No AI model is configured. Please set up your API key in the Model Configuration section.",
        sources: [],
        sessionId: request.sessionId,
      };
    }

    // Get relevant document chunks for the query
    const documentChunks = await getRelevantChunks(request.message, request.documentIds);
    
    // Build context from document chunks
    const context = documentChunks.map(chunk => 
      `Document: ${chunk.documentName} (Page ${chunk.page})\n${chunk.content}`
    ).join('\n\n');
    
    // Create industry-specific prompt
    const industryContext = getIndustryContext(industry || 'general');
    const systemPrompt = `You are an expert AI assistant specializing in ${industryContext}.

Your task: Provide comprehensive, helpful answers using the document content provided below.

DOCUMENT CONTEXT:
${context || 'No specific document content available for this query.'}

Instructions:
- Answer confidently using the available document information
- Reference specific documents and page numbers when available  
- Provide detailed, informative responses
- If the question can be answered using the context, do so thoroughly
- Only mention insufficient information if the question is completely unrelated to any provided content`;

    // Make API call to the configured LLM
    const response = await callLLMAPI(provider, model, apiKey, systemPrompt, request.message);
    
    return {
      message: response,
      sources: documentChunks.map(chunk => ({
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        chunkContent: chunk.content.substring(0, 200) + '...',
        page: chunk.page,
        relevance: 0.85,
      })),
      sessionId: request.sessionId,
    };
    
  } catch (error) {
    console.error("RAG Query error:", error);
    return {
      message: `I encountered an error while processing your question: ${error instanceof Error ? error.message : String(error)}. Please try again or check your API configuration.`,
      sources: [],
      sessionId: request.sessionId,
    };
  }
}

function getConfiguredModel(): { provider: string; model: string; apiKey: string } {
  // Get the first configured provider
  for (const [provider, apiKey] of Object.entries(apiKeys)) {
    if (apiKey) {
      // Default to a commonly available model for each provider
      const defaultModels = {
        groq: 'llama3-70b-8192',
        gemini: 'gemini-pro',
        huggingface: 'microsoft/DialoGPT-large'
      };
      
      return {
        provider,
        model: defaultModels[provider as keyof typeof defaultModels] || 'default',
        apiKey
      };
    }
  }
  
  return { provider: '', model: '', apiKey: '' };
}

async function getRelevantChunks(query: string, documentIds?: string[]): Promise<Array<{
  documentId: string;
  documentName: string;
  content: string;
  page: number;
}>> {
  try {
    // Get user documents
    const documents = await storage.getUserDocuments("default-user");
    const relevantDocs = documentIds 
      ? documents.filter(doc => documentIds.includes(doc.id))
      : documents.filter(doc => doc.status === 'ready');
    
    if (relevantDocs.length === 0) {
      return [];
    }
    
    // Get chunks from documents (simplified - in real implementation would use vector search)
    const allChunks = [];
    for (const doc of relevantDocs.slice(0, 3)) { // Limit to 3 docs for performance
      const chunks = await storage.getDocumentChunks(doc.id);
      
      // Simple keyword matching (in real implementation would use embeddings)
      const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 3);
      const relevantChunks = chunks
        .filter(chunk => 
          queryWords.some(word => chunk.content.toLowerCase().includes(word))
        )
        .slice(0, 2) // Top 2 chunks per document
        .map(chunk => ({
          documentId: doc.id,
          documentName: doc.originalName,
          content: chunk.content,
          page: chunk.startPage || 1
        }));
      
      allChunks.push(...relevantChunks);
    }
    
    return allChunks.slice(0, 5); // Limit total chunks
  } catch (error) {
    console.error("Error getting relevant chunks:", error);
    return [];
  }
}

async function callLLMAPI(provider: string, model: string, apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  try {
    switch (provider.toLowerCase()) {
      case 'groq':
        return await callGroqAPI(model, apiKey, systemPrompt, userMessage);
      case 'gemini':
      case 'google':
        return await callGeminiAPI(model, apiKey, systemPrompt, userMessage);
      case 'huggingface':
        return await callHuggingFaceAPI(model, apiKey, systemPrompt, userMessage);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    throw new Error(`LLM API call failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function callGroqAPI(model: string, apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
}

async function processDocumentComparison(documentIds: string[], question: string, mode: string): Promise<QueryResponse> {
  try {
    // Get documents to compare
    const documents = await Promise.all(
      documentIds.map(id => storage.getDocument(id))
    );
    
    const validDocuments = documents.filter((doc): doc is NonNullable<typeof doc> => 
      doc !== null && doc !== undefined && doc.status === 'ready'
    );
    
    if (validDocuments.length < 2) {
      return {
        message: "I need at least 2 ready documents to perform a comparison. Please ensure your documents have finished processing.",
        sources: [],
        sessionId: "",
      };
    }
    
    // Get chunks from each document
    const documentChunks = await Promise.all(
      validDocuments.map(async (doc) => {
        const chunks = await storage.getDocumentChunks(doc.id);
        return {
          document: doc,
          chunks: chunks.slice(0, 3) // Get top 3 chunks per document
        };
      })
    );
    
    // Build comparison response
    const comparisonSources = documentChunks.flatMap(({document, chunks}) => 
      chunks.map(chunk => ({
        documentId: document.id,
        documentName: document.originalName,
        chunkContent: chunk.content,
        page: chunk.startPage || 1,
        relevance: 0.85,
      }))
    );
    
    // Generate comparison message
    const docNames = validDocuments.map(doc => doc.originalName).join(' vs ');
    const industries = validDocuments.map(doc => doc.industry || 'general');
    const uniqueIndustries = Array.from(new Set(industries));
    
    const industryContext = uniqueIndustries.length > 1 
      ? `Comparing documents from different industries: ${uniqueIndustries.join(', ')}.`
      : `Comparing ${uniqueIndustries[0]} documents.`;
    
    const comparisonMessage = `${industryContext}

**Document Comparison: ${docNames}**

Comparing your question: "${question}"

**Document A (${validDocuments[0]?.originalName || 'Unknown'}):**
- Industry: ${validDocuments[0]?.industry || 'general'}
- ${documentChunks[0]?.chunks.length || 0} relevant sections found
- Key content: ${documentChunks[0]?.chunks[0]?.content.substring(0, 150) || 'No content available'}...

**Document B (${validDocuments[1]?.originalName || 'Unknown'}):**
- Industry: ${validDocuments[1]?.industry || 'general'}  
- ${documentChunks[1]?.chunks.length || 0} relevant sections found
- Key content: ${documentChunks[1]?.chunks[0]?.content.substring(0, 150) || 'No content available'}...

**Key Differences:**
- Industry focus: ${validDocuments[0]?.industry || 'general'} vs ${validDocuments[1]?.industry || 'general'}
- Content approach: Both documents address similar themes but from different perspectives
- Document structure: Organized differently to serve their respective purposes

**Similarities:**
- Both documents contain relevant information related to your query
- Similar technical depth and detail level
- Complementary information that provides a comprehensive view

This comparison shows how different documents can provide complementary insights on your question.`;

    return {
      message: comparisonMessage,
      sources: comparisonSources,
      sessionId: "",
    };
    
  } catch (error) {
    console.error("Document comparison error:", error);
    return {
      message: `Error comparing documents: ${error instanceof Error ? error.message : String(error)}`,
      sources: [],
      sessionId: "",
    };
  }
}

function getIndustrySpecificContent(industry: string, chunkIndex: number): string {
  const industryContent = {
    medical: [
      "Patient diagnosis and treatment protocols show significant improvement with new medication regimen. Clinical studies indicate 85% success rate in symptom reduction.",
      "Healthcare provider guidelines recommend regular monitoring of vital signs. Blood pressure readings should be documented every 4 hours during treatment.",
      "Medical research demonstrates the effectiveness of combination therapy. Pharmaceutical interventions show better outcomes when paired with lifestyle modifications.",
      "Clinical trials indicate positive patient outcomes. Treatment protocols have been updated based on latest medical research findings.",
      "Healthcare data analysis reveals trends in patient recovery. Medical professionals report improved treatment success rates.",
      "Patient care protocols have been enhanced. Clinical guidelines now include new diagnostic criteria for better healthcare outcomes.",
      "Medical equipment calibration shows optimal performance. Healthcare facilities report improved diagnostic accuracy with new protocols.",
      "Pharmaceutical analysis indicates drug efficacy. Clinical studies confirm safety profiles meet medical standards."
    ],
    finance: [
      "Financial portfolio analysis shows diversified investment strategy. Asset allocation across multiple sectors reduces overall risk exposure significantly.",
      "Banking regulations require enhanced compliance measures. Financial institutions must maintain adequate capital reserves per regulatory guidelines.",
      "Investment portfolio performance demonstrates strong quarterly returns. Market analysis indicates favorable conditions for continued growth.",
      "Financial risk assessment shows moderate exposure levels. Investment strategies are aligned with market volatility expectations.",
      "Banking operations report improved efficiency metrics. Financial services automation has reduced processing time by 40%.",
      "Investment analysis reveals market trends. Financial forecasting models predict stable returns in the upcoming fiscal quarter.",
      "Credit risk evaluation shows acceptable parameters. Financial lending practices maintain conservative approach to risk management.",
      "Accounting procedures ensure regulatory compliance. Financial reporting standards are maintained according to industry requirements."
    ],
    retail: [
      "Product inventory management shows optimized stock levels. Sales data indicates strong customer demand for seasonal merchandise categories.",
      "Customer satisfaction surveys report high service ratings. Retail operations have improved customer experience through enhanced product selection.",
      "Sales performance analysis reveals growth trends. Retail metrics show increased customer retention and improved purchase frequency.",
      "Product marketing campaigns demonstrate effectiveness. Customer engagement with promotional activities has increased by 30%.",
      "Retail supply chain optimization reduces costs. Inventory turnover rates have improved through better demand forecasting.",
      "Customer feedback indicates product quality satisfaction. Retail brand reputation has strengthened through quality improvements.",
      "Sales data analysis shows seasonal patterns. Retail strategies have been adjusted to optimize inventory for peak periods.",
      "Product line expansion shows positive results. Customer response to new merchandise categories exceeds expectations."
    ],
    education: [
      "Student performance assessment shows improved learning outcomes. Academic achievement scores have increased by 15% over the semester.",
      "Educational curriculum design enhances learning experience. Course materials have been updated to reflect current industry standards.",
      "Academic research methodology guides student projects. University guidelines ensure rigorous scholarly standards for all assignments.",
      "Learning management system improves student engagement. Educational technology integration has enhanced classroom interaction.",
      "Student feedback indicates course satisfaction. Academic programs have been refined based on learner experience evaluations.",
      "Educational assessment criteria ensure fair evaluation. Grading standards maintain consistency across all academic departments.",
      "University research programs demonstrate innovation. Academic collaboration has produced significant scholarly contributions.",
      "Student support services enhance academic success. Educational counseling programs have improved retention rates."
    ],
    legal: [
      "Contract analysis reveals compliance requirements. Legal framework ensures all agreements meet regulatory standards and client obligations.",
      "Litigation strategy development shows case strengths. Legal precedent research supports favorable outcome probability in court proceedings.",
      "Legal compliance audit indicates adherence levels. Regulatory requirements are met according to current jurisdiction standards.",
      "Contract negotiation resulted in favorable terms. Legal review ensures all clauses protect client interests and minimize liability.",
      "Court filing documentation meets all requirements. Legal procedures have been followed according to established protocols.",
      "Legal risk assessment shows manageable exposure. Attorney recommendations include strategic approaches to minimize potential issues.",
      "Contract dispute resolution shows positive outcome. Legal mediation process successfully addressed all parties' concerns.",
      "Legal documentation review ensures accuracy. Attorney oversight maintains high standards for all client agreements."
    ],
    general: [
      "Document analysis reveals key information patterns. Content structure provides comprehensive overview of the subject matter.",
      "Information processing shows systematic organization. Data presentation follows logical sequence for improved understanding.",
      "Content review indicates thorough coverage. Document sections address all relevant aspects of the topic systematically.",
      "Data analysis shows consistent methodology. Information gathering follows established research and documentation standards.",
      "Document structure enhances readability. Content organization supports clear communication of complex information.",
      "Information synthesis provides comprehensive view. Document content integrates multiple perspectives for balanced analysis.",
      "Content validation ensures accuracy standards. Document review process maintains high quality information presentation.",
      "Data interpretation supports conclusions. Document analysis provides evidence-based insights for decision making."
    ]
  };
  
  const content = industryContent[industry as keyof typeof industryContent] || industryContent.general;
  return content[chunkIndex % content.length];
}

function getCurrentSelectedModel(): string {
  // Return the first available model from configured API keys
  for (const [provider, apiKey] of Object.entries(apiKeys)) {
    if (apiKey) {
      return `${provider} (configured)`;
    }
  }
  return 'No model configured';
}

function getIndustryContext(industry: string): string {
  const contexts = {
    medical: 'Healthcare and medical document analysis with focus on clinical terminology and research',
    finance: 'Financial document analysis with emphasis on metrics, risk assessment, and compliance',
    retail: 'Retail and commerce analysis focusing on market trends and customer insights',
    education: 'Academic content analysis for educational materials and research papers',
    legal: 'Legal document analysis with attention to contracts and case law',
    general: 'General document analysis and content extraction'
  };
  
  return contexts[industry as keyof typeof contexts] || contexts.general;
}

async function processVoiceToText(audioData: string): Promise<string> {
  // This would use Whisper for transcription
  // For now, return placeholder
  return "This is a transcription of the voice input.";
}

async function processTextToSpeech(text: string, voice?: string): Promise<string> {
  try {
    // For browser compatibility, we'll implement client-side TTS
    // Return empty string to signal client should handle TTS
    console.log(`TTS requested for: "${text.substring(0, 50)}..."`);
    return "";
  } catch (error) {
    console.error("TTS error:", error);
    return "";
  }
}

async function getProviderModels(provider: string): Promise<ProviderModelsResponse> {
  const apiKey = apiKeys[provider];
  
  if (!apiKey) {
    return {
      provider,
      models: [],
      isValid: false,
      error: "API key not configured"
    };
  }

  try {
    switch (provider.toLowerCase()) {
      case 'groq':
        return await getGroqModels(apiKey);
      case 'gemini':
      case 'google':
        return await getGeminiModels(apiKey);
      case 'huggingface':
        return await getHuggingFaceModels(apiKey);
      default:
        return {
          provider,
          models: [],
          isValid: false,
          error: "Unknown provider"
        };
    }
  } catch (error) {
    return {
      provider,
      models: [],
      isValid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function getGroqModels(apiKey: string): Promise<ProviderModelsResponse> {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  const models = data.data.map((model: any) => ({
    id: model.id,
    name: model.id,
    description: `Groq ${model.id}`,
    contextLength: model.context_window || 32768,
    provider: 'groq'
  }));

  return {
    provider: 'groq',
    models,
    isValid: true
  };
}

async function getGeminiModels(apiKey: string): Promise<ProviderModelsResponse> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const models = data.models
    .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model: any) => ({
      id: model.name.split('/').pop(),
      name: model.displayName || model.name.split('/').pop(),
      description: model.description || `Google ${model.displayName}`,
      contextLength: model.inputTokenLimit || 32768,
      provider: 'gemini'
    }));

  return {
    provider: 'gemini',
    models,
    isValid: true
  };
}

async function getHuggingFaceModels(apiKey: string): Promise<ProviderModelsResponse> {
  // For HuggingFace, we'll provide a curated list of popular text generation models
  // since their API doesn't have a models endpoint that lists all available models
  const popularModels = [
    {
      id: "microsoft/DialoGPT-large",
      name: "DialoGPT Large",
      description: "Conversational AI model by Microsoft",
      contextLength: 2048,
      provider: 'huggingface'
    },
    {
      id: "gpt2",
      name: "GPT-2",
      description: "OpenAI's GPT-2 model",
      contextLength: 1024,
      provider: 'huggingface'
    },
    {
      id: "distilgpt2",
      name: "DistilGPT-2",
      description: "Lightweight version of GPT-2",
      contextLength: 1024,
      provider: 'huggingface'
    },
    {
      id: "microsoft/DialoGPT-medium",
      name: "DialoGPT Medium",
      description: "Medium-sized conversational AI model",
      contextLength: 1024,
      provider: 'huggingface'
    }
  ];

  // Test if API key is valid by making a simple request
  try {
    const testResponse = await fetch("https://api-inference.huggingface.co/models/gpt2", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: "test" })
    });

    if (testResponse.status === 401) {
      throw new Error("Invalid API key");
    }

    return {
      provider: 'huggingface',
      models: popularModels,
      isValid: true
    };
  } catch (error) {
    throw new Error(`HuggingFace API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function callGeminiAPI(model: string, apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || "I couldn't generate a response. Please try again.";
}

async function callHuggingFaceAPI(model: string, apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      inputs: `${systemPrompt}\n\nUser: ${userMessage}`,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        do_sample: true
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.replace(`${systemPrompt}\n\nUser: ${userMessage}`, '').trim();
  }
  
  return "I couldn't generate a response. Please try again.";
}

async function testAPIKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    switch (provider.toLowerCase()) {
      case 'groq':
        const groqResponse = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        return groqResponse.ok;
        
      case 'gemini':
      case 'google':
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        return geminiResponse.ok;
        
      case 'huggingface':
        const hfResponse = await fetch("https://api-inference.huggingface.co/models/gpt2", {
          method: 'POST',
          headers: { "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ inputs: "test" })
        });
        return hfResponse.status !== 401;
        
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}
