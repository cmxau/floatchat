"use client";

import { useRef, useEffect } from "react";

const KEY = "floatchat_query_history";
const MAX = 20;

export function useQueryHistory() {
  const historyRef = useRef<string[]>([]);
  const indexRef = useRef(-1);

  useEffect(() => {
    try {
      historyRef.current = JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {}
  }, []);

  const push = (q: string) => {
    if (!q.trim()) return;
    const h = [q, ...historyRef.current.filter((x) => x !== q)].slice(0, MAX);
    historyRef.current = h;
    localStorage.setItem(KEY, JSON.stringify(h));
    indexRef.current = -1;
  };

  const navigate = (dir: "up" | "down"): string => {
    const h = historyRef.current;
    if (!h.length) return "";
    if (dir === "up") {
      indexRef.current = Math.min(indexRef.current + 1, h.length - 1);
    } else {
      indexRef.current = Math.max(indexRef.current - 1, -1);
    }
    return indexRef.current === -1 ? "" : h[indexRef.current];
  };

  return { push, navigate };
}
