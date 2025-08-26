"""
Vector store service using FAISS for similarity search and SentenceTransformers for embeddings.
"""
import numpy as np
import faiss
import pickle
import os
from typing import List, Dict, Tuple, Optional
from sentence_transformers import SentenceTransformer
import json

class VectorStore:
    def __init__(self, embedding_model: str = "all-MiniLM-L6-v2", dimension: int = 384):
        """
        Initialize vector store with FAISS index and SentenceTransformers model.
        
        Args:
            embedding_model: Name of the SentenceTransformers model
            dimension: Dimension of the embedding vectors
        """
        self.embedding_model = SentenceTransformer(embedding_model)
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
        self.documents = {}  # Store document metadata
        self.chunks = {}     # Store chunk content and metadata
        self.chunk_counter = 0
    
    def add_document(self, document_id: str, chunks: List[Dict], document_metadata: Dict = None):
        """
        Add document chunks to the vector store.
        
        Args:
            document_id: Unique identifier for the document
            chunks: List of text chunks with metadata
            document_metadata: Additional document metadata
        """
        # Store document metadata
        self.documents[document_id] = {
            'metadata': document_metadata or {},
            'chunk_count': len(chunks),
            'chunk_ids': []
        }
        
        # Process chunks
        texts = []
        chunk_ids = []
        
        for chunk in chunks:
            chunk_id = f"{document_id}_{self.chunk_counter}"
            self.chunk_counter += 1
            
            # Store chunk data
            self.chunks[chunk_id] = {
                'document_id': document_id,
                'text': chunk['text'],
                'metadata': chunk,
                'chunk_index': len(texts)
            }
            
            texts.append(chunk['text'])
            chunk_ids.append(chunk_id)
            
        # Generate embeddings
        embeddings = self.embedding_model.encode(texts, convert_to_tensor=False)
        embeddings = np.array(embeddings).astype('float32')
        
        # Normalize for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Add to FAISS index
        self.index.add(embeddings)
        
        # Update document metadata
        self.documents[document_id]['chunk_ids'].extend(chunk_ids)
        
        return len(texts)
    
    def search(self, query: str, k: int = 5, document_ids: Optional[List[str]] = None) -> List[Dict]:
        """
        Search for similar chunks based on query.
        
        Args:
            query: Search query text
            k: Number of results to return
            document_ids: Optional list to filter by specific documents
            
        Returns:
            List of search results with scores and metadata
        """
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query], convert_to_tensor=False)
        query_embedding = np.array(query_embedding).astype('float32')
        faiss.normalize_L2(query_embedding)
        
        # Search in FAISS
        scores, indices = self.index.search(query_embedding, min(k * 2, self.index.ntotal))  # Get more results for filtering
        
        # Process results
        results = []
        chunk_id_list = list(self.chunks.keys())
        
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:  # FAISS returns -1 for invalid indices
                continue
                
            chunk_id = chunk_id_list[idx]
            chunk_data = self.chunks[chunk_id]
            
            # Filter by document IDs if specified
            if document_ids and chunk_data['document_id'] not in document_ids:
                continue
            
            results.append({
                'chunk_id': chunk_id,
                'document_id': chunk_data['document_id'],
                'text': chunk_data['text'],
                'score': float(score),
                'metadata': chunk_data['metadata']
            })
            
            if len(results) >= k:
                break
        
        return results
    
    def get_document_chunks(self, document_id: str) -> List[Dict]:
        """Get all chunks for a specific document."""
        if document_id not in self.documents:
            return []
        
        chunk_ids = self.documents[document_id]['chunk_ids']
        return [
            {
                'chunk_id': chunk_id,
                'text': self.chunks[chunk_id]['text'],
                'metadata': self.chunks[chunk_id]['metadata']
            }
            for chunk_id in chunk_ids
        ]
    
    def remove_document(self, document_id: str):
        """Remove a document and all its chunks from the vector store."""
        if document_id not in self.documents:
            return False
        
        chunk_ids = self.documents[document_id]['chunk_ids']
        
        # Remove chunks
        for chunk_id in chunk_ids:
            if chunk_id in self.chunks:
                del self.chunks[chunk_id]
        
        # Remove document
        del self.documents[document_id]
        
        # Note: FAISS doesn't support efficient deletion, so we'd need to rebuild the index
        # For production, consider using a database or more sophisticated vector store
        
        return True
    
    def save(self, filepath: str):
        """Save the vector store to disk."""
        # Save FAISS index
        faiss.write_index(self.index, f"{filepath}.faiss")
        
        # Save metadata
        metadata = {
            'documents': self.documents,
            'chunks': self.chunks,
            'chunk_counter': self.chunk_counter,
            'dimension': self.dimension
        }
        
        with open(f"{filepath}.pkl", 'wb') as f:
            pickle.dump(metadata, f)
    
    def load(self, filepath: str):
        """Load the vector store from disk."""
        # Load FAISS index
        self.index = faiss.read_index(f"{filepath}.faiss")
        
        # Load metadata
        with open(f"{filepath}.pkl", 'rb') as f:
            metadata = pickle.load(f)
        
        self.documents = metadata['documents']
        self.chunks = metadata['chunks']
        self.chunk_counter = metadata['chunk_counter']
        self.dimension = metadata['dimension']
    
    def get_stats(self) -> Dict:
        """Get statistics about the vector store."""
        return {
            'total_documents': len(self.documents),
            'total_chunks': len(self.chunks),
            'index_size': self.index.ntotal,
            'dimension': self.dimension
        }

class MultiModalVectorStore:
    """Extended vector store that handles both text and image embeddings."""
    
    def __init__(self, text_model: str = "all-MiniLM-L6-v2", image_model: str = "clip-ViT-B-32"):
        """
        Initialize multi-modal vector store.
        
        Args:
            text_model: SentenceTransformers model for text
            image_model: SentenceTransformers model for images (CLIP-based)
        """
        self.text_store = VectorStore(text_model)
        # Note: For images, you'd need a CLIP model or similar multi-modal model
        # This is a simplified version focusing on text
        self.image_descriptions = {}  # Store image descriptions for text search
    
    def add_document_with_images(self, document_id: str, text_chunks: List[Dict], 
                               images: List[Dict], document_metadata: Dict = None):
        """Add document with both text and image content."""
        # Add text chunks
        text_count = self.text_store.add_document(document_id, text_chunks, document_metadata)
        
        # Process images (convert to text descriptions and add to text index)
        image_chunks = []
        for img in images:
            if img.get('ocr_text'):
                img_chunk = {
                    'text': f"Image from page {img['page']}: {img['ocr_text']}",
                    'page': img['page'],
                    'chunk_id': f"img_{img['page']}_{img['index']}",
                    'type': 'image'
                }
                image_chunks.append(img_chunk)
        
        if image_chunks:
            img_count = self.text_store.add_document(f"{document_id}_images", image_chunks)
        else:
            img_count = 0
        
        return text_count, img_count
    
    def search_multimodal(self, query: str, k: int = 5, include_images: bool = True) -> List[Dict]:
        """Search across both text and image content."""
        # For now, search in the combined text index
        # In a full implementation, you'd have separate handling for image queries
        return self.text_store.search(query, k)

# Example usage
if __name__ == "__main__":
    # Initialize vector store
    vector_store = VectorStore()
    
    # Sample document chunks
    sample_chunks = [
        {"text": "This is the first chunk of text from the document.", "page": 1, "chunk_id": 0},
        {"text": "This is the second chunk containing different information.", "page": 1, "chunk_id": 1},
        {"text": "The third chunk discusses machine learning concepts.", "page": 2, "chunk_id": 2},
    ]
    
    # Add document
    vector_store.add_document("doc1", sample_chunks, {"title": "Sample Document"})
    
    # Search
    results = vector_store.search("machine learning", k=3)
    
    for result in results:
        print(f"Score: {result['score']:.3f} - {result['text'][:100]}...")
    
    # Print stats
    print("\nVector Store Stats:", vector_store.get_stats())
