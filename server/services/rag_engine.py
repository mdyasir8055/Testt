"""
RAG (Retrieval-Augmented Generation) engine that combines vector search with LLM generation.
"""
from typing import List, Dict, Optional, Tuple
from .vector_store import VectorStore, MultiModalVectorStore
from .llm_client import LLMClient
import re

class RAGEngine:
    def __init__(self, vector_store: VectorStore, llm_client: LLMClient):
        """
        Initialize RAG engine.
        
        Args:
            vector_store: Vector store for similarity search
            llm_client: LLM client for text generation
        """
        self.vector_store = vector_store
        self.llm_client = llm_client
        
        # RAG configuration
        self.max_context_length = 4000  # Max tokens for context
        self.min_relevance_score = 0.3  # Minimum similarity score
        self.max_sources = 5  # Maximum number of source chunks
    
    def query(self, 
              question: str, 
              document_ids: Optional[List[str]] = None,
              mode: str = "standard",
              max_sources: int = None) -> Dict:
        """
        Process a query using RAG pipeline.
        
        Args:
            question: User question
            document_ids: Optional filter for specific documents
            mode: Query mode (standard, industry, comparison)
            max_sources: Maximum number of source chunks to use
            
        Returns:
            Dict containing answer, sources, and metadata
        """
        max_sources = max_sources if max_sources is not None else self.max_sources
        
        # Step 1: Retrieve relevant chunks
        search_results = self.vector_store.search(
            question, 
            k=max_sources * 3,  # Get more results for better filtering
            document_ids=document_ids
        )
        
        # Step 2: Filter and rank results
        relevant_chunks = self._filter_chunks(search_results, question)[:max_sources]
        
        if not relevant_chunks:
            return {
                "answer": "I don't have enough relevant information in the uploaded documents to answer this question.",
                "sources": [],
                "confidence": 0.0,
                "mode": mode
            }
        
        # Step 3: Build context for LLM
        context = self._build_context(relevant_chunks, mode)
        
        # Step 4: Generate answer using LLM
        prompt = self._build_prompt(question, context, mode)
        
        try:
            answer = self.llm_client.generate(prompt, max_tokens=800, temperature=0.7)
            
            # Step 5: Format response
            return {
                "answer": answer.strip(),
                "sources": self._format_sources(relevant_chunks),
                "confidence": self._calculate_confidence(relevant_chunks),
                "mode": mode,
                "prompt_tokens": len(prompt.split()),
                "context_chunks": len(relevant_chunks)
            }
            
        except Exception as e:
            return {
                "answer": f"I encountered an error while processing your question: {str(e)}",
                "sources": self._format_sources(relevant_chunks),
                "confidence": 0.0,
                "mode": mode,
                "error": str(e)
            }
    
    def compare_documents(self, question: str, document_ids: List[str]) -> Dict:
        """
        Compare content across multiple documents.
        
        Args:
            question: Comparison question
            document_ids: List of document IDs to compare
            
        Returns:
            Comparison result with side-by-side analysis
        """
        if len(document_ids) < 2:
            return {
                "answer": "I need at least two documents to perform a comparison.",
                "sources": [],
                "confidence": 0.0,
                "mode": "comparison"
            }
        
        # Get relevant chunks from each document
        doc_results = {}
        all_sources = []
        
        for doc_id in document_ids:
            results = self.vector_store.search(question, k=5, document_ids=[doc_id])
            filtered = self._filter_chunks(results, question)[:3]  # Get more chunks per document
            doc_results[doc_id] = filtered
            all_sources.extend(filtered)
        
        if not any(doc_results.values()):
            return {
                "answer": "I couldn't find relevant information in the provided documents to make a comparison.",
                "sources": [],
                "confidence": 0.0,
                "mode": "comparison"
            }
        
        # Build comparison context
        context = self._build_comparison_context(doc_results, question)
        prompt = self._build_comparison_prompt(question, context)
        
        try:
            answer = self.llm_client.generate(prompt, max_tokens=1200, temperature=0.7)
            
            return {
                "answer": answer.strip(),
                "sources": self._format_sources(all_sources),
                "confidence": self._calculate_confidence(all_sources),
                "mode": "comparison",
                "documents_compared": len(document_ids)
            }
            
        except Exception as e:
            return {
                "answer": f"Error during comparison: {str(e)}",
                "sources": self._format_sources(all_sources),
                "confidence": 0.0,
                "mode": "comparison",
                "error": str(e)
            }
    
    def _filter_chunks(self, search_results: List[Dict], question: str) -> List[Dict]:
        """Filter and rank chunks based on relevance and quality."""
        filtered = []
        
        # Extract question keywords for better matching
        question_keywords = self._extract_keywords(question)
        
        for result in search_results:
            # Skip chunks with low relevance scores
            if result['score'] < self.min_relevance_score:
                continue
                
            # Skip very short chunks
            if len(result['text'].strip()) < 50:
                continue
            
            # Add quality score based on various factors
            quality_score = self._calculate_quality_score(result, question, question_keywords)
            result['quality_score'] = quality_score
            
            filtered.append(result)
        
        # Sort by combined score (relevance + quality)
        filtered.sort(key=lambda x: x['score'] * 0.6 + x['quality_score'] * 0.4, reverse=True)
        
        # Ensure diversity of content by avoiding too similar chunks
        diverse_filtered = self._ensure_diversity(filtered)
        
        return diverse_filtered
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from text."""
        # Remove common stop words
        stop_words = {'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                     'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 
                     'about', 'like', 'through', 'over', 'before', 'after', 'between', 
                     'under', 'above', 'of', 'during', 'what', 'when', 'where', 'why', 
                     'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'some', 
                     'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 
                     'too', 'very', 'can', 'will', 'just', 'should', 'now'}
        
        # Tokenize and filter
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords
    
    def _ensure_diversity(self, chunks: List[Dict], similarity_threshold: float = 0.8) -> List[Dict]:
        """Ensure diversity by removing too similar chunks."""
        if not chunks:
            return []
            
        diverse_chunks = [chunks[0]]  # Start with the highest ranked chunk
        
        for chunk in chunks[1:]:
            # Check if this chunk is too similar to any already selected chunk
            too_similar = False
            for selected_chunk in diverse_chunks:
                # Simple text overlap similarity
                similarity = self._calculate_text_similarity(chunk['text'], selected_chunk['text'])
                if similarity > similarity_threshold:
                    too_similar = True
                    break
            
            if not too_similar:
                diverse_chunks.append(chunk)
                
            # Stop once we have enough diverse chunks
            if len(diverse_chunks) >= self.max_sources:
                break
                
        return diverse_chunks
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple text similarity based on word overlap."""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def _calculate_quality_score(self, chunk: Dict, question: str, question_keywords: List[str]) -> float:
        """Calculate quality score for a chunk."""
        text = chunk['text'].lower()
        question_lower = question.lower()
        
        score = 0.0
        
        # Keyword overlap
        text_words = set(text.split())
        keyword_overlap = sum(1 for keyword in question_keywords if keyword in text_words)
        if question_keywords:
            score += (keyword_overlap / len(question_keywords)) * 0.4
        
        # Text length (prefer medium-length chunks)
        text_len = len(text.split())
        if 100 <= text_len <= 300:
            score += 0.3
        elif 50 <= text_len < 100 or 300 < text_len <= 500:
            score += 0.2
        elif text_len < 50:
            score -= 0.1
        
        # Sentence completeness
        if text.endswith('.') or text.endswith('!') or text.endswith('?'):
            score += 0.1
        
        # Information density (avoid repetitive text)
        unique_words = len(set(text.split()))
        total_words = len(text.split())
        if total_words > 0:
            density = unique_words / total_words
            score += density * 0.2
        
        # Check for exact phrase matches
        question_phrases = self._extract_phrases(question_lower)
        for phrase in question_phrases:
            if phrase in text and len(phrase.split()) > 1:
                score += 0.2
                break
        
        # Check for presence of numbers if question asks for numerical data
        if any(word in question_lower for word in ['how many', 'how much', 'number', 'amount', 'percentage', 'rate']):
            if re.search(r'\d+', text):
                score += 0.2
        
        return min(score, 1.0)
    
    def _extract_phrases(self, text: str) -> List[str]:
        """Extract meaningful phrases from text."""
        # Simple phrase extraction - can be improved with NLP
        phrases = []
        
        # Extract quoted phrases
        quoted = re.findall(r'"([^"]*)"', text)
        phrases.extend(quoted)
        
        # Extract noun phrases (simplified)
        words = text.split()
        for i in range(len(words) - 1):
            if words[i] not in ['a', 'an', 'the', 'in', 'on', 'at', 'by', 'for', 'with']:
                phrases.append(' '.join(words[i:i+2]))
        
        return phrases
    
    def _build_context(self, chunks: List[Dict], mode: str) -> str:
        """Build context string from relevant chunks."""
        context_parts = []
        
        for i, chunk in enumerate(chunks):
            doc_id = chunk['document_id']
            page = chunk['metadata'].get('page', 'Unknown')
            text = chunk['text'].strip()
            
            context_parts.append(f"[Source {i+1} - Document: {doc_id}, Page: {page}]\n{text}\n")
        
        context = "\n".join(context_parts)
        
        # Truncate if too long
        if len(context.split()) > self.max_context_length:
            words = context.split()[:self.max_context_length]
            context = " ".join(words) + "... [truncated]"
        
        return context
    
    def _build_comparison_context(self, doc_results: Dict[str, List[Dict]], question: str) -> str:
        """Build context for document comparison."""
        context_parts = []
        
        for doc_id, chunks in doc_results.items():
            if not chunks:
                context_parts.append(f"\n--- Document {doc_id} ---\nNo relevant content found.\n")
                continue
                
            context_parts.append(f"\n--- Document {doc_id} ---")
            for chunk in chunks:
                page = chunk['metadata'].get('page', 'Unknown')
                text = chunk['text'].strip()
                context_parts.append(f"Page {page}: {text}")
        
        return "\n".join(context_parts)
    
    def _build_prompt(self, question: str, context: str, mode: str) -> str:
        """Build prompt for the LLM."""
        base_instructions = {
            "standard": "You are an AI assistant that answers questions based on provided document content.",
            "industry": "You are an AI assistant specializing in industry-specific document analysis.",
            "medical": "You are an AI assistant with expertise in medical document analysis. Provide accurate, evidence-based responses.",
            "finance": "You are an AI assistant with expertise in financial document analysis.",
            "retail": "You are an AI assistant with expertise in retail and product documentation.",
            "education": "You are an AI assistant with expertise in educational content analysis."
        }
        
        instruction = base_instructions.get(mode, base_instructions["standard"])
        
        prompt = f"""{instruction}

Please answer the following question based ONLY on the provided context from the documents. If the context doesn't contain enough information to answer the question completely, say so clearly.

CONTEXT:
{context}

QUESTION: {question}

INSTRUCTIONS:
- Base your answer strictly on the provided context
- If information is not available in the context, state this clearly
- Provide specific references to source documents and pages when possible
- Be concise but comprehensive
- If the question asks for something not covered in the documents, explain what information is missing
- Ensure your answer is well-structured and easy to understand
- If appropriate, use bullet points or numbered lists for clarity

ANSWER:"""

        return prompt
    
    def _build_comparison_prompt(self, question: str, context: str) -> str:
        """Build prompt for document comparison."""
        prompt = f"""You are an AI assistant that specializes in comparing and contrasting information across multiple documents.

Please compare the information from the different documents provided in the context below, focusing on the specific question asked.

CONTEXT FROM MULTIPLE DOCUMENTS:
{context}

COMPARISON QUESTION: {question}

INSTRUCTIONS:
- Compare and contrast the information from each document
- Highlight similarities and differences
- Point out any contradictions or complementary information
- Reference specific documents and pages
- If any document lacks relevant information, mention this
- Provide a balanced analysis based on the available content
- Structure your response with clear sections:
  1. Similarities
  2. Differences
  3. Key Insights
- Use bullet points for clarity where appropriate

COMPARISON ANALYSIS:"""

        return prompt
    
    def _format_sources(self, chunks: List[Dict]) -> List[Dict]:
        """Format source chunks for response."""
        sources = []
        
        for chunk in chunks:
            doc_id = chunk['document_id']
            page = chunk['metadata'].get('page')
            text = chunk['text'][:200] + "..." if len(chunk['text']) > 200 else chunk['text']
            
            sources.append({
                "document_id": doc_id,
                "document_name": f"{doc_id}.pdf",  # In real implementation, get actual filename
                "chunk_content": text,
                "page": page,
                "relevance": round(chunk['score'], 3)
            })
        
        return sources
    
    def _calculate_confidence(self, chunks: List[Dict]) -> float:
        """Calculate confidence score for the response."""
        if not chunks:
            return 0.0
        
        # Average relevance score
        avg_score = sum(chunk['score'] for chunk in chunks) / len(chunks)
        
        # Adjust based on number of sources
        source_factor = min(len(chunks) / 3, 1.0)  # More sources = higher confidence
        
        # Adjust based on quality scores
        avg_quality = sum(chunk.get('quality_score', 0.5) for chunk in chunks) / len(chunks)
        
        # Combine factors
        confidence = avg_score * 0.6 + source_factor * 0.2 + avg_quality * 0.2
        
        return round(confidence, 3)
    
    def get_stats(self) -> Dict:
        """Get RAG engine statistics."""
        vector_stats = self.vector_store.get_stats()
        
        return {
            "vector_store": vector_stats,
            "configuration": {
                "max_context_length": self.max_context_length,
                "min_relevance_score": self.min_relevance_score,
                "max_sources": self.max_sources
            }
        }

# Example usage
if __name__ == "__main__":
    from .vector_store import VectorStore
    from .llm_client import GroqClient
    
    # Initialize components
    vector_store = VectorStore()
    llm_client = GroqClient()
    rag_engine = RAGEngine(vector_store, llm_client)
    
    # Sample usage would go here
    print("RAG Engine initialized")