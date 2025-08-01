# AI Agent Web Application

## Overview

This is a full-stack web application that provides an intelligent AI agent interface with multiple specialized tools. The application combines a React frontend with an Express.js backend and integrates various AI models through Python services to offer document analysis, web search, question answering, and conversational chat capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**RAG Integration Completed (July 31, 2025):**
- Fully integrated RAG (Retrieval-Augmented Generation) capabilities across all AI tools
- Created comprehensive vector storage system with PostgreSQL database
- Enhanced all AI models with context-aware document retrieval:
  - Chat: RAG-enhanced responses using session documents for context
  - Summarization: Intelligent key section identification for long documents
  - Q&A: Vector-based document understanding with semantic similarity
  - Web Search: Maintained existing functionality with option for RAG enhancement
- Added real-time RAG status indicators and processing feedback
- Implemented automatic document indexing upon upload
- Enhanced user interface with RAG enhancement status display

**Migration Completed (July 31, 2025):**
- Successfully migrated hybrid AI agent from Gradio to modern web application
- Integrated all existing Python AI models (FLAN-T5, BlenderBot, DistilBERT)
- Created user-friendly web interface with drag & drop file uploads
- Implemented session management and chat history
- Added real-time model status indicators and processing feedback
- Preserved all original functionality while enhancing user experience

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend, backend, and AI services:

- **Frontend**: React-based SPA with TypeScript, built using Vite
- **Backend**: Express.js REST API server with TypeScript
- **AI Services**: Python-based AI agent using Hugging Face Transformers
- **Database**: PostgreSQL with Drizzle ORM (configured but using in-memory storage currently)
- **UI Framework**: Tailwind CSS with shadcn/ui components

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support

### Backend Architecture
- **Server**: Express.js with TypeScript for type safety
- **API Design**: RESTful endpoints following conventional patterns
- **File Handling**: Multer middleware for file uploads (PDF/TXT documents)
- **Data Layer**: Drizzle ORM with PostgreSQL schema definitions
- **Storage**: Currently using in-memory storage with interface for easy migration to database

### AI Services Integration
- **Python Runner**: Node.js service that spawns Python processes to execute AI tasks
- **RAG System**: Comprehensive Retrieval-Augmented Generation infrastructure:
  - RAG Service: Python-based vector indexing and semantic search
  - RAG Manager: TypeScript service orchestrating document indexing and retrieval
  - Vector Storage: PostgreSQL with embeddings for semantic similarity matching
  - Context Enhancement: Automatic document chunking and intelligent context retrieval
- **AI Models**: Multiple Hugging Face Transformers models with RAG enhancement:
  - FLAN-T5 (base/large) for factual question answering and summarization
  - BlenderBot for conversational chat with document context awareness
  - DistilBERT for document-based Q&A with vector similarity matching
- **Web Search**: DuckDuckGo search integration with content extraction and summarization

## Data Flow

1. **User Interaction**: Users interact through the React frontend, selecting AI tools and submitting queries
2. **API Requests**: Frontend sends requests to Express.js backend via TanStack Query
3. **AI Processing**: Backend spawns Python processes to execute AI model inference
4. **Response Handling**: AI results are returned through the API and displayed in the UI
5. **Session Management**: Conversations and documents are stored in sessions for continuity

### Session Management
- Sessions organize conversations by tool type (chat, summary, search, qa)
- Messages are stored with role (user/assistant) and metadata
- Documents are associated with sessions for context-aware processing

## External Dependencies

### AI Models (Hugging Face)
- **google/flan-t5-base**: Lightweight model for factual responses
- **google/flan-t5-large**: Enhanced model for document summarization
- **facebook/blenderbot-400M-distill**: Conversational AI model
- **distilbert-base-uncased-distilled-squad**: Question-answering model

### Web Search Integration
- **DuckDuckGo Search API**: Privacy-focused search results
- **Web Scraping**: BeautifulSoup and Readability for content extraction
- **Content Processing**: Automatic summarization of search results

### Database & ORM
- **PostgreSQL**: Primary database (Neon Database for production)
- **Drizzle ORM**: Type-safe database operations with schema migrations
- **Connection**: Uses environment variable DATABASE_URL for database connection

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for frontend development
- **Express Server**: Backend API with TypeScript compilation via tsx
- **Python Environment**: Local Python installation with required packages

### Production Build
- **Frontend**: Vite builds optimized static assets to dist/public
- **Backend**: esbuild bundles server code to dist/index.js
- **Database**: Drizzle migrations ensure schema consistency
- **Python Dependencies**: Requirements managed through package.json for AI libraries

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **PYTHON_PATH**: Path to Python executable (defaults to python3)
- **NODE_ENV**: Environment flag for development/production behavior

The application is designed to be deployed on platforms like Replit, with proper configuration for both development and production environments. The modular architecture allows for easy scaling and maintenance of different components.