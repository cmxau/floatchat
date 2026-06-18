"use client";

import { useState, useEffect } from "react";

export type HealthStatus = {
  backendOk: boolean | null;
  ollamaOk: boolean | null;
};

export function useHealthCheck(): HealthStatus {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/health", {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) { setBackendOk(false); return; }
        const data = await res.json();
        setBackendOk(data.service === "floatchat");
      } catch {
        setBackendOk(false);
      }
    };

    const checkOllama = async () => {
      try {
        const res = await fetch("http://127.0.0.1:11434/api/tags", {
          signal: AbortSignal.timeout(3000),
        });
        setOllamaOk(res.ok);
      } catch {
        setOllamaOk(false);
      }
    };

    checkBackend();
    checkOllama();

    const id = setInterval(() => {
      checkBackend();
      checkOllama();
    }, 30000);

    return () => clearInterval(id);
  }, []);

  return { backendOk, ollamaOk };
}
