import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
});

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
