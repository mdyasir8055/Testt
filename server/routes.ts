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
    await storage.updateDocumentStatus(documentId, "error", { error: error instanceof Error ? error.message : String(error) });
  }
}

async function processRAGQuery(request: QueryRequest, industry?: string, chatMode?: string): Promise<QueryResponse> {
  // This would integrate with Python RAG services and use the selected AI model
  // Industry-specific processing would apply specialized prompts and analysis
  
  const selectedModel = getCurrentSelectedModel(); // Get from API key storage
  const industryContext = getIndustryContext(industry || 'general');
  
  // For now, return a structured response that reflects the industry and mode
  const industrySpecificMessage = industry && industry !== 'general' 
    ? `Analyzing your ${industry} document with specialized ${industry} knowledge. ` 
    : '';
    
  return {
    message: `${industrySpecificMessage}I understand you're asking: "${request.message}". Based on your uploaded documents and using ${selectedModel || 'default'} model, I can help analyze and answer questions about the content.`,
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

async function processTextToSpeech(text: string, voice: string): Promise<string> {
  // This would use TTS service to generate audio
  // For now, return placeholder base64 audio data
  return "base64-encoded-audio-data";
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
