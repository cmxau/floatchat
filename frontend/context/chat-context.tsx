"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

export type Message = {
  role: "user" | "assistant";
  content: string;
  data?: any[];
  sql?: string | null;
  error?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  projectId?: string;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

export type ContextData = {
  sql: string | null;
  vector: any | null;
  model: string;
};

interface ChatContextType {
  chats: ChatSession[];
  currentChatId: string | null;
  currentChat: ChatSession | undefined;
  contextData: ContextData | null;
  projects: Project[];
  createNewChat: (projectId?: string) => void;
  switchChat: (id: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateContextData: (data: ContextData) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  createProject: (name: string, color: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  moveChatToProject: (chatId: string, projectId: string | undefined) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 10);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    // Load projects
    try {
      const savedProjects = localStorage.getItem("floatchat_projects");
      if (savedProjects) setProjects(JSON.parse(savedProjects));
    } catch {}

    // Load chats
    const saved = localStorage.getItem("floatchat_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
          setCurrentChatId(parsed[0].id);
          initialized.current = true;
          return;
        }
      } catch {}
    }
    const id = generateId();
    setChats([{ id, title: "New Chat", messages: [], updatedAt: Date.now() }]);
    setCurrentChatId(id);
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    localStorage.setItem("floatchat_sessions", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem("floatchat_projects", JSON.stringify(projects));
  }, [projects]);

  const createNewChat = (projectId?: string) => {
    const id = generateId();
    const newChat: ChatSession = {
      id,
      title: "New Chat",
      messages: [],
      updatedAt: Date.now(),
      projectId,
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(id);
    setContextData(null);
  };

  const switchChat = (id: string) => {
    setCurrentChatId(id);
    setContextData(null);
  };

  const deleteChat = (id: string) => {
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (updated.length === 0) {
        const newId = generateId();
        setCurrentChatId(newId);
        return [{ id: newId, title: "New Chat", messages: [], updatedAt: Date.now() }];
      }
      if (id === currentChatId) setCurrentChatId(updated[0].id);
      return updated;
    });
  };

  const renameChat = (id: string, title: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: title.trim() || c.title } : c))
    );
  };

  const addMessage = (chatId: string, message: Message) => {
    setChats((prev) =>
      prev
        .map((chat) => {
          if (chat.id !== chatId) return chat;
          const newTitle =
            chat.title === "New Chat" && message.role === "user"
              ? message.content.substring(0, 32) + (message.content.length > 32 ? "…" : "")
              : chat.title;
          return { ...chat, title: newTitle, messages: [...chat.messages, message], updatedAt: Date.now() };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  const updateContextData = (data: ContextData) => setContextData(data);

  const createProject = (name: string, color: string) => {
    const project: Project = { id: generateId(), name: name.trim(), color, createdAt: Date.now() };
    setProjects((prev) => [project, ...prev]);
  };

  const deleteProject = (id: string) => {
    // Move all chats in this project to unassigned
    setChats((prev) => prev.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c)));
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const renameProject = (id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p))
    );
  };

  const moveChatToProject = (chatId: string, projectId: string | undefined) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, projectId } : c)));
  };

  const currentChat = chats.find((c) => c.id === currentChatId);

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChatId,
        currentChat,
        contextData,
        projects,
        createNewChat,
        switchChat,
        addMessage,
        updateContextData,
        deleteChat,
        renameChat,
        createProject,
        deleteProject,
        renameProject,
        moveChatToProject,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
