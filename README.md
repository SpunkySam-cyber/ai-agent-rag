# AI Agent with RAG

A hybrid AI agent with Retrieval-Augmented Generation (RAG) capabilities that combines multiple AI models for intelligent document understanding, conversational chat, web search, and question answering.

## Features

- **🤖 Multiple AI Models**: FLAN-T5, BlenderBot, and DistilBERT for different tasks
- **🧠 RAG Enhancement**: Context-aware responses using document embeddings
- **📄 Document Processing**: PDF and TXT file upload with automatic indexing
- **🔍 Web Search**: DuckDuckGo integration with intelligent summarization
- **💬 Conversational Chat**: Context-aware conversations with document understanding
- **❓ Q&A System**: Document-based question answering with semantic search
- **📝 Smart Summarization**: Intelligent document summarization with key section identification

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-agent-rag.git
   cd ai-agent-rag
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip3 install -r python-requirements.txt
   ```

3. **Set up database**
   ```bash
   npm run db:push
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Deploy to Render (Free)

1. **Push to GitHub** (this repository)

2. **Deploy to Render**
   - Sign up at [render.com](https://render.com)
   - Create new Blueprint
   - Connect this GitHub repository
   - Render automatically detects `render.yaml` and deploys

3. **First startup takes 2-3 minutes** (downloading AI models)

See [DEPLOY_TO_RENDER.md](./DEPLOY_TO_RENDER.md) for detailed deployment instructions.

## Architecture

- **Frontend**: React + TypeScript with Tailwind CSS
- **Backend**: Express.js with TypeScript
- **AI Models**: Hugging Face Transformers (Python)
- **Database**: PostgreSQL with Drizzle ORM
- **RAG System**: Vector embeddings for semantic document search

## AI Models

- **FLAN-T5 Base**: Factual question answering
- **FLAN-T5 Large**: Document summarization
- **BlenderBot 400M**: Conversational chat
- **DistilBERT**: Document-based Q&A

## Usage

1. **Upload documents** (PDF/TXT) for context-aware AI responses
2. **Chat** with the AI using your documents as context
3. **Ask questions** about uploaded documents
4. **Summarize** long documents intelligently
5. **Search the web** with AI-powered result summarization

## RAG Enhancement

When documents are uploaded, the system:
- Automatically chunks and indexes content
- Creates vector embeddings for semantic search
- Enhances all AI responses with relevant document context
- Provides better, more informed answers

## Tech Stack

- React, TypeScript, Tailwind CSS
- Express.js, Node.js
- PostgreSQL, Drizzle ORM
- Python, Hugging Face Transformers
- TanStack Query, Wouter
- shadcn/ui components

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.