import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  toolType: text("tool_type").notNull(), // 'chat', 'summary', 'search', 'qa'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: json("metadata"), // For storing additional info like model used, processing time, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  size: text("size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// RAG Vector Store Tables
export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  chunkIndex: text("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding"), // JSON string of vector embeddings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const queryEmbeddings = pgTable("query_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  query: text("query").notNull(),
  embedding: text("embedding").notNull(), // JSON string of vector embeddings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({
  id: true,
  createdAt: true,
});

export const insertQueryEmbeddingSchema = createInsertSchema(queryEmbeddings).omit({
  id: true,
  createdAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertQueryEmbedding = z.infer<typeof insertQueryEmbeddingSchema>;
export type QueryEmbedding = typeof queryEmbeddings.$inferSelect;

// AI Request/Response types
export const aiRequestSchema = z.object({
  query: z.string().min(1),
  toolType: z.enum(['chat', 'summary', 'search', 'qa']),
  sessionId: z.string(),
  documentContent: z.string().optional(),
});

export const aiResponseSchema = z.object({
  response: z.string(),
  metadata: z.object({
    model: z.string(),
    processingTime: z.number(),
    tokenCount: z.number().optional(),
  }),
});

export type AIRequest = z.infer<typeof aiRequestSchema>;
export type AIResponse = z.infer<typeof aiResponseSchema>;
