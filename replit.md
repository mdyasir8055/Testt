# Replit Configuration File

## Overview

This is a PDF Knowledge Retrieval Chatbot application that enables users to upload PDF documents and interact with them using natural language queries. The system provides a comprehensive RAG (Retrieval-Augmented Generation) implementation with support for multiple AI models, voice interaction, and industry-specific modes. Built as a full-stack application with a React frontend and Express.js backend, it features document processing capabilities including text extraction, chunking, embedding generation, and vector similarity search.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable interface elements
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **File Handling**: React Dropzone for drag-and-drop PDF uploads
- **Voice Features**: Custom hooks for speech-to-text and text-to-speech functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for type safety and modern JavaScript features
- **Development**: TSX for running TypeScript directly in development mode
- **File Upload**: Multer middleware for handling multipart/form-data file uploads
- **API Design**: RESTful endpoints with structured error handling and request logging

### Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL for cloud deployment
- **Session Storage**: Connect-pg-simple for PostgreSQL-based session storage
- **In-Memory Fallback**: Memory-based storage implementation for development/testing

### Document Processing Pipeline
- **PDF Processing**: PyMuPDF (fitz) for text extraction and document parsing
- **Text Chunking**: Configurable chunk sizes (500-1000 tokens) with overlap for context preservation
- **OCR Support**: Tesseract.js for optical character recognition of images and scanned content
- **Image Extraction**: PDF2Image for converting PDF pages to images when needed

### Vector Search and Embeddings
- **Vector Store**: FAISS (Facebook AI Similarity Search) for efficient similarity search
- **Embeddings**: SentenceTransformers with models like all-MiniLM-L6-v2 for generating text embeddings
- **Search Strategy**: Cosine similarity with relevance scoring and configurable thresholds
- **Chunking Strategy**: Overlapping text windows with metadata preservation for better retrieval

### AI/LLM Integration
- **Multiple Providers**: Support for Groq, Google Gemini, and Hugging Face models
- **Model Selection**: User-configurable model choice with free-tier focus
- **RAG Pipeline**: Retrieval-Augmented Generation combining vector search with LLM generation
- **Context Management**: Smart context window management with token counting and optimization

### Voice Processing Features
- **Speech-to-Text**: OpenAI Whisper for high-quality voice input transcription
- **Text-to-Speech**: Multiple TTS options including pyttsx3 and Google TTS (gTTS)
- **Audio Handling**: Browser MediaRecorder API for voice input capture
- **Voice Controls**: Real-time voice interaction with visual feedback

### Database Schema Design
- **Users Table**: User authentication and profile management
- **Documents Table**: PDF metadata, processing status, and file information
- **Document Chunks Table**: Text chunks with embeddings and positional metadata
- **Chat Sessions Table**: Conversation management with mode and settings
- **Chat Messages Table**: Message history with source references and metadata

### Authentication and Session Management
- **Session-based Auth**: Express sessions with PostgreSQL storage
- **User Management**: Username/password authentication with secure password handling
- **File Access Control**: User-scoped document access and permissions

### API Structure
- **Document Endpoints**: Upload, processing status, and listing operations
- **Chat Endpoints**: Session management, message handling, and query processing
- **Voice Endpoints**: Speech processing and audio generation
- **Status Endpoints**: Health checks and processing status monitoring

### Chat Modes and Features
- **Standard Q&A**: Basic question-answering over uploaded documents
- **Industry-Specific**: Specialized modes for medical, finance, retail, and education domains
- **Comparison Mode**: Side-by-side analysis of multiple documents
- **Voice Interaction**: Full voice input/output capabilities with real-time processing

## External Dependencies

### Core Frameworks and Libraries
- **React 18**: Frontend framework with hooks and modern features
- **Express.js**: Node.js web application framework
- **TypeScript**: Static typing for JavaScript
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework

### Database and ORM
- **Drizzle ORM**: TypeScript-first ORM with excellent type safety
- **PostgreSQL**: Primary database for persistent storage
- **Neon Database**: Serverless PostgreSQL provider
- **Connect-pg-simple**: PostgreSQL session store for Express

### UI Components and Styling
- **Radix UI**: Unstyled, accessible UI primitives
- **Shadcn/ui**: Pre-styled components built on Radix UI
- **Lucide React**: Icon library with tree-shaking support
- **Class Variance Authority**: Utility for creating component variants

### File Processing and AI
- **PyMuPDF**: PDF processing and text extraction
- **Sentence-Transformers**: Neural text embeddings
- **FAISS**: Vector similarity search
- **OpenAI Whisper**: Speech-to-text processing
- **Groq API**: Fast inference for language models
- **Google Gemini**: Google's language model API

### Development and Build Tools
- **TSX**: TypeScript execution for Node.js
- **ESBuild**: Fast JavaScript bundler for production
- **PostCSS**: CSS processing with autoprefixer
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation library

### Voice and Media Processing
- **Tesseract.js**: OCR for text recognition in images
- **PDF2Image**: Convert PDF pages to images
- **pyttsx3**: Text-to-speech engine
- **gTTS**: Google Text-to-Speech API
- **MediaRecorder API**: Browser audio recording

### State Management and HTTP
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing for React
- **Multer**: File upload middleware for Express
- **React Dropzone**: Drag-and-drop file uploads