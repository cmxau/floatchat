"use client";

import { useState, ReactNode } from "react";
import { ChatSidebar } from "@/components/sidebar/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ChatSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex min-w-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col border-x border-border">
          {children ?? <ChatWindow onMenuClick={() => setSidebarOpen((v) => !v)} />}
        </section>
      </main>
    </div>
  );
}
