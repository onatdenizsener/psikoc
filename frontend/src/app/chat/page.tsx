"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  sendMessage,
  listConversations,
  getConversation,
  deleteConversation,
} from "@/lib/api";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: number;
  title: string | null;
  created_at: string;
}

export default function ChatPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await listConversations();
      setConversations(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const openConversation = async (id: number) => {
    try {
      const { data } = await getConversation(id);
      setMessages(data.messages);
      setActiveConvId(id);
    } catch {}
  };

  const newChat = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: text, created_at: new Date().toISOString() },
    ]);

    try {
      const { data } = await sendMessage(text, activeConvId ?? undefined);
      setMessages((prev) => [
        ...prev,
        { id: tempId + 1, role: "assistant", content: data.reply, created_at: new Date().toISOString() },
      ]);
      setActiveConvId(data.conversation_id);
      loadConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu konuşmayı silmek istiyor musun?")) return;
    await deleteConversation(id);
    if (activeConvId === id) newChat();
    loadConversations();
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } flex-shrink-0 bg-[#1E1A3C] flex flex-col transition-all duration-200 overflow-hidden`}
      >
        <div className="p-4 pt-6 flex flex-col h-full">
          <h2 className="text-white font-bold text-lg mb-3">PsiKoç</h2>
          <button
            onClick={newChat}
            className="w-full bg-[#6C63FF] hover:bg-[#5a52e0] text-white rounded-xl py-2 px-3 text-sm font-medium mb-4 transition"
          >
            + Yeni Konuşma
          </button>

          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition ${
                  c.id === activeConvId
                    ? "bg-[#6C63FF33]"
                    : "hover:bg-white/10"
                }`}
                onClick={() => openConversation(c.id)}
              >
                <span className="text-gray-300 text-sm truncate flex-1">
                  {c.title || "Konuşma"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 ml-2 text-xs transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-gray-500 text-xs mb-2 truncate">{user.username}</p>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 text-sm transition"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-[#E0DCFF] px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[#6C63FF] text-xl hover:opacity-70 transition"
          >
            ☰
          </button>
          <span className="font-bold text-[#6C63FF] text-lg">PsiKoç</span>
          <span className="ml-auto text-gray-400 text-sm">{user.username}</span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <span className="text-5xl">💬</span>
              <h3 className="text-xl font-bold text-gray-700">
                Merhaba, {user.username}
              </h3>
              <p className="text-gray-400 max-w-sm">
                Bugün nasıl hissediyorsun? Seninle konuşmak için buradayım.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#6C63FF] text-white"
                      : "bg-white border border-[#E0DCFF] text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E0DCFF] rounded-2xl px-4 py-3 flex gap-1 items-center">
                <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-[#E0DCFF] px-4 py-3 flex items-end gap-3 flex-shrink-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Bir şeyler yaz... (Enter gönderir, Shift+Enter yeni satır)"
            rows={1}
            className="flex-1 resize-none border border-[#E0DCFF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6C63FF] transition max-h-36 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = t.scrollHeight + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-[#6C63FF] hover:bg-[#5a52e0] disabled:bg-gray-200 text-white rounded-xl w-11 h-11 flex items-center justify-center transition flex-shrink-0"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
