import { type Session, type InsertSession, type Message, type InsertMessage, type Document, type InsertDocument } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getSessions(): Promise<Session[]>;
  updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySession(sessionId: string): Promise<Message[]>;
  deleteMessagesBySession(sessionId: string): Promise<boolean>;

  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsBySession(sessionId: string): Promise<Document[]>;
  deleteDocumentsBySession(sessionId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;
  private messages: Map<string, Message>;
  private documents: Map<string, Document>;

  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
    this.documents = new Map();
  }

  // Sessions
  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const now = new Date();
    const session: Session = { 
      ...insertSession, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: Session = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      // Also delete related messages and documents
      await this.deleteMessagesBySession(id);
      await this.deleteDocumentsBySession(id);
    }
    return deleted;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      metadata: insertMessage.metadata || null
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async deleteMessagesBySession(sessionId: string): Promise<boolean> {
    const messagesToDelete = Array.from(this.messages.values())
      .filter(msg => msg.sessionId === sessionId);
    
    messagesToDelete.forEach(msg => this.messages.delete(msg.id));
    return true;
  }

  // Documents
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocumentsBySession(sessionId: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteDocumentsBySession(sessionId: string): Promise<boolean> {
    const documentsToDelete = Array.from(this.documents.values())
      .filter(doc => doc.sessionId === sessionId);
    
    documentsToDelete.forEach(doc => this.documents.delete(doc.id));
    return true;
  }
}

export const storage = new MemStorage();
