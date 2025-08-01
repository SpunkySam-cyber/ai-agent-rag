import { spawn } from "child_process";
import path from "path";
import { db } from "../db";
import { documentChunks, queryEmbeddings } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Document } from "@shared/schema";

export class RAGManager {
  private pythonPath: string;
  private ragServicePath: string;

  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || "python3";
    this.ragServicePath = path.join(import.meta.dirname, "rag-service.py");
  }

  async callRAGService(action: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.ragServicePath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.log(`[RAG Service]: ${data.toString().trim()}`);
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse RAG response: ${parseError}`));
          }
        } else {
          reject(new Error(`RAG service exited with code ${code}: ${errorOutput}`));
        }
      });

      pythonProcess.on("error", (error) => {
        reject(new Error(`Failed to start RAG service: ${error.message}`));
      });

      // Send input data to Python script
      const request = { action, ...data };
      pythonProcess.stdin.write(JSON.stringify(request));
      pythonProcess.stdin.end();
    });
  }

  async indexDocument(document: Document): Promise<void> {
    try {
      console.log(`[RAG Manager] Indexing document: ${document.filename}`);
      
      // Call RAG service to chunk and index the document
      const result = await this.callRAGService("index_document", {
        document_id: document.id,
        content: document.content,
      });

      if (result.status === "success" && result.chunks) {
        // Store chunks in database
        for (const chunk of result.chunks) {
          await db.insert(documentChunks).values({
            documentId: document.id,
            chunkIndex: chunk.chunk_index,
            content: chunk.content,
            embedding: null, // For now, embeddings are handled in-memory by RAG service
          });
        }
        
        console.log(`[RAG Manager] Successfully indexed ${result.chunks_created} chunks for document ${document.filename}`);
      } else {
        throw new Error(`RAG indexing failed: ${result.message}`);
      }
    } catch (error) {
      console.error(`[RAG Manager] Error indexing document ${document.filename}:`, error);
      throw error;
    }
  }

  async retrieveContext(query: string, documents: Document[]): Promise<{
    context: string;
    relevantChunks: any[];
    chunksFound: number;
  }> {
    try {
      console.log(`[RAG Manager] Retrieving context for query: "${query}"`);
      
      // Prepare documents for RAG service
      const docData = documents.map(doc => ({
        id: doc.id,
        content: doc.content,
      }));

      const result = await this.callRAGService("retrieve_context", {
        query,
        documents: docData,
      });

      if (result.status === "success") {
        console.log(`[RAG Manager] Found ${result.chunks_found} relevant chunks`);
        return {
          context: result.context || "",
          relevantChunks: result.relevant_chunks || [],
          chunksFound: result.chunks_found || 0,
        };
      } else {
        throw new Error(`RAG context retrieval failed: ${result.message}`);
      }
    } catch (error) {
      console.error(`[RAG Manager] Error retrieving context:`, error);
      return {
        context: "",
        relevantChunks: [],
        chunksFound: 0,
      };
    }
  }

  async getDocumentChunks(documentId: string) {
    try {
      return await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId));
    } catch (error) {
      console.error(`[RAG Manager] Error getting chunks for document ${documentId}:`, error);
      return [];
    }
  }

  async clearDocumentIndex(documentId: string): Promise<void> {
    try {
      await db
        .delete(documentChunks)
        .where(eq(documentChunks.documentId, documentId));
      
      console.log(`[RAG Manager] Cleared index for document ${documentId}`);
    } catch (error) {
      console.error(`[RAG Manager] Error clearing document index:`, error);
      throw error;
    }
  }
}

export const ragManager = new RAGManager();