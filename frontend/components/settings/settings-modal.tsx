"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Check, Sun, Moon, Monitor, ExternalLink } from "lucide-react";
import { useSettings } from "@/context/settings-context";

type Tab = "appearance" | "api-keys" | "model";

const MODELS = [
  { value: "auto",    label: "Auto",           desc: "Routes between GPT and Mistral based on query type" },
  { value: "gpt",     label: "GPT-4o-mini",    desc: "OpenAI — best for complex filters and aggregations" },
  { value: "mistral", label: "Mistral",         desc: "Local Ollama — best for trend and pattern queries" },
  { value: "qwen",    label: "QWEN 2.5 Coder", desc: "Local Ollama — optimized for code and SQL generation" },
  { value: "llama",   label: "LLaMA 3.2",      desc: "Local Ollama — fast general-purpose inference" },
];

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const {
    theme, setTheme,
    gptApiKey, setGptApiKey,
    mistralApiKey, setMistralApiKey,
    model, setModel,
    advancedMode, setAdvancedMode,
  } = useSettings();

  const [tab, setTab] = useState<Tab>("appearance");
  const [showGpt, setShowGpt] = useState(false);
  const [showMistral, setShowMistral] = useState(false);

  // Drafts — only committed on Save
  const [draftGptKey, setDraftGptKey] = useState(gptApiKey);
  const [draftMistralKey, setDraftMistralKey] = useState(mistralApiKey);
  const [draftModel, setDraftModel] = useState(model);
  const [saved, setSaved] = useState(false);

  // Ollama models
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaChecking, setOllamaChecking] = useState(false);

  useEffect(() => {
    if (tab !== "model") return;
    setOllamaChecking(true);
    fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((d) => setOllamaModels(d.models?.map((m: any) => m.name) ?? []))
      .catch(() => setOllamaModels([]))
      .finally(() => setOllamaChecking(false));
  }, [tab]);

  const handleSave = () => {
    setGptApiKey(draftGptKey);
    setMistralApiKey(draftMistralKey);
    setModel(draftModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "appearance", label: "Appearance" },
    { id: "api-keys",   label: "API Keys"   },
    { id: "model",      label: "Model"      },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[85dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Nav — horizontal scroll on mobile, vertical on sm+ */}
          <nav className="shrink-0 border-b sm:border-b-0 sm:border-r border-border p-2 sm:p-3 flex sm:flex-col sm:w-44 gap-1 sm:space-y-0.5 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-colors sm:w-full sm:text-left whitespace-nowrap ${
                  tab === t.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">

              {/* Appearance */}
              {tab === "appearance" && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-1 text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Choose how FloatChat looks to you.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light" as const, label: "Light",  icon: <Sun size={16} />     },
                      { value: "dark"  as const, label: "Dark",   icon: <Moon size={16} />    },
                      { value: "auto"  as const, label: "System", icon: <Monitor size={16} /> },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors ${
                          theme === t.value
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {t.icon}
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Advanced mode toggle */}
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-border p-4">
                    <div>
                      <p className="text-sm font-medium">Advanced mode</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Show generated SQL in chat responses</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdvancedMode(!advancedMode)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${advancedMode ? "bg-primary" : "bg-border"}`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${advancedMode ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* API Keys */}
              {tab === "api-keys" && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-1 text-sm font-medium">API Keys</p>
                    <p className="text-xs text-muted-foreground">
                      Stored locally in your browser. Never sent to any server.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        OpenAI (GPT-4o-mini)
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                        <input
                          type={showGpt ? "text" : "password"}
                          value={draftGptKey}
                          onChange={(e) => setDraftGptKey(e.target.value)}
                          placeholder="sk-..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={() => setShowGpt(!showGpt)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showGpt ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Mistral (Ollama — optional)
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                        <input
                          type={showMistral ? "text" : "password"}
                          value={draftMistralKey}
                          onChange={(e) => setDraftMistralKey(e.target.value)}
                          placeholder="Optional API key..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={() => setShowMistral(!showMistral)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showMistral ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Model */}
              {tab === "model" && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-1 text-sm font-medium">Default Model</p>
                    <p className="text-xs text-muted-foreground">Controls which LLM generates SQL.</p>
                  </div>
                  <div className="space-y-2">
                    {MODELS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDraftModel(opt.value)}
                        className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                          draftModel === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <p className={`text-sm font-medium ${draftModel === opt.value ? "text-primary" : ""}`}>
                          {opt.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Ollama status */}
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Ollama — Pulled Models
                    </p>
                    {ollamaChecking ? (
                      <p className="text-xs text-muted-foreground animate-pulse">Checking...</p>
                    ) : ollamaModels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ollamaModels.map((m) => (
                          <span key={m} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-medium">
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/70">
                        Ollama not reachable or no models pulled.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Save footer — api-keys and model tabs */}
            {tab !== "appearance" && (
              <div className="border-t border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-end gap-3">
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                    <Check size={13} /> Saved
                  </span>
                )}
                <button
                  onClick={handleSave}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Save changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Credits footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 sm:px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <a
              href="https://github.com/cmxau"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              cmxau
            </a>
          </p>
          <a
            href="https://github.com/cmxau/floatchat/issues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Report issue / Request feature <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
