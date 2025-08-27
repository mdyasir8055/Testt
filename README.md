# PDF Knowledge Retrieval Chatbot

A comprehensive full-stack application that enables users to upload PDF documents and web URLs to create an intelligent knowledge base. Users can interact with their documents using natural language queries, powered by advanced RAG (Retrieval-Augmented Generation) technology with support for multiple AI models, voice interaction, and industry-specific analysis modes.

## Features

### 🚀 Core Functionality
- **Multi-Source Document Processing**: Upload PDF files or fetch content from web URLs
- **Intelligent Document Analysis**: Automatic text extraction, chunking, and industry detection
- **Advanced RAG System**: Vector similarity search with multiple embedding strategies
- **Multi-Model AI Support**: Integration with Groq, Google Gemini, and Hugging Face models
- **Voice Interaction**: Speech-to-text input and text-to-speech output capabilities
- **Industry-Specific Modes**: Specialized analysis for medical, finance, retail, education, and legal content
- **Document Comparison**: Side-by-side analysis of multiple documents
- **Real-time Processing**: Live document status updates and processing feedback

### 🎯 Advanced Features
- **Compliance Filtering**: Industry-specific regulatory compliance checking
- **Smart Context Management**: Optimized context window handling with token counting
- **Session Management**: Persistent chat sessions with conversation history
- **Responsive Design**: Modern UI with dark mode support
- **Real-time Updates**: Live processing status and document management

## Technology Stack

### Frontend
- **React 18** with TypeScript and hooks
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **Shadcn/ui** components built on Radix UI primitives
- **TanStack Query** for server state management
- **Wouter** for lightweight client-side routing
- **React Dropzone** for drag-and-drop file uploads

### Backend
- **Node.js** with Express.js framework
- **TypeScript** with ES modules
- **PostgreSQL** with Drizzle ORM
- **Multer** for file upload handling
- **RESTful API** design with structured error handling

### AI & Processing
- **Multiple LLM Providers**: Groq, Google Gemini, Hugging Face
- **Web Speech API** for voice features
- **Advanced text processing** with industry detection
- **Vector similarity search** for document retrieval
- **Smart content chunking** with overlap preservation

### Database & Storage
- **PostgreSQL** primary database
- **Drizzle ORM** with type-safe schema management
- **Session-based storage** for user data
- **File system storage** for uploaded documents

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### 1. Clone Repository
```bash
git clone <repository-url>
cd pdf-knowledge-chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
PGHOST="localhost"
PGPORT="5432"
PGUSER="your_username"
PGPASSWORD="your_password"
PGDATABASE="your_database"

# API Keys (Optional - can be configured in UI)
GROQ_API_KEY="your_groq_api_key"
GEMINI_API_KEY="your_gemini_api_key"
HUGGINGFACE_API_KEY="your_huggingface_api_key"

# Application Settings
NODE_ENV="development"
PORT="5000"
```

### 4. Database Setup
```bash
# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed database
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn/ui components
│   │   ├── sidebar/        # Sidebar components
│   │   ├── chat/           # Chat interface
│   │   ├── features/       # Feature-specific components
│   │   └── modes/          # Chat mode components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and API client
│   ├── pages/              # Page components
│   └── styles/             # CSS and styling files
├── server/
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database interface
│   ├── index.ts            # Server entry point
│   └── services/           # External service integrations
├── shared/
│   └── schema.ts           # Shared TypeScript types and database schema
├── uploads/                # File storage directory
└── package.json            # Dependencies and scripts
```

## Core Components

### Document Processing Pipeline

#### PDF Processing (`server/routes.ts`)
```typescript
async function processPDF(documentId: string, filePath: string): Promise<void>
```
- Extracts text content from PDF files
- Performs industry detection based on content analysis
- Creates searchable chunks with metadata
- Updates document status and processing information

#### URL Content Processing (`server/routes.ts`)
```typescript
async function processUrlContent(documentId: string, url: string): Promise<void>
```
- Fetches web content with timeout handling
- Cleans HTML and extracts meaningful text
- Performs smart content chunking
- Detects industry context from web content

### AI Integration

#### Multi-Provider Support (`server/routes.ts`)
- **Groq API**: Fast inference with llama3-70b-8192 model
- **Google Gemini**: Advanced reasoning with gemini-pro model  
- **Hugging Face**: Open-source model support

#### RAG Query Processing (`server/routes.ts`)
```typescript
async function processRAGQuery(request: QueryRequest, industry?: string, chatMode?: string): Promise<QueryResponse>
```
- Retrieves relevant document chunks
- Builds context-aware prompts
- Manages token limits and context windows
- Returns structured responses with source citations

### Database Schema

#### Core Tables
```sql
-- Users table for authentication
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

-- Documents table for file and URL sources
CREATE TABLE documents (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'pdf', -- 'pdf' or 'url'
    source_url TEXT, -- for URL-based documents
    status TEXT NOT NULL DEFAULT 'processing',
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    metadata JSONB,
    industry TEXT,
    chunk_count INTEGER DEFAULT 0
);

-- Document chunks for RAG retrieval
CREATE TABLE document_chunks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_page INTEGER,
    end_page INTEGER,
    embedding JSONB, -- vector embeddings
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Chat sessions for conversation management
CREATE TABLE chat_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    title TEXT,
    mode TEXT NOT NULL DEFAULT 'standard',
    settings JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Chat messages for conversation history
CREATE TABLE chat_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    sources JSONB, -- source documents and chunks
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## API Configuration

### Model Setup
1. Navigate to the **Model Configuration** section in the sidebar
2. Choose your preferred AI provider (Groq, Gemini, or Hugging Face)
3. Enter your API key and test the connection
4. Select your preferred model from the available options

### Supported Models
- **Groq**: llama3-70b-8192, mixtral-8x7b-32768, llama3-8b-8192
- **Google Gemini**: gemini-pro, gemini-pro-vision
- **Hugging Face**: DialoGPT-large, GPT-2, DistilGPT-2

## Usage Guide

### Document Upload
1. **PDF Upload**: Drag and drop PDF files or use the browse button
2. **URL Fetch**: Enter any web URL in the URL Fetch tab
3. **Processing**: Documents are automatically processed and made searchable
4. **Status Tracking**: Monitor processing status in real-time

### Chat Interaction
1. **Standard Mode**: General question-answering over documents
2. **Industry Mode**: Specialized analysis for specific industries
3. **Comparison Mode**: Side-by-side document analysis
4. **Voice Input**: Use microphone for speech-to-text queries
5. **Audio Output**: Click listen button for text-to-speech responses

### Advanced Features
- **Source Citations**: All responses include document sources and page references
- **Context Awareness**: AI maintains conversation context across messages
- **Multi-Document Queries**: Ask questions spanning multiple documents
- **Industry Detection**: Automatic content categorization and specialized prompts

## Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run db:generate  # Generate database schema
npm run db:migrate   # Run database migrations
npm run db:studio    # Open database studio
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Style
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Tailwind CSS**: Utility-first styling approach

### Adding New Features
1. **Frontend Components**: Add to `client/src/components/`
2. **API Endpoints**: Add to `server/routes.ts`
3. **Database Changes**: Update `shared/schema.ts` and generate migrations
4. **Types**: Define in `shared/schema.ts` for frontend/backend consistency

## Deployment

### Production Setup
1. **Environment Variables**: Set production environment variables
2. **Database**: Configure production PostgreSQL instance  
3. **Build**: Run `npm run build` to create production bundle
4. **Server**: Use process manager like PM2 for production deployment
5. **Reverse Proxy**: Configure nginx or similar for HTTPS and static file serving

### Security Considerations
- API keys stored securely with environment variables
- Input validation on all endpoints
- SQL injection protection via Drizzle ORM
- File upload restrictions and validation
- CORS configuration for production domains

## Troubleshooting

### Common Issues
1. **Database Connection**: Verify PostgreSQL is running and connection string is correct
2. **File Upload**: Check upload directory permissions and disk space
3. **API Keys**: Ensure valid API keys are configured for chosen AI provider
4. **Memory Issues**: Increase Node.js memory limit for large document processing
5. **CORS Errors**: Configure proper CORS settings for production deployment

### Performance Optimization
- **Document Chunking**: Optimize chunk size for better retrieval performance
- **Database Indexing**: Add indexes on frequently queried columns
- **Caching**: Implement Redis for session and query result caching
- **CDN**: Use CDN for static asset delivery in production

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation for technical details