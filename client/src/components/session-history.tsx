import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Search, MessageSquare, HelpCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";

interface SessionHistoryProps {
  currentSession: Session | null;
  onSessionSelect: (session: Session | null) => void;
}

export function SessionHistory({ currentSession, onSessionSelect }: SessionHistoryProps) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["/api/sessions"],
    select: (data: Session[]) => data.slice(0, 10), // Show last 10 sessions
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      // Delete all sessions
      await Promise.all(sessions.map(session => 
        apiRequest("DELETE", `/api/sessions/${session.id}`)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      onSessionSelect(null);
    },
  });

  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case 'summary': return FileText;
      case 'search': return Search;
      case 'qa': return HelpCircle;
      default: return MessageSquare;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700">Recent Sessions</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-slate-600 p-1"
          onClick={() => clearHistoryMutation.mutate()}
          disabled={clearHistoryMutation.isPending || sessions.length === 0}
        >
          <Trash2 size={14} />
        </Button>
      </div>
      
      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">No sessions yet</p>
            <p className="text-xs text-slate-400 mt-1">Start a conversation to see your history</p>
          </div>
        ) : (
          sessions.map((session) => {
            const Icon = getToolIcon(session.toolType);
            const isActive = currentSession?.id === session.id;
            
            return (
              <Button
                key={session.id}
                variant="ghost"
                className={`w-full p-3 h-auto justify-start rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-slate-100' 
                    : 'hover:bg-slate-100'
                }`}
                onClick={() => onSessionSelect(session)}
              >
                <div className="flex items-start space-x-3 w-full">
                  <Icon className="text-slate-400 mt-1 flex-shrink-0" size={16} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {session.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTimestamp(session.updatedAt)}
                    </p>
                  </div>
                </div>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
