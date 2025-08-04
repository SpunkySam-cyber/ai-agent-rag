#!/usr/bin/env python3

import sys
import json
import os
import subprocess
from transformers import pipeline, AutoModelForSeq2SeqLM, AutoTokenizer
import torch
from duckduckgo_search import DDGS
import requests
from bs4 import BeautifulSoup
from readability import Document
import re
import PyMuPDF as fitz  # fitz
import time

class HybridAIAgent:
    def __init__(self):
        self.initialize_models()
        self.rag_service_path = os.path.join(os.path.dirname(__file__), "rag-service.py")
        
    def initialize_models(self):
        """Initialize all AI models"""
        try:
            # FLAN-T5 for factual Q&A
            print("Loading FLAN-T5 for factual responses...", file=sys.stderr)
            flan_model_name = 'google/flan-t5-base'
            self.flan_tokenizer = AutoTokenizer.from_pretrained(flan_model_name)
            self.flan_model = AutoModelForSeq2SeqLM.from_pretrained(flan_model_name)
            self.flan_pipeline = pipeline(
                "text2text-generation",
                model=self.flan_model,
                tokenizer=self.flan_tokenizer
            )
            
            # BlenderBot for casual chat
            print("Loading BlenderBot for casual conversations...", file=sys.stderr)
            blender_model_name = "facebook/blenderbot-400M-distill"
            self.blender_tokenizer = AutoTokenizer.from_pretrained(blender_model_name)
            self.blender_model = AutoModelForSeq2SeqLM.from_pretrained(blender_model_name)
            self.blender_pipeline = pipeline(
                "text2text-generation",
                model=self.blender_model,
                tokenizer=self.blender_tokenizer
            )
            
            # Summarization pipeline
            self.summarizer = pipeline("summarization", model="google/flan-t5-large", tokenizer="google/flan-t5-large")
            
            # Q&A pipeline
            self.qa_pipeline = pipeline("question-answering", model="distilbert-base-uncased-distilled-squad")
            
            print("All models loaded successfully!", file=sys.stderr)
            
        except Exception as e:
            print(f"Error loading models: {e}", file=sys.stderr)
            raise

    def clean_text(self, text: str) -> str:
        """Normalize whitespace in the text"""
        return re.sub(r'\s+', ' ', text).strip()

    def call_rag_service(self, action: str, data: dict) -> dict:
        """Call the RAG service for vector operations"""
        try:
            rag_request = {"action": action, **data}
            process = subprocess.Popen(
                ["python3", self.rag_service_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(input=json.dumps(rag_request))
            
            if process.returncode == 0:
                return json.loads(stdout)
            else:
                print(f"RAG service error: {stderr}", file=sys.stderr)
                return {"status": "error", "message": f"RAG service failed: {stderr}"}
        except Exception as e:
            return {"status": "error", "message": f"RAG service call failed: {e}"}

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return self.clean_text(text)
        except Exception as e:
            return f"Error reading PDF: {e}"

    def read_text_file(self, file_path: str) -> str:
        """Read text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return self.clean_text(f.read())
        except Exception as e:
            return f"Error reading text file: {e}"

    def extract_main_text_from_html(self, html: str) -> str:
        """Extract main article text from HTML using readability and BeautifulSoup"""
        try:
            doc = Document(html)
            soup = BeautifulSoup(doc.summary(), "html.parser")
            paragraphs = soup.find_all("p")
            main_text = "\n".join(p.get_text() for p in paragraphs[:7])
            return self.clean_text(main_text)
        except Exception as e:
            return ""

    def summarize_text(self, text: str, max_new_tokens: int = 130, use_rag: bool = True) -> str:
        """Summarize text using Hugging Face summarization pipeline with optional RAG enhancement"""
        try:
            if not text or len(text.split()) < 5:
                return "⚠️ Not enough content to summarize."

            # For long documents, use RAG to identify key sections
            if use_rag and len(text) > 2000:
                rag_result = self.call_rag_service("retrieve_context", {
                    "query": "main points key information important details summary",
                    "documents": [{"id": "summary_doc", "content": text}]
                })
                
                if rag_result.get("status") == "success" and rag_result.get("context"):
                    # Use RAG-identified key sections for summarization
                    text_to_summarize = rag_result["context"]
                    print(f"RAG identified {rag_result.get('chunks_found', 0)} key sections for summarization", file=sys.stderr)
                else:
                    # Fallback to truncating long text
                    text_to_summarize = text[:2000] + "..." if len(text) > 2000 else text
            else:
                text_to_summarize = text

            summary = self.summarizer(
                text_to_summarize,
                max_new_tokens=max_new_tokens,
                do_sample=False,
            )
            return summary[0]['summary_text']
        except Exception as e:
            return f"⚠️ Error summarizing content: {e}"

    def web_search(self, query: str, summarize: bool = True, max_results: int = 2, max_text_length: int = 1500) -> str:
        """Search the web and return summarized or raw content from top pages"""
        blocked_domains = ["tiktok.com", "pinterest.com", "facebook.com", "instagram.com", "youtube.com"]
        
        try:
            with DDGS() as ddgs:
                results = ddgs.text(query, max_results=max_results)
                if not results:
                    return "❌ No relevant search results found."

                contents = []
                seen_urls = set()

                for r in results:
                    url = r['href']

                    # Skip duplicates or blocked domains
                    if url in seen_urls or any(domain in url for domain in blocked_domains):
                        continue
                    seen_urls.add(url)

                    try:
                        headers = {"User-Agent": "Mozilla/5.0"}
                        response = requests.get(url, headers=headers, timeout=5)
                        html = response.text

                        main_text = self.extract_main_text_from_html(html)
                        if not main_text or len(main_text.split()) < 50:
                            contents.append(f"From: {url}\n⚠️ Skipped — content too short or empty.\n")
                            continue

                        if len(main_text) > max_text_length:
                            main_text = main_text[:max_text_length] + "..."

                        summary = self.summarize_text(main_text) if summarize else "🔎 Summarization disabled."

                        contents.append(
                            f"From: {url}\n\n📝 Extracted Content:\n{main_text}\n\n🔍 Summary:\n{summary}"
                        )

                    except Exception as e:
                        contents.append(f"From: {url}\n❌ Error fetching content: {e}")

                return "\n\n---\n\n".join(contents) if contents else "❌ No valid content could be fetched."
        except Exception as e:
            return f"❌ Error performing web search: {e}"

    def answer_question(self, context: str, question: str, use_rag: bool = True) -> str:
        """Answer question based on context using Q&A pipeline with optional RAG enhancement"""
        try:
            if not context.strip():
                return "❌ No context provided for answering the question."
            
            enhanced_context = context
            
            # Use RAG to find relevant context if enabled
            if use_rag and len(context) > 1000:  # Only use RAG for longer documents
                rag_result = self.call_rag_service("retrieve_context", {
                    "query": question,
                    "documents": [{"id": "current_doc", "content": context}]
                })
                
                if rag_result.get("status") == "success" and rag_result.get("context"):
                    enhanced_context = rag_result["context"]
                    print(f"RAG enhanced context with {rag_result.get('chunks_found', 0)} relevant chunks", file=sys.stderr)
            
            # Use the original Q&A pipeline but with enhanced context
            result = self.qa_pipeline(question=question, context=enhanced_context)
            return result['answer']
            
        except Exception as e:
            return f"❌ Error answering question: {e}"

    def is_factual_question(self, text: str) -> bool:
        """Decide if the input looks like a factual query"""
        text_lower = text.lower().strip()
        return text_lower.startswith(("what", "how", "when", "where", "why")) or text_lower.endswith("?")

    def flan_answer(self, user_input: str) -> str:
        """Use FLAN-T5 for factual Q&A"""
        try:
            result = self.flan_pipeline(user_input, max_new_tokens=128, truncation=True)
            return result[0]["generated_text"]
        except Exception as e:
            return f"❌ Error generating factual response: {e}"

    def blender_chat(self, user_input: str) -> str:
        """Use BlenderBot for casual conversation"""
        try:
            if not user_input.strip():
                return "Please type something."
            response = self.blender_pipeline(user_input, max_new_tokens=100)
            return response[0]["generated_text"].strip()
        except Exception as e:
            return f"❌ Error generating chat response: {e}"

    def process_request(self, request_data):
        """Main processing function with RAG enhancement"""
        start_time = time.time()
        
        query = request_data.get('query', '').strip()
        tool_type = request_data.get('toolType', 'chat')
        document_content = request_data.get('documentContent', '')
        session_documents = request_data.get('sessionDocuments', [])
        
        # Use RAG for enhanced context when session documents are available
        use_rag = len(session_documents) > 0
        rag_context = ""
        
        try:
            if tool_type == 'summary':
                if document_content:
                    response = self.summarize_text(document_content, use_rag=use_rag)
                    model_used = "FLAN-T5 Large + RAG" if use_rag else "FLAN-T5 Large"
                else:
                    response = "❌ No document content provided for summarization."
                    model_used = "None"
                    
            elif tool_type == 'search':
                # Extract search query (remove "search" prefix if present)
                search_query = query
                if search_query.lower().startswith("search"):
                    search_query = search_query[6:].strip()
                
                summarize = True
                if search_query.startswith("raw"):
                    summarize = False
                    search_query = search_query[3:].strip()
                
                response = self.web_search(search_query, summarize=summarize)
                model_used = "FLAN-T5 Large + Web Search"
                
            elif tool_type == 'qa':
                if document_content:
                    response = self.answer_question(document_content, query, use_rag=use_rag)
                    model_used = "DistilBERT QA + RAG" if use_rag else "DistilBERT QA"
                else:
                    response = "❌ No document content provided for Q&A."
                    model_used = "None"
                    
            else:  # chat
                # For chat, use RAG context if documents are available
                enhanced_query = query
                if use_rag and session_documents:
                    try:
                        rag_result = self.call_rag_service("retrieve_context", {
                            "query": query,
                            "documents": [{"id": doc.get("id", ""), "content": doc.get("content", "")} for doc in session_documents]
                        })
                        
                        if rag_result.get("status") == "success" and rag_result.get("context"):
                            rag_context = rag_result["context"]
                            enhanced_query = f"Context: {rag_context}\n\nQuestion: {query}"
                            print(f"RAG enhanced chat with {rag_result.get('chunks_found', 0)} relevant chunks", file=sys.stderr)
                    except Exception as e:
                        print(f"RAG enhancement failed for chat: {e}", file=sys.stderr)
                
                if self.is_factual_question(query) or rag_context:
                    response = self.flan_answer(enhanced_query)
                    model_used = "FLAN-T5 Base + RAG" if rag_context else "FLAN-T5 Base"
                else:
                    response = self.blender_chat(query)
                    model_used = "BlenderBot 400M"
            
            processing_time = time.time() - start_time
            
            return {
                "response": response,
                "metadata": {
                    "model": model_used,
                    "processingTime": round(processing_time, 2),
                    "tokenCount": len(query.split()) if query else 0,
                    "ragEnhanced": use_rag,
                    "documentsUsed": len(session_documents) if session_documents else 0
                }
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            return {
                "response": f"❌ Error processing request: {e}",
                "metadata": {
                    "model": "Error",
                    "processingTime": round(processing_time, 2),
                    "tokenCount": 0,
                    "ragEnhanced": False,
                    "documentsUsed": 0
                }
            }

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        request_data = json.loads(input_data)
        
        # Initialize agent (this will be cached in production)
        agent = HybridAIAgent()
        
        # Process request
        result = agent.process_request(request_data)
        
        # Return result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "response": f"❌ System error: {e}",
            "metadata": {
                "model": "Error",
                "processingTime": 0,
                "tokenCount": 0
            }
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main()
