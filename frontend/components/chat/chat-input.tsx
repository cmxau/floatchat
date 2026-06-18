"use client";

import { useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

type ChatInputProps = {
  query: string;
  setQuery: (q: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onHistoryNav?: (dir: "up" | "down") => void;
  suggestion?: string | null;
  onSuggestionClick?: (s: string) => void;
};

export function ChatInput({
  query,
  setQuery,
  onSend,
  isLoading,
  onHistoryNav,
  suggestion,
  onSuggestionClick,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea on content change
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [query]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
      return;
    }
    if (e.key === "ArrowUp" && !query.includes("\n")) {
      e.preventDefault();
      onHistoryNav?.("up");
      return;
    }
    if (e.key === "ArrowDown" && !query.includes("\n")) {
      e.preventDefault();
      onHistoryNav?.("down");
    }
  };

  return (
    <div className="border-t border-border bg-background px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
      {/* Suggestion pill */}
      {suggestion && !isLoading && (
        <div className="mx-auto mb-2.5 max-w-3xl">
          <button
            onClick={() => onSuggestionClick?.(suggestion)}
            className="rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {suggestion}
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:border-primary/50 transition-colors">
        <textarea
          ref={textareaRef}
          placeholder="Ask about salinity trends in the Arabian Sea..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{ height: "24px" }}
          className="flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
          disabled={isLoading}
        />
        <button
          onClick={onSend}
          disabled={isLoading || !query.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40 hover:bg-primary/90"
          title="Send (Enter)"
        >
          <ArrowUp size={15} />
        </button>
      </div>

      <p className="mt-1.5 hidden sm:block text-center text-xs text-muted-foreground/40">
        Enter to send · Shift+Enter for newline · Arrow keys for history
      </p>
    </div>
  );
}
