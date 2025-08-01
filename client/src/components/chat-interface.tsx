import { useState, useRef, useEffect } from "react";
import { Send, Copy, RotateCcw, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAIAgent } from "@/hooks/use-ai-agent";
import type { Session, Message, Document } from "@shared/schema";

interface ChatInterfaceProps {
  session: Session;
  onSessionUpdate: (session: Session) => void;
}

export function ChatInterface({ session, onSessionUpdate }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentTool } = useAIAgent();

  // Fetch messages for current session
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/sessions", session.id, "messages"],
    enabled: !!session.id,
  });

  // Fetch documents for current session
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/sessions", session.id, "documents"],
    enabled: !!session.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const documentContent = documents.length > 0 ? documents[0].content : undefined;
      
      const response = await apiRequest("POST", "/api/ai/chat", {
        query: messageText,
        toolType: currentTool,
        sessionId: session.id,
        documentContent,
      });
      return response.json();
    },
    onMutate: () => {
      setIsProcessing(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setMessage("");
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!message.trim() || isProcessing) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied.",
    });
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getQuickActions = () => {
    return [
      { label: "Summarize", action: "Provide a summary of the key points" },
      { label: "Search Web", action: "Search the web for: " },
      { label: "Ask Questions", action: "What are the main concepts discussed?" },
    ];
  };

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <Card className="shadow-sm border border-slate-200">
      {/* Messages Container */}
      <CardContent className="p-6 space-y-4 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-600 mb-2">Ready to assist you!</p>
            <p className="text-sm text-slate-400">
              Ask me anything about your {documents.length > 0 ? "document" : "topic"}, search the web, or just chat.
            </p>
          </div>
        ) : (
          messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-xs lg:max-w-md bg-blue-600 text-white rounded-lg px-4 py-3">
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-blue-200 mt-1">
                    {formatTimestamp(msg.createdAt)}
                  </p>
                </div>
              ) : (
                <div className="flex space-x-3 max-w-xs lg:max-w-md">
                  <div className="w-8 h-8 gradient-brain rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="text-white" size={16} />
                  </div>
                  <div className="bg-slate-100 rounded-lg px-4 py-3 flex-1">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-500">
                        {formatTimestamp(msg.createdAt)}
                        {msg.metadata?.model && (
                          <span className="ml-2">• {msg.metadata.model}</span>
                        )}
                        {msg.metadata?.ragEnhanced && (
                          <span className="ml-2 text-green-600 font-medium">• RAG Enhanced</span>
                        )}
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-slate-400 hover:text-slate-600"
                          onClick={() => copyMessage(msg.content)}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-xs lg:max-w-md">
              <div className="w-8 h-8 gradient-brain rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="text-white" size={16} />
              </div>
              <div className="bg-slate-100 rounded-lg px-4 py-3 flex-1">
                <div className="flex items-center space-x-2">
                  <Loader2 className="animate-spin text-blue-600" size={16} />
                  <p className="text-sm text-slate-600">Processing your request...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your document, search the web, or just chat..."
                className="min-h-[80px] pr-12 resize-none"
                disabled={isProcessing}
              />
              <Button
                size="sm"
                className="absolute right-3 bottom-3 w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700"
                onClick={handleSendMessage}
                disabled={!message.trim() || isProcessing}
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {getQuickActions().map((action, index) => (
            <Button
              key={index}
              variant="secondary"
              size="sm"
              className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
              onClick={() => setMessage(action.action)}
              disabled={isProcessing}
            >
              {action.label}
            </Button>
          ))}
        </div>

        {/* Model Status */}
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span>{message.length}/2048 characters</span>
            {messages.length > 0 && messages[messages.length - 1]?.metadata?.processingTime && (
              <span>~{messages[messages.length - 1].metadata.processingTime}s response time</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
