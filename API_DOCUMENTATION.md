# API Documentation

Complete API reference for the PDF Knowledge Retrieval Chatbot application.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently uses session-based authentication with a default user. In production, implement proper authentication middleware.

## Document Management API

### Upload PDF Document
Upload a PDF file for processing and analysis.

**Endpoint:** `POST /api/documents/upload`  
**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: PDF file (required)
userId: string (optional, defaults to "default-user")
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "default-user",
  "filename": "generated-filename.pdf",
  "originalName": "document.pdf",
  "size": 1234567,
  "mimeType": "application/pdf",
  "sourceType": "pdf",
  "sourceUrl": null,
  "status": "processing",
  "uploadedAt": "2024-08-27T10:30:00.000Z",
  "processedAt": null,
  "metadata": null,
  "industry": null,
  "chunkCount": 0
}
```

**Error Responses:**
- `400 Bad Request`: No file uploaded or invalid file type
- `500 Internal Server Error`: Upload processing failed

---

### Upload from URL
Fetch and process content from a web URL.

**Endpoint:** `POST /api/documents/upload-url`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "url": "https://example.com/product-page",
  "userId": "default-user"
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "default-user", 
  "filename": "url_1756293402882.html",
  "originalName": "example.com - Web Content",
  "size": 0,
  "mimeType": "text/html",
  "sourceType": "url",
  "sourceUrl": "https://example.com/product-page",
  "status": "processing",
  "uploadedAt": "2024-08-27T10:30:00.000Z",
  "processedAt": null,
  "metadata": {
    "sourceUrl": "https://example.com/product-page"
  },
  "industry": null,
  "chunkCount": 0
}
```

**Error Responses:**
- `400 Bad Request`: URL required or invalid URL format
- `500 Internal Server Error`: URL processing failed

---

### Get Document Status
Check the processing status of a specific document.

**Endpoint:** `GET /api/documents/{id}/status`

**Response:**
```json
{
  "id": "uuid",
  "status": "ready",
  "chunkCount": 8,
  "industry": "medical"
}
```

**Status Values:**
- `processing`: Document is being processed
- `ready`: Document is ready for queries
- `error`: Processing failed

---

### List User Documents
Get all documents for the current user.

**Endpoint:** `GET /api/documents`  
**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "default-user",
    "filename": "document.pdf",
    "originalName": "Document.pdf",
    "size": 1234567,
    "mimeType": "application/pdf",
    "sourceType": "pdf",
    "sourceUrl": null,
    "status": "ready",
    "uploadedAt": "2024-08-27T10:30:00.000Z",
    "processedAt": "2024-08-27T10:30:05.000Z",
    "metadata": {
      "pages": 10,
      "extractedImages": 2,
      "detectedIndustry": "medical",
      "chunkCount": 8
    },
    "industry": "medical",
    "chunkCount": 8
  }
]
```

---

### Retry Document Processing
Manually retry processing for a stuck document.

**Endpoint:** `POST /api/documents/{id}/retry`

**Response:**
```json
{
  "success": true,
  "message": "Processing retry initiated"
}
```

## Chat API

### Create Chat Session
Create a new chat session for conversation management.

**Endpoint:** `POST /api/chat/sessions`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "title": "New Chat Session",
  "mode": "standard",
  "settings": {
    "model": "llama3-70b-8192",
    "temperature": 0.7
  },
  "userId": "default-user"
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "default-user",
  "title": "New Chat Session",
  "mode": "standard",
  "settings": {
    "model": "llama3-70b-8192",
    "temperature": 0.7
  },
  "createdAt": "2024-08-27T10:30:00.000Z",
  "updatedAt": "2024-08-27T10:30:00.000Z"
}
```

---

### Get Chat Sessions
Retrieve all chat sessions for a user.

**Endpoint:** `GET /api/chat/sessions`  
**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "default-user",
    "title": "Chat Session 1",
    "mode": "standard",
    "settings": {},
    "createdAt": "2024-08-27T10:30:00.000Z",
    "updatedAt": "2024-08-27T10:30:00.000Z"
  }
]
```

---

### Get Chat Messages
Retrieve all messages for a specific chat session.

**Endpoint:** `GET /api/chat/sessions/{sessionId}/messages`

**Response:**
```json
[
  {
    "id": "uuid",
    "sessionId": "session-uuid",
    "role": "user",
    "content": "What is the main topic of the document?",
    "sources": null,
    "metadata": null,
    "createdAt": "2024-08-27T10:30:00.000Z"
  },
  {
    "id": "uuid",
    "sessionId": "session-uuid",
    "role": "assistant",
    "content": "Based on the provided documents, the main topic is...",
    "sources": [
      {
        "documentId": "doc-uuid",
        "documentName": "document.pdf",
        "chunkContent": "Relevant content snippet...",
        "page": 1,
        "relevance": 0.85
      }
    ],
    "metadata": {
      "model": "llama3-70b-8192",
      "processingTime": 1234
    },
    "createdAt": "2024-08-27T10:30:05.000Z"
  }
]
```

---

### Send Chat Query
Send a question and get an AI-powered response based on document content.

**Endpoint:** `POST /api/chat/query`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "sessionId": "session-uuid",
  "message": "What are the side effects of this medication?",
  "mode": "standard",
  "documentIds": ["doc-uuid-1", "doc-uuid-2"]
}
```

**Response:**
```json
{
  "message": "Based on the provided documents, the side effects include...",
  "sources": [
    {
      "documentId": "doc-uuid",
      "documentName": "medication-guide.pdf",
      "chunkContent": "Side effects may include nausea, headache...",
      "page": 3,
      "relevance": 0.92
    }
  ],
  "sessionId": "session-uuid"
}
```

**Query Modes:**
- `standard`: General question-answering
- `industry`: Industry-specific analysis
- `comparison`: Document comparison mode

---

### Voice Query
Send a voice query with audio data for speech-to-text processing.

**Endpoint:** `POST /api/chat/voice-query`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "sessionId": "session-uuid",
  "audioData": "base64-encoded-audio-data",
  "mode": "standard"
}
```

**Response:**
```json
{
  "message": "AI response based on transcribed audio...",
  "sources": [...],
  "sessionId": "session-uuid",
  "transcription": "What is the dosage for this medication?"
}
```

---

### Text-to-Speech
Convert text response to audio for playback.

**Endpoint:** `POST /api/chat/text-to-speech`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "text": "The dosage is 50mg twice daily.",
  "voice": "en-US"
}
```

**Response:**
```json
{
  "audioData": ""
}
```

*Note: Currently returns empty string as TTS is handled client-side using Web Speech API.*

---

### Document Comparison
Compare content across multiple documents.

**Endpoint:** `POST /api/chat/compare`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "documentIds": ["doc-uuid-1", "doc-uuid-2"],
  "question": "Compare the treatment approaches in these documents"
}
```

**Response:**
```json
{
  "message": "Document Comparison: document1.pdf vs document2.pdf\n\nComparing your question: \"Compare the treatment approaches\"\n\n**Document A (document1.pdf):**\n- Industry: medical\n- 3 relevant sections found\n- Key content: Treatment approach focuses on...\n\n**Document B (document2.pdf):**\n- Industry: medical\n- 4 relevant sections found\n- Key content: Alternative treatment method includes...",
  "sources": [...],
  "sessionId": ""
}
```

## AI Model Management API

### Set API Key
Configure API key for a specific AI provider.

**Endpoint:** `POST /api/models/set-api-key`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "provider": "groq",
  "apiKey": "gsk_..."
}
```

**Response:**
```json
{
  "success": true,
  "provider": "groq"
}
```

**Supported Providers:**
- `groq`: Groq API
- `gemini`: Google Gemini API  
- `huggingface`: Hugging Face Inference API

---

### Test API Key
Validate an API key for a provider before saving.

**Endpoint:** `POST /api/models/test-key`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "provider": "groq",
  "apiKey": "gsk_..."
}
```

**Response:**
```json
{
  "isValid": true,
  "provider": "groq"
}
```

---

### Get Provider Models
Retrieve available models for a configured provider.

**Endpoint:** `GET /api/models/{provider}`

**Response:**
```json
{
  "provider": "groq",
  "models": [
    {
      "id": "llama3-70b-8192",
      "name": "Llama 3 70B",
      "description": "Meta's Llama 3 70B model optimized for chat",
      "contextLength": 8192,
      "provider": "groq"
    },
    {
      "id": "mixtral-8x7b-32768", 
      "name": "Mixtral 8x7B",
      "description": "Mistral AI's Mixtral 8x7B Sparse Mixture of Experts",
      "contextLength": 32768,
      "provider": "groq"
    }
  ],
  "isValid": true
}
```

**Error Response:**
```json
{
  "provider": "groq",
  "models": [],
  "isValid": false,
  "error": "API key not configured"
}
```

## Data Types

### Document Object
```typescript
interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  sourceType: "pdf" | "url";
  sourceUrl: string | null;
  status: "processing" | "ready" | "error";
  uploadedAt: string;
  processedAt: string | null;
  metadata: object | null;
  industry: string | null;
  chunkCount: number;
}
```

### Chat Message Object
```typescript
interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceChunk[] | null;
  metadata: object | null;
  createdAt: string;
}
```

### Source Chunk Object
```typescript
interface SourceChunk {
  documentId: string;
  documentName: string;
  chunkContent: string;
  page?: number;
  relevance: number;
}
```

### Query Request Object
```typescript
interface QueryRequest {
  sessionId: string;
  message: string;
  mode?: string;
  documentIds?: string[];
}
```

### Query Response Object
```typescript
interface QueryResponse {
  message: string;
  sources: SourceChunk[];
  sessionId: string;
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server processing error

### Error Categories
1. **Validation Errors**: Invalid input data or missing required fields
2. **Processing Errors**: Document processing or AI model failures  
3. **Authentication Errors**: Invalid or missing credentials
4. **Resource Errors**: Requested resource not found or inaccessible
5. **Rate Limit Errors**: API rate limits exceeded

## Rate Limiting

### Current Limits
- Document uploads: 10 per minute per user
- Chat queries: 30 per minute per user
- API key tests: 5 per minute per user

### Rate Limit Headers
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1640995200
```

## Webhooks (Future Feature)

### Document Processing Webhook
Receive notifications when document processing completes.

**URL:** `POST {your-webhook-url}`  
**Content-Type:** `application/json`

**Payload:**
```json
{
  "event": "document.processed",
  "documentId": "uuid",
  "status": "ready",
  "timestamp": "2024-08-27T10:30:00.000Z",
  "metadata": {
    "chunkCount": 8,
    "industry": "medical"
  }
}
```

## SDK and Client Libraries

### JavaScript/TypeScript Client
```typescript
import { PDFChatAPI } from 'pdf-chat-sdk';

const client = new PDFChatAPI({
  baseURL: 'http://localhost:5000/api',
  apiKey: 'your-api-key'
});

// Upload document
const document = await client.documents.upload(file);

// Send query
const response = await client.chat.query({
  sessionId: 'session-id',
  message: 'What is this document about?'
});
```

### Python Client
```python
from pdf_chat_client import PDFChatClient

client = PDFChatClient(
    base_url='http://localhost:5000/api',
    api_key='your-api-key'
)

# Upload document
document = client.documents.upload('document.pdf')

# Send query
response = client.chat.query(
    session_id='session-id',
    message='What is this document about?'
)
```

## API Versioning

### Current Version
All endpoints are currently unversioned. Future versions will include version prefix:
- `v1`: `/api/v1/documents/upload`
- `v2`: `/api/v2/documents/upload`

### Backward Compatibility
- Additive changes (new fields) will not require version bumps
- Breaking changes will require new API versions
- Deprecated versions will be supported for 6 months minimum

## Security

### API Security
- Input validation on all endpoints
- SQL injection protection via parameterized queries
- File upload restrictions and virus scanning
- Rate limiting and DDoS protection

### Data Privacy
- User data isolation by user ID
- Secure session management
- API key encryption at rest
- Document content encrypted in transit

### CORS Configuration
```javascript
// Development
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
};

// Production
const corsOptions = {
  origin: ['https://yourdomain.com'],
  credentials: true
};
```