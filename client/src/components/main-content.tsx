import { useState } from "react";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "./file-upload";
import { ChatInterface } from "./chat-interface";
import { useAIAgent } from "@/hooks/use-ai-agent";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";

interface MainContentProps {
  currentSession: Session | null;
  onSessionChange: (session: Session | null) => void;
}

export function MainContent({ currentSession, onSessionChange }: MainContentProps) {
  const { currentTool, modelStatus } = useAIAgent();
  const queryClient = useQueryClient();

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sessions", {
        title: "New Session",
        toolType: currentTool,
      });
      return response.json();
    },
    onSuccess: (newSession: Session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      onSessionChange(newSession);
    },
  });

  const exportSessionMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession) return;
      
      const messagesResponse = await apiRequest("GET", `/api/sessions/${currentSession.id}/messages`);
      const messages = await messagesResponse.json();
      
      // Create export content
      const exportContent = {
        session: currentSession,
        messages,
        exportedAt: new Date().toISOString(),
      };
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-session-${currentSession.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const getToolName = (toolType: string) => {
    switch (toolType) {
      case 'summary': return 'Document Summary';
      case 'search': return 'Web Search';
      case 'qa': return 'Q&A Assistant';
      default: return 'Chat Assistant';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {getToolName(currentTool)}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <span>{modelStatus}</span>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-800"
              onClick={() => exportSessionMutation.mutate()}
              disabled={!currentSession || exportSessionMutation.isPending}
            >
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-800"
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending}
            >
              <Plus size={16} className="mr-2" />
              New Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {!currentSession ? (
            <div className="space-y-6">
              <FileUpload onSessionCreated={onSessionChange} />
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  Start a new conversation or upload a document to begin
                </p>
                <Button 
                  onClick={() => createSessionMutation.mutate()}
                  disabled={createSessionMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createSessionMutation.isPending ? "Creating..." : "Start New Session"}
                </Button>
              </div>
            </div>
          ) : (
            <ChatInterface 
              session={currentSession}
              onSessionUpdate={onSessionChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
