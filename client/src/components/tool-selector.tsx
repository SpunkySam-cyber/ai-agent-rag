import { MessageSquare, FileText, Search, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIAgent } from "@/hooks/use-ai-agent";
import type { Session } from "@shared/schema";

interface ToolSelectorProps {
  currentSession: Session | null;
}

export function ToolSelector({ currentSession }: ToolSelectorProps) {
  const { currentTool, setCurrentTool } = useAIAgent();

  const tools = [
    { id: 'chat', name: 'Chat Assistant', icon: MessageSquare },
    { id: 'summary', name: 'Document Summary', icon: FileText },
    { id: 'search', name: 'Web Search', icon: Search },
    { id: 'qa', name: 'Q&A Assistant', icon: HelpCircle },
  ] as const;

  return (
    <div className="p-4 border-b border-slate-200">
      <h3 className="text-sm font-medium text-slate-700 mb-3">AI Tools</h3>
      <div className="space-y-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          
          return (
            <Button
              key={tool.id}
              variant="ghost"
              className={`w-full justify-start space-x-3 p-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50' 
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
              onClick={() => setCurrentTool(tool.id)}
            >
              <Icon size={16} />
              <span className="font-medium">{tool.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
