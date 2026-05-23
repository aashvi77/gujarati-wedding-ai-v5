import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, conversations, messages, knowledgeChunks } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
} from "@workspace/api-zod";

const router = Router();

const BASE_SYSTEM_PROMPT = `You are the Gujarati Wedding AI Assistant — a warm, knowledgeable, and conversational guide dedicated exclusively to Gujarati weddings and wedding-related topics.

RESPONSE STYLE — follow these rules strictly:
- Never use bullet points, asterisks, bold text, or markdown formatting of any kind
- Write in plain, warm, conversational prose — like a knowledgeable family member explaining something
- Keep responses concise and natural, not like a textbook entry
- Do not number or list things unless absolutely necessary
- Never start a response with a header or title

TOPIC BOUNDARIES:
- Only answer questions about Gujarati weddings, traditions, ceremonies, planning, attire, food, music, and related topics
- If asked about anything outside of Gujarati weddings, politely decline and redirect

KNOWLEDGE BASE RULES — this is critical:
- Only answer using information from the KNOWLEDGE BASE CONTEXT provided below
- If a topic is not covered in the knowledge base context, say you don't have specific information on that and suggest they consult a pandit or family elder
- Never invent, assume, or add information that is not in the knowledge base
- Do not answer questions about specific items (like Gharchola) if they are not in your knowledge base

Always respond in English unless the user writes in another language. Be warm and culturally respectful.

IMPORTANT: When answering, use ONLY the KNOWLEDGE BASE CONTEXT provided below as your source of truth.`;

async function searchKnowledge(query: string): Promise<string> {
  try {
    const results = await db.execute(sql`
      SELECT title, content,
        ts_rank(
          to_tsvector('english', title || ' ' || content),
          plainto_tsquery('english', ${query})
        ) as rank
      FROM knowledge_chunks
      WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 2
    `);

    if (!results.rows || results.rows.length === 0) {
      const fallback = await db
        .select({ title: knowledgeChunks.title, content: knowledgeChunks.content })
        .from(knowledgeChunks)
        .limit(2);
      
      if (fallback.length === 0) return "";
      return fallback.map((r) => {
        const truncated = r.content.length > 3000 ? r.content.slice(0, 3000) + "..." : r.content;
        return `### ${r.title}\n${truncated}`;
      }).join("\n\n---\n\n");
    }

    return (results.rows as { title: string; content: string }[])
      .map((r) => {
        const truncated = r.content.length > 3000 ? r.content.slice(0, 3000) + "..." : r.content;
        return `### ${r.title}\n${truncated}`;
      })
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
}

// GET /openai/conversations
router.get("/conversations", async (req, res) => {
  try {
    const all = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(all);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /openai/conversations
router.post("/conversations", async (req, res) => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [created] = await db
      .insert(conversations)
      .values({ title: parsed.data.title })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /openai/conversations/:id
router.get("/conversations/:id", async (req, res) => {
  const parsed = GetOpenaiConversationParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, parsed.data.id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(messages.createdAt);
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /openai/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  const parsed = DeleteOpenaiConversationParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, parsed.data.id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /openai/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  const parsed = ListOpenaiMessagesParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, parsed.data.id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /openai/conversations/:id/messages (SSE streaming)
router.post("/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendOpenaiMessageParams.safeParse({
    id: Number(req.params.id),
  });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const conversationId = paramsParsed.data.id;
  const userContent = bodyParsed.data.content;

  try {
    // Check conversation exists
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Save user message
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: userContent,
    });

    // Load conversation history
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // RAG: search knowledge base for relevant context
    const relevantContext = await searchKnowledge(userContent);

    // Build system prompt with RAG context
    const systemPrompt = relevantContext
      ? `${BASE_SYSTEM_PROMPT}\n\n---\n\nKNOWLEDGE BASE CONTEXT:\n\n${relevantContext}\n\n---\n\nUse the above context to answer the user's question accurately and warmly.`
      : BASE_SYSTEM_PROMPT;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_completion_tokens: 1024,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant message
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
