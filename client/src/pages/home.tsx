import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { MainContent } from "@/components/main-content";
import type { Session } from "@shared/schema";

export default function Home() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        currentSession={currentSession}
        onSessionSelect={setCurrentSession}
      />
      <MainContent 
        currentSession={currentSession}
        onSessionChange={setCurrentSession}
      />
    </div>
  );
}
