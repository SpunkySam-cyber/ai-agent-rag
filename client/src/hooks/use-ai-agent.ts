import { useState, useCallback } from "react";

type ToolType = 'chat' | 'summary' | 'search' | 'qa';

export function useAIAgent() {
  const [currentTool, setCurrentTool] = useState<ToolType>('chat');
  const [modelStatus, setModelStatus] = useState("Using FLAN-T5 Base");

  const handleToolChange = useCallback((tool: ToolType) => {
    setCurrentTool(tool);
    
    // Update model status based on selected tool
    switch (tool) {
      case 'summary':
        setModelStatus("Using FLAN-T5 Large");
        break;
      case 'search':
        setModelStatus("Using FLAN-T5 + Web Search");
        break;
      case 'qa':
        setModelStatus("Using DistilBERT QA");
        break;
      default:
        setModelStatus("Using FLAN-T5 Base");
    }
  }, []);

  return {
    currentTool,
    modelStatus,
    setCurrentTool: handleToolChange,
  };
}
