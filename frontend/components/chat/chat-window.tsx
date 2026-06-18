"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { DataVisualizer } from "@/components/chat/data-visualizer";
import { SettingsModal } from "@/components/settings/settings-modal";
import {
  User,
  Bot,
  Settings,
  Download,
  AlertCircle,
  WifiOff,
  Menu,
} from "lucide-react";
import { useChat } from "@/context/chat-context";
import { useSettings } from "@/context/settings-context";
import { useHealthCheck } from "@/hooks/use-health-check";
import { useQueryHistory } from "@/hooks/use-query-history";
import { useNextSuggestion } from "@/hooks/use-next-suggestion";

const quickActions = [
  "temperature above 19",
  "salinity trends",
  "pressure in arabian sea",
  "show trajectory",
];

// ── Inline markdown renderer ──────────────────────────────────────────────────
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      nodes.push(
        <p key={i} className="mt-3 mb-1 text-sm font-semibold text-foreground">
          {renderInline(line.slice(4))}
        </p>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <p
          key={i}
          className="mt-3 mb-1 text-base font-semibold text-foreground"
        >
          {renderInline(line.slice(3))}
        </p>,
      );
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`list-${i}`} className="mt-1 mb-2 space-y-1.5">
          {items.map((item, j) => (
            <li
              key={j}
              className="flex items-start gap-2 text-sm leading-relaxed"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.trim() === "") {
      nodes.push(<div key={i} className="h-1" />);
    } else {
      nodes.push(
        <p key={i} className="text-sm leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{nodes}</div>;
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function OfflineCard() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-600 dark:text-orange-400">
      <WifiOff size={15} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Backend offline</p>
        <p className="mt-0.5 text-xs opacity-80">
          Make sure FastAPI is running:{" "}
          <code className="font-mono">uvicorn main:app --reload</code>
        </p>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export function ChatWindow({ onMenuClick }: { onMenuClick?: () => void }) {
  const {
    currentChat,
    currentChatId,
    addMessage,
    updateContextData,
    createNewChat,
  } = useChat();
  const { model, advancedMode } = useSettings();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { backendOk, ollamaOk } = useHealthCheck();
  const isLocalModel = ["mistral", "qwen", "llama"].includes(model);
  const { push: pushHistory, navigate: navigateHistory } = useQueryHistory();
  const suggestion = useNextSuggestion(currentChat);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        createNewChat();
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createNewChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  if (!currentChat) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No active chat. Create a new one.
      </div>
    );
  }

  const handleHistoryNav = (dir: "up" | "down") => {
    const val = navigateHistory(dir);
    setQuery(val);
  };

  const exportChat = () => {
    if (!currentChat) return;
    const lines = currentChat.messages
      .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentChat.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || !currentChatId) return;

    pushHistory(text);
    addMessage(currentChatId, { role: "user", content: text });
    setQuery("");
    setIsLoading(true);

    try {
      const url = new URL("http://127.0.0.1:8000/ask");
      url.searchParams.append("query", text);
      url.searchParams.append("model", model);

      const res = await fetch(url.toString());

      if (!res.ok) {
        addMessage(currentChatId, {
          role: "assistant",
          content: `HTTP ${res.status}: ${res.statusText}`,
          error: `http_${res.status}`,
        });
        return;
      }

      const data = await res.json();

      if (data.error) {
        addMessage(currentChatId, {
          role: "assistant",
          content: data.error,
          error: "query_error",
        });
      } else if (data.data && data.data.length === 0) {
        addMessage(currentChatId, {
          role: "assistant",
          content:
            data.answer ||
            "Query returned no results. Try broadening your filter or a different region.",
          data: [],
          sql: data.sql,
        });
        updateContextData({
          sql: data.sql,
          vector: data.vector,
          model: data.mode || model,
        });
      } else {
        addMessage(currentChatId, {
          role: "assistant",
          content: data.answer || "Here is what I found.",
          data: data.data,
          sql: data.sql,
        });
        updateContextData({
          sql: data.sql,
          vector: data.vector,
          model: data.mode || model,
        });
      }
    } catch {
      addMessage(currentChatId, {
        role: "assistant",
        content: "",
        error: "backend_offline",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div className="flex h-full flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-3 sm:px-6 py-3 sm:py-4 bg-background z-10 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={onMenuClick}
              className="shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transiti
on-colors lg:hidden"
              title="Open sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">FloatChat</p>
              <p className="hidden sm:block text-xs text-muted-foreground">
                Ocean Intelligence Assistant
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <StatusPill
                status={backendOk}
                label="API"
                tooltip="FastAPI backend — required for all queries (localhost:8000)"
              />
              {isLocalModel && (
                <StatusPill
                  status={ollamaOk}
                  label="Ollama"
                  tooltip="Local model server — required for Mistral / QWEN / LLaMA (localhost:11434)"
                />
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {currentChat.messages.length > 0 && (
              <button
                onClick={exportChat}
                title="Export chat"
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Settings (⌘,)"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8">
          {currentChat.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-2">
              <div className="w-full max-w-3xl text-center">
                <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
                  How Can I Assist You Today?
                </h2>
                <p className="mx-auto mt-3 sm:mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                  Ask oceanographic questions, retrieve scientific data, run
                  SQL-backed analysis, and generate research-ready insights.
                </p>
                <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleSend(action)}
                      className="rounded-full border border-border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-accent transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl xl:max-w-5xl 2xl:max-w-6xl space-y-6 sm:space-y-8 pb-4">
              {currentChat.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "assistant"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot size={14} />
                    ) : (
                      <User size={14} />
                    )}
                  </div>

                  <div
                    className={`flex flex-col gap-2 max-w-[90%] sm:max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {/* Error states */}
                    {msg.role === "assistant" &&
                      msg.error === "backend_offline" && <OfflineCard />}
                    {msg.role === "assistant" &&
                      msg.error === "query_error" && (
                        <ErrorCard message={msg.content} />
                      )}
                    {msg.role === "assistant" &&
                      msg.error?.startsWith("http_") && (
                        <ErrorCard message={`Server error: ${msg.content}`} />
                      )}

                    {/* Normal message bubble */}
                    {(!msg.error ||
                      (msg.role === "assistant" &&
                        msg.content &&
                        msg.error !== "backend_offline" &&
                        msg.error !== "query_error" &&
                        !msg.error?.startsWith("http_"))) && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <MessageContent content={msg.content} />
                        ) : (
                          msg.content
                        )}
                      </div>
                    )}

                    {msg.data && msg.data.length > 0 && (
                      <div className="w-full">
                        <DataVisualizer data={msg.data} />
                      </div>
                    )}

                    {advancedMode && msg.role === "assistant" && msg.sql && (
                      <details className="w-full mt-2 rounded-xl border border-border bg-card">
                        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground select-none">
                          View generated SQL
                        </summary>
                        <pre className="border-t border-border overflow-x-auto p-4 text-xs bg-muted text-muted-foreground rounded-b-xl">
                          <code>{msg.sql}</code>
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot size={16} />
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground animate-pulse">
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <ChatInput
          query={query}
          setQuery={setQuery}
          onSend={() => handleSend()}
          isLoading={isLoading}
          onHistoryNav={handleHistoryNav}
          suggestion={currentChat.messages.length > 0 ? suggestion : null}
          onSuggestionClick={(s) => {
            setQuery(s);
          }}
        />
      </div>
    </>
  );
}

type StatusPillProps = {
  status: boolean | null;
  label: string;
  tooltip: string;
};

function StatusPill({ status, label, tooltip }: StatusPillProps) {
  const dotCls =
    status === null
      ? "bg-yellow-400 animate-pulse"
      : status
        ? "bg-green-500"
        : "bg-red-500";

  const textCls =
    status === null
      ? "text-muted-foreground"
      : status
        ? "text-green-600 dark:text-green-400"
        : "text-red-500";

  return (
    <div className="group relative">
      <div
        className={`flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 ${textCls}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
        <span className="text-xs font-medium">{label}</span>
        {status === false && (
          <span className="text-xs opacity-70">offline</span>
        )}
      </div>

      {/* Tooltip */}
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-background p-3 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
        <p className="text-xs font-medium mb-1">{label} status</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {tooltip}
        </p>
        {status === false && (
          <p className="mt-2 text-xs text-red-500 font-medium">
            {label === "API"
              ? "Start with: uvicorn main:app --reload"
              : "Start with: ollama serve"}
          </p>
        )}
      </div>
    </div>
  );
}
