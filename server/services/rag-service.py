#!/usr/bin/env python3

import sys
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Dict, Tuple

class SimpleRAGService:
    """
    A lightweight RAG service using TF-IDF vectors for document similarity
    """
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english',
            ngram_range=(1, 2),
            max_df=0.8,
            min_df=2
        )
        self.document_chunks = []
        self.chunk_vectors = None
        self.is_fitted = False
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        sentences = re.split(r'[.!?]+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # If adding this sentence would exceed chunk size, start new chunk
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Keep overlap from the end of current chunk
                words = current_chunk.split()
                overlap_text = " ".join(words[-overlap:]) if len(words) > overlap else ""
                current_chunk = overlap_text + " " + sentence
            else:
                current_chunk += " " + sentence
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def index_document(self, document_id: str, content: str) -> List[Dict]:
        """Index a document by chunking and vectorizing"""
        chunks = self.chunk_text(content)
        indexed_chunks = []
        
        for i, chunk in enumerate(chunks):
            chunk_data = {
                'document_id': document_id,
                'chunk_index': str(i),
                'content': chunk,
                'chunk_id': f"{document_id}_{i}"
            }
            self.document_chunks.append(chunk_data)
            indexed_chunks.append(chunk_data)
        
        # Refit vectorizer with all chunks
        self._fit_vectorizer()
        
        return indexed_chunks
    
    def _fit_vectorizer(self):
        """Fit the TF-IDF vectorizer on all document chunks"""
        if not self.document_chunks:
            return
            
        chunk_texts = [chunk['content'] for chunk in self.document_chunks]
        self.chunk_vectors = self.vectorizer.fit_transform(chunk_texts)
        self.is_fitted = True
    
    def retrieve_relevant_chunks(self, query: str, k: int = 3) -> List[Dict]:
        """Retrieve top-k most relevant chunks for a query"""
        if not self.is_fitted or not self.document_chunks:
            return []
        
        # Vectorize the query
        query_vector = self.vectorizer.transform([query])
        
        # Calculate similarities
        similarities = cosine_similarity(query_vector, self.chunk_vectors).flatten()
        
        # Get top-k indices
        top_indices = np.argsort(similarities)[::-1][:k]
        
        # Return relevant chunks with scores
        relevant_chunks = []
        for idx in top_indices:
            if similarities[idx] > 0.1:  # Minimum similarity threshold
                chunk = self.document_chunks[idx].copy()
                chunk['similarity_score'] = float(similarities[idx])
                relevant_chunks.append(chunk)
        
        return relevant_chunks
    
    def generate_context(self, query: str, max_context_length: int = 2000) -> str:
        """Generate context for RAG-enhanced generation"""
        relevant_chunks = self.retrieve_relevant_chunks(query, k=5)
        
        if not relevant_chunks:
            return ""
        
        context_parts = []
        current_length = 0
        
        for chunk in relevant_chunks:
            chunk_text = chunk['content']
            if current_length + len(chunk_text) <= max_context_length:
                context_parts.append(f"[Relevance: {chunk['similarity_score']:.2f}] {chunk_text}")
                current_length += len(chunk_text)
            else:
                # Truncate last chunk to fit
                remaining_space = max_context_length - current_length
                if remaining_space > 100:  # Only add if there's meaningful space
                    truncated = chunk_text[:remaining_space-10] + "..."
                    context_parts.append(f"[Relevance: {chunk['similarity_score']:.2f}] {truncated}")
                break
        
        return "\n\n".join(context_parts)
    
    def clear_index(self):
        """Clear all indexed documents"""
        self.document_chunks = []
        self.chunk_vectors = None
        self.is_fitted = False

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        request_data = json.loads(input_data)
        
        action = request_data.get('action')
        rag_service = SimpleRAGService()
        
        if action == 'index_document':
            document_id = request_data.get('document_id')
            content = request_data.get('content')
            
            chunks = rag_service.index_document(document_id, content)
            
            result = {
                'status': 'success',
                'chunks_created': len(chunks),
                'chunks': chunks
            }
            
        elif action == 'retrieve_context':
            # For this demo, we'll simulate having indexed documents
            # In a real implementation, you'd load from database
            documents = request_data.get('documents', [])
            query = request_data.get('query', '')
            
            # Index documents
            for doc in documents:
                rag_service.index_document(doc.get('id', ''), doc.get('content', ''))
            
            # Generate context
            context = rag_service.generate_context(query)
            relevant_chunks = rag_service.retrieve_relevant_chunks(query)
            
            result = {
                'status': 'success',
                'context': context,
                'relevant_chunks': relevant_chunks,
                'chunks_found': len(relevant_chunks)
            }
            
        else:
            result = {
                'status': 'error',
                'message': f'Unknown action: {action}'
            }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'status': 'error',
            'message': f'RAG service error: {str(e)}'
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main()