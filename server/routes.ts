import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pythonRunner } from "./services/python-runner";
import { ragManager } from "./services/rag-manager";
import { aiRequestSchema, insertSessionSchema, insertMessageSchema, insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "text/plain"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and TXT files are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Create new session
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid session data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create session" });
      }
    }
  });

  // Get session by ID
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Update session
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const updates = insertSessionSchema.partial().parse(req.body);
      const session = await storage.updateSession(req.params.id, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid update data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update session" });
      }
    }
  });

  // Delete session
  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSession(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Get messages for a session
  app.get("/api/sessions/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesBySession(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Get documents for a session
  app.get("/api/sessions/:id/documents", async (req, res) => {
    try {
      const documents = await storage.getDocumentsBySession(req.params.id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Upload file
  app.post("/api/sessions/:id/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const sessionId = req.params.id;
      const { originalname, mimetype, size, path: filePath } = req.file;

      // Process file content based on type
      let content = "";
      try {
        if (mimetype === "application/pdf") {
          // Use Python script to extract PDF content
          const fs = await import("fs");
          content = await pythonRunner.processFileContent(filePath, mimetype);
        } else if (mimetype === "text/plain") {
          const fs = await import("fs");
          content = fs.readFileSync(filePath, "utf-8");
        }
      } catch (error) {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        return res.status(500).json({ message: "Failed to process file content" });
      }

      // Store document in database
      const documentData = insertDocumentSchema.parse({
        sessionId,
        filename: originalname,
        content,
        size: `${(size / 1024).toFixed(1)} KB`,
        mimeType: mimetype,
      });

      const document = await storage.createDocument(documentData);

      // Index document for RAG capabilities (async operation)
      ragManager.indexDocument(document).catch(error => {
        console.error(`Failed to index document ${document.id} for RAG:`, error);
      });

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.status(201).json(document);
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid document data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to upload file" });
      }
    }
  });

  // Send message and get AI response
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const aiRequest = aiRequestSchema.parse(req.body);
      
      // Store user message
      const userMessage = await storage.createMessage({
        sessionId: aiRequest.sessionId,
        role: "user",
        content: aiRequest.query,
        metadata: { toolType: aiRequest.toolType },
      });

      // Get AI response
      const aiResponse = await pythonRunner.runAIAgent(aiRequest);

      // Store AI response
      const assistantMessage = await storage.createMessage({
        sessionId: aiRequest.sessionId,
        role: "assistant",
        content: aiResponse.response,
        metadata: aiResponse.metadata,
      });

      // Update session timestamp
      await storage.updateSession(aiRequest.sessionId, {});

      res.json({
        userMessage,
        assistantMessage,
        aiResponse,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid AI request", errors: error.errors });
      } else {
        res.status(500).json({ 
          message: "Failed to process AI request",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
