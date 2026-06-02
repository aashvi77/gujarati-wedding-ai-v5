import { useState, useCallback, useEffect } from "react";
import {
  useCreateOpenaiConversation,
  useListOpenaiMessages,
  useListOpenaiConversations,
  getListOpenaiMessagesQueryKey,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export interface StreamMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<StreamMessage[]>([]);
  const [hasSentFirst, setHasSentFirst] = useState(false);

  const createConversation = useCreateOpenaiConversation();

  const { data: conversations } = useListOpenaiConversations();

  const { data: dbMessages } = useListOpenaiMessages(conversationId!, {
    query: { enabled: !!conversationId && !isTyping },
  });

  // Sync DB messages into local state after streaming completes
  useEffect(() => {
    if (!dbMessages || isTyping) return;
    const incoming: StreamMessage[] = dbMessages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    setLocalMessages(incoming);
  }, [dbMessages, isTyping]);

  const sendMessage = useCallback(
    async (content: string) => {
      setHasSentFirst(true);

      let currentId = conversationId;
      if (!currentId) {
        try {
          const conv = await createConversation.mutateAsync({
            data: { title: content.length > 50 ? content.slice(0, 50).trim() + "..." : content.trim() },
          });
          currentId = conv.id;
          setConversationId(conv.id);
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        } catch {
          return;
        }
      }

      setLocalMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", content },
      ]);
      setIsTyping(true);
      setStreamingMessage("");

      let accumulated = "";
      try {
        const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
        const response = await fetch(
          `${BASE}/api/openai/conversations/${currentId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) break;
                if (data.content) {
                  accumulated += data.content;
                  setStreamingMessage(accumulated);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch {
        // ignore stream errors
      } finally {
        if (accumulated) {
          setLocalMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, role: "assistant", content: accumulated },
          ]);
        }
        setIsTyping(false);
        setStreamingMessage("");
        if (currentId) {
          queryClient.invalidateQueries({
            queryKey: getListOpenaiMessagesQueryKey(currentId),
          });
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        }
      }
    },
    [conversationId, createConversation, queryClient]
  );

  const resetChat = useCallback(() => {
    setConversationId(undefined);
    setLocalMessages([]);
    setStreamingMessage("");
    setIsTyping(false);
    setHasSentFirst(false);
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    setConversationId(id);
    setHasSentFirst(true);
    setLocalMessages([]);
    setStreamingMessage("");
    setIsTyping(false);
  }, []);

  return {
    messages: localMessages,
    streamingMessage,
    isTyping,
    hasSentFirst,
    sendMessage,
    resetChat,
    loadConversation,
    conversations: conversations ?? [],
    activeConversationId: conversationId,
  };
}
