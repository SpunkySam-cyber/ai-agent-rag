import { useState, useCallback } from "react";
import { CloudUpload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Session, Document } from "@shared/schema";

interface FileUploadProps {
  onSessionCreated: (session: Session) => void;
}

export function FileUpload({ onSessionCreated }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sessions", {
        title: "Document Analysis Session",
        toolType: "summary",
      });
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ sessionId, file }: { sessionId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/sessions/${sessionId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (document: Document) => {
      setUploadedDocument(document);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "File uploaded successfully",
        description: `${document.filename} has been processed and is ready for analysis.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!["application/pdf", "text/plain"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload only PDF or TXT files.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create session first
      const session = await createSessionMutation.mutateAsync();
      
      // Then upload file
      await uploadMutation.mutateAsync({ sessionId: session.id, file });
      
      // Notify parent component
      onSessionCreated(session);
    } catch (error) {
      console.error("Upload error:", error);
    }
  }, [createSessionMutation, uploadMutation, onSessionCreated, toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const removeDocument = () => {
    setUploadedDocument(null);
  };

  const isUploading = createSessionMutation.isPending || uploadMutation.isPending;

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive 
            ? "border-blue-400 bg-blue-50" 
            : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className="flex flex-col items-center">
          <CloudUpload className="text-4xl text-slate-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {isUploading ? "Uploading Document..." : "Upload Document"}
          </h3>
          <p className="text-slate-500 mb-4">
            Drag & drop your PDF or TXT files here, or click to browse
          </p>
          <Button 
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isUploading}
          >
            <CloudUpload size={16} className="mr-2" />
            {isUploading ? "Processing..." : "Browse Files"}
          </Button>
        </div>
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept=".pdf,.txt"
          onChange={handleFileInput}
          disabled={isUploading}
        />
      </div>

      {/* Document Preview */}
      {uploadedDocument && (
        <Card className="shadow-sm border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-red-600" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{uploadedDocument.filename}</h4>
                  <p className="text-sm text-slate-500">{uploadedDocument.size}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-600"
                onClick={removeDocument}
              >
                <X size={16} />
              </Button>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-slate-700">
                {uploadedDocument.content.slice(0, 500)}
                {uploadedDocument.content.length > 500 && "..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
