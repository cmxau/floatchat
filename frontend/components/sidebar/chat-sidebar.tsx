"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Pencil, Check, ChevronDown, ChevronRight, FolderPlus, Folder, X } from "lucide-react";
import { useChat, Project, ChatSession } from "@/context/chat-context";

const PROJECT_COLORS = [
  { value: "blue",   dot: "bg-blue-500"   },
  { value: "green",  dot: "bg-green-500"  },
  { value: "red",    dot: "bg-red-500"    },
  { value: "purple", dot: "bg-purple-500" },
  { value: "orange", dot: "bg-orange-500" },
];

function colorDot(color: string) {
  return PROJECT_COLORS.find((c) => c.value === color)?.dot ?? "bg-gray-400";
}

type ChatSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function ChatSidebar({ open, onClose }: ChatSidebarProps) {
  const {
    chats, currentChatId, createNewChat, switchChat, deleteChat, renameChat,
    projects, createProject, deleteProject, renameProject, moveChatToProject,
  } = useChat();

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editChatValue, setEditChatValue] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectValue, setEditProjectValue] = useState("");
  const projectInputRef = useRef<HTMLInputElement>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [movingChatId, setMovingChatId] = useState<string | null>(null);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("blue");
  const newProjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingChatId && chatInputRef.current) {
      chatInputRef.current.focus();
      chatInputRef.current.select();
    }
  }, [editingChatId]);

  useEffect(() => {
    if (editingProjectId && projectInputRef.current) {
      projectInputRef.current.focus();
      projectInputRef.current.select();
    }
  }, [editingProjectId]);

  useEffect(() => {
    if (showNewProject && newProjectRef.current) newProjectRef.current.focus();
  }, [showNewProject]);

  const startEditChat = (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditChatValue(chat.title);
    setMovingChatId(null);
  };

  const commitEditChat = (id: string) => {
    renameChat(id, editChatValue);
    setEditingChatId(null);
  };

  const startEditProject = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    setEditingProjectId(p.id);
    setEditProjectValue(p.name);
  };

  const commitEditProject = (id: string) => {
    renameProject(id, editProjectValue);
    setEditingProjectId(null);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitNewProject = () => {
    if (!newProjectName.trim()) return;
    createProject(newProjectName, newProjectColor);
    setNewProjectName("");
    setNewProjectColor("blue");
    setShowNewProject(false);
  };

  const handleSelectChat = (id: string) => {
    if (editingChatId === id) return;
    switchChat(id);
    onClose(); // close drawer on mobile after selecting
  };

  const unassigned = chats.filter((c) => !c.projectId);

  return (
    <aside
      className={[
        // Base layout
        "flex flex-col border-r border-border bg-background lg:bg-muted/30",
        // Mobile: fixed overlay drawer
        "fixed inset-y-0 left-0 z-40 w-72",
        // Desktop: static in flow
        "lg:static lg:z-auto",
        // Slide animation
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        // TV: slightly wider
        "2xl:w-80",
      ].join(" ")}
    >
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">FloatChat</h1>
          <p className="text-xs text-muted-foreground">Ocean intelligence assistant</p>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Actions row */}
      <div className="flex gap-2 border-b border-border p-3">
        <button
          onClick={() => { createNewChat(); onClose(); }}
          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Chat
        </button>
        <button
          onClick={() => setShowNewProject((v) => !v)}
          title="New Project"
          className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {/* New project form */}
      {showNewProject && (
        <div className="border-b border-border px-3 py-3 space-y-2">
          <input
            ref={newProjectRef}
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewProject();
              if (e.key === "Escape") setShowNewProject(false);
            }}
            placeholder="Project name…"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setNewProjectColor(c.value)}
                className={`h-5 w-5 rounded-full ${c.dot} transition-transform ${newProjectColor === c.value ? "scale-125 ring-2 ring-offset-1 ring-primary" : ""}`}
              />
            ))}
            <button
              onClick={submitNewProject}
              disabled={!newProjectName.trim()}
              className="ml-auto rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* Projects */}
        {projects.length > 0 && (
          <div>
            <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Projects
            </p>
            <div className="space-y-1">
              {projects.map((project) => {
                const projectChats = chats.filter((c) => c.projectId === project.id);
                const isCollapsed = collapsed.has(project.id);
                return (
                  <div key={project.id}>
                    <div
                      className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent cursor-pointer"
                      onClick={() => toggleCollapse(project.id)}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorDot(project.color)}`} />
                      {editingProjectId === project.id ? (
                        <input
                          ref={projectInputRef}
                          value={editProjectValue}
                          onChange={(e) => setEditProjectValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEditProject(project.id);
                            if (e.key === "Escape") setEditingProjectId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-primary"
                        />
                      ) : (
                        <span className="flex-1 truncate text-sm font-medium">{project.name}</span>
                      )}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEditProject(e, project)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <span className="ml-1 text-muted-foreground">
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </span>
                    </div>

                    {!isCollapsed && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-3">
                        {projectChats.length === 0 ? (
                          <p className="py-1 text-xs text-muted-foreground/60 italic">No chats yet</p>
                        ) : (
                          projectChats.map((chat) => (
                            <ChatRow
                              key={chat.id}
                              chat={chat}
                              isActive={currentChatId === chat.id}
                              isEditing={editingChatId === chat.id}
                              editValue={editChatValue}
                              inputRef={chatInputRef}
                              projects={projects}
                              movingChatId={movingChatId}
                              onSelect={() => handleSelectChat(chat.id)}
                              onStartEdit={(e) => startEditChat(e, chat)}
                              onCommitEdit={() => commitEditChat(chat.id)}
                              onCancelEdit={() => setEditingChatId(null)}
                              onEditChange={setEditChatValue}
                              onDelete={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                              onMoveToggle={(e) => { e.stopPropagation(); setMovingChatId(movingChatId === chat.id ? null : chat.id); }}
                              onMoveTo={(pid) => { moveChatToProject(chat.id, pid); setMovingChatId(null); }}
                            />
                          ))
                        )}
                        <button
                          onClick={() => { createNewChat(project.id); onClose(); }}
                          className="w-full py-1 text-left text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                        >
                          + new chat in project
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unassigned chats */}
        <div>
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {projects.length > 0 ? "Unassigned" : "Recent Chats"}
          </p>
          <div className="space-y-0.5">
            {unassigned.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                isActive={currentChatId === chat.id}
                isEditing={editingChatId === chat.id}
                editValue={editChatValue}
                inputRef={chatInputRef}
                projects={projects}
                movingChatId={movingChatId}
                onSelect={() => handleSelectChat(chat.id)}
                onStartEdit={(e) => startEditChat(e, chat)}
                onCommitEdit={() => commitEditChat(chat.id)}
                onCancelEdit={() => setEditingChatId(null)}
                onEditChange={setEditChatValue}
                onDelete={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                onMoveToggle={(e) => { e.stopPropagation(); setMovingChatId(movingChatId === chat.id ? null : chat.id); }}
                onMoveTo={(pid) => { moveChatToProject(chat.id, pid); setMovingChatId(null); }}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

type ChatRowProps = {
  chat: ChatSession;
  isActive: boolean;
  isEditing: boolean;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  projects: Project[];
  movingChatId: string | null;
  onSelect: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (v: string) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveToggle: (e: React.MouseEvent) => void;
  onMoveTo: (projectId: string | undefined) => void;
};

function ChatRow({
  chat, isActive, isEditing, editValue, inputRef, projects, movingChatId,
  onSelect, onStartEdit, onCommitEdit, onCancelEdit, onEditChange, onDelete, onMoveToggle, onMoveTo,
}: ChatRowProps) {
  const showMover = movingChatId === chat.id;

  return (
    <div className="relative">
      <div
        onClick={onSelect}
        className={`group flex items-center gap-1 rounded-xl px-3 py-2 text-sm transition-colors cursor-pointer ${
          isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"
        }`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-primary"
          />
        ) : (
          <span className="flex-1 truncate">{chat.title}</span>
        )}

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <button onClick={(e) => { e.stopPropagation(); onCommitEdit(); }} className="p-1 rounded text-primary">
              <Check size={13} />
            </button>
          ) : (
            <>
              {projects.length > 0 && (
                <button onClick={onMoveToggle} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Move to project">
                  <Folder size={13} />
                </button>
              )}
              <button onClick={onStartEdit} className="p-1 rounded text-muted-foreground hover:text-foreground">
                <Pencil size={13} />
              </button>
              <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {showMover && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-background shadow-lg p-1.5">
          <p className="px-2 py-1 text-xs text-muted-foreground font-medium">Move to project</p>
          {chat.projectId && (
            <button
              onClick={() => onMoveTo(undefined)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted"
            >
              <X size={12} /> Remove from project
            </button>
          )}
          {projects.map((p) => (
            p.id !== chat.projectId && (
              <button
                key={p.id}
                onClick={() => onMoveTo(p.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted"
              >
                <span className={`h-2 w-2 rounded-full ${colorDot(p.color)}`} />
                {p.name}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}
