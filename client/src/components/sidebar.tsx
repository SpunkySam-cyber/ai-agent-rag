import { Brain, MessageSquare, FileText, Search, HelpCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolSelector } from "./tool-selector";
import { SessionHistory } from "./session-history";
import type { Session } from "@shared/schema";

interface SidebarProps {
  currentSession: Session | null;
  onSessionSelect: (session: Session | null) => void;
}

export function Sidebar({ currentSession, onSessionSelect }: SidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 gradient-brain rounded-lg flex items-center justify-center">
            <Brain className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">AI Agent</h1>
            <p className="text-sm text-slate-500">Intelligent Assistant</p>
          </div>
        </div>
      </div>

      {/* Tool Selector */}
      <ToolSelector currentSession={currentSession} />

      {/* Session History */}
      <SessionHistory 
        currentSession={currentSession}
        onSessionSelect={onSessionSelect}
      />

      {/* Status Bar */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          <span>AI Models Ready</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          FLAN-T5 • BlenderBot • RAG Enhanced
        </div>
        <div className="mt-1 text-xs text-green-600 font-medium">
          🧠 RAG Vector Search Active
        </div>
      </div>
    </div>
  );
}
