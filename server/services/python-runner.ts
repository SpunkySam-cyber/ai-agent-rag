import { spawn } from "child_process";
import path from "path";
import { AIRequest, AIResponse } from "@shared/schema";
import { storage } from "../storage";

export class PythonRunner {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || "python3";
    this.scriptPath = path.join(import.meta.dirname, "ai-agent.py");
  }

  async runAIAgent(request: AIRequest): Promise<AIResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        // Enhance request with session documents for RAG
        const enhancedRequest = { ...request };
        
        // Get documents for the session if available
        if (request.sessionId) {
          const documents = await storage.getDocumentsBySession(request.sessionId);
          if (documents.length > 0) {
            enhancedRequest.sessionDocuments = documents;
          }
        }

        const pythonProcess = spawn(this.pythonPath, [this.scriptPath], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let output = "";
        let errorOutput = "";

        pythonProcess.stdout.on("data", (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
          // Log model loading progress to console but don't treat as error
          console.log(`[Python AI Agent]: ${data.toString().trim()}`);
        });

        pythonProcess.on("close", (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(output.trim());
              resolve(result);
            } catch (parseError) {
              reject(new Error(`Failed to parse AI response: ${parseError}`));
            }
          } else {
            reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
          }
        });

        pythonProcess.on("error", (error) => {
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        // Send input data to Python script
        pythonProcess.stdin.write(JSON.stringify(enhancedRequest));
        pythonProcess.stdin.end();
      } catch (error) {
        reject(new Error(`Failed to prepare AI request: ${error}`));
      }
    });
  }

  async processFileContent(filePath: string, mimeType: string): Promise<string> {
    const request: AIRequest = {
      query: `process_file:${filePath}:${mimeType}`,
      toolType: "chat",
      sessionId: "file-processing",
    };

    try {
      const response = await this.runAIAgent(request);
      return response.response;
    } catch (error) {
      throw new Error(`Failed to process file: ${error}`);
    }
  }
}

export const pythonRunner = new PythonRunner();
