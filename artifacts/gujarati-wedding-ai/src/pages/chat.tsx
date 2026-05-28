import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Send, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


const SUGGESTIONS = [
  "What happens during the Pithi ceremony?",
  "Explain the Saptapadi (seven steps)",
  "What does the bride typically wear?",
  "What is Garba and when is it held?",
];

export default function ChatPage() {
  const { messages, streamingMessage, isTyping, hasSentFirst, sendMessage, resetChat } = useChat();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, isTyping]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    sendMessage(inputValue.trim());
    setInputValue("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (text: string) => {
    sendMessage(text);
  };

  const inChatMode = hasSentFirst;

  return (
    <div className="flex flex-col h-[100dvh] font-sans overflow-hidden relative">
      <AnimatePresence mode="wait">
        {!inChatMode ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center flex-1 min-h-[100dvh] relative"
          >
            {/* Background image */}
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: "url(/Gujarati_Wedding_Planner.jpeg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* Frosted glass card */}
            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-12 flex flex-col items-center">
              <div
                className="w-full rounded-3xl px-8 py-10 flex flex-col items-center"
                style={{
                  background: "rgba(255, 250, 244, 0.70)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.14)",
                }}
              >
                {/* Logo */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                  className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg"
                >
                  <span className="text-3xl text-primary-foreground select-none" style={{ fontFamily: "serif" }}>
                    ॐ
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.45 }}
                  className="text-3xl sm:text-4xl font-bold font-serif text-foreground text-center leading-tight mb-3"
                >
                  Gujarati Wedding Assistant
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.45 }}
                  className="text-muted-foreground text-center text-sm sm:text-base max-w-md mb-8 leading-relaxed"
                >
                  Ask me about Gujarati wedding traditions, ceremonies, timelines, and customs
                </motion.p>

                {/* Input box */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.45 }}
                  className="w-full mb-4"
                >
                  <div className="relative flex items-end bg-white/80 border border-border rounded-2xl shadow-md px-4 py-3 gap-2 focus-within:ring-2 focus-within:ring-primary/40 transition-shadow">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputValue}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about Gujarati weddings..."
                      className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground leading-relaxed py-1 max-h-40"
                      style={{ height: "auto" }}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!inputValue.trim()}
                      className="shrink-0 w-9 h-9 rounded-xl bg-primary disabled:opacity-30 flex items-center justify-center transition-all active:scale-95 hover:brightness-110"
                    >
                      <Send className="w-4 h-4 text-primary-foreground ml-0.5" />
                    </button>
                  </div>
                </motion.div>

                {/* Suggestion chips */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36, duration: 0.45 }}
                  className="grid grid-cols-2 gap-2 w-full"
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="text-xs px-3 py-2.5 rounded-xl border border-border bg-white/70 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-white/90 transition-all text-left leading-snug"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─── CHAT STATE ─────────────────────────────────── */
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col flex-1 min-h-0 bg-background"
          >
            <header className="flex-none px-4 py-3 flex items-center justify-between bg-primary text-primary-foreground shadow-sm">
              <h1 className="text-base font-semibold font-serif truncate">Gujarati Wedding Assistant</h1>
              <button
                onClick={resetChat}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              <div className="max-w-2xl mx-auto space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={msg.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card text-card-foreground border border-border rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[82%] sm:max-w-[75%] px-4 py-3 rounded-2xl rounded-tl-sm bg-card text-card-foreground border border-border shadow-sm text-sm leading-relaxed">
                        {streamingMessage ? (
                          <span className="whitespace-pre-wrap">{streamingMessage}</span>
                        ) : (
                          <span className="flex gap-1.5 items-center h-5">
                            {[0, 0.18, 0.36].map((delay, k) => (
                              <motion.span
                                key={k}
                                className="w-2 h-2 rounded-full bg-primary/40 block"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 0.65, delay }}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </main>

            <footer className="flex-none px-4 py-3 border-t bg-background">
              <div className="max-w-2xl mx-auto">
                <div className="relative flex items-end bg-card border border-border rounded-2xl shadow-sm px-4 py-3 gap-2 focus-within:ring-2 focus-within:ring-primary/40 transition-shadow">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a follow-up question..."
                    disabled={isTyping}
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground leading-relaxed py-1 max-h-40 disabled:opacity-60"
                    style={{ height: "auto" }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || isTyping}
                    className="shrink-0 w-9 h-9 rounded-xl bg-primary disabled:opacity-30 flex items-center justify-center transition-all active:scale-95 hover:brightness-110"
                  >
                    <Send className="w-4 h-4 text-primary-foreground ml-0.5" />
                  </button>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
