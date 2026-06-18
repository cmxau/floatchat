"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark" | "auto";

interface SettingsContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  gptApiKey: string;
  setGptApiKey: (k: string) => void;
  mistralApiKey: string;
  setMistralApiKey: (k: string) => void;
  model: string;
  setModel: (m: string) => void;
  advancedMode: boolean;
  setAdvancedMode: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("auto");
  const [gptApiKey, setGptApiKeyState] = useState("");
  const [mistralApiKey, setMistralApiKeyState] = useState("");
  const [model, setModelState] = useState("auto");
  const [advancedMode, setAdvancedModeState] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("floatchat_settings");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.theme) setThemeState(p.theme);
        if (p.gptApiKey) setGptApiKeyState(p.gptApiKey);
        if (p.mistralApiKey) setMistralApiKeyState(p.mistralApiKey);
        if (p.model) setModelState(p.model);
        if (p.advancedMode !== undefined) setAdvancedModeState(p.advancedMode);
        applyTheme(p.theme || "auto");
        return;
      } catch {}
    }
    applyTheme("auto");
  }, []);

  const persist = (patch: Record<string, string | boolean>) => {
    const current = JSON.parse(localStorage.getItem("floatchat_settings") || "{}");
    localStorage.setItem("floatchat_settings", JSON.stringify({ ...current, ...patch }));
  };

  const setTheme = (t: Theme) => { setThemeState(t); persist({ theme: t }); applyTheme(t); };
  const setGptApiKey = (k: string) => { setGptApiKeyState(k); persist({ gptApiKey: k }); };
  const setMistralApiKey = (k: string) => { setMistralApiKeyState(k); persist({ mistralApiKey: k }); };
  const setModel = (m: string) => { setModelState(m); persist({ model: m }); };
  const setAdvancedMode = (v: boolean) => { setAdvancedModeState(v); persist({ advancedMode: v }); };

  return (
    <SettingsContext.Provider value={{
      theme, setTheme,
      gptApiKey, setGptApiKey,
      mistralApiKey, setMistralApiKey,
      model, setModel,
      advancedMode, setAdvancedMode,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
