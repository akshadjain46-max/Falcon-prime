import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: "20mb" }));

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Deep forensic document analysis using Gemini
app.post("/api/analyze-document", async (req: Request, res: Response) => {
  try {
    const { filename, content, sourceType } = req.body;
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "Missing or invalid document content" });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      // Fallback response indicating server has no key; client uses local extractor
      res.json({
        geminiUsed: false,
        message: "Gemini API key not configured on server. Used local extraction.",
      });
      return;
    }

    const prompt = `You are Falcon Forensic Intelligence, an elite investigative parser. Analyze the following law enforcement / intelligence document:
Filename: ${filename || "Unknown document"}
Detected Source Type: ${sourceType || "General Document"}

Document Content:
${content.slice(0, 15000)}

Extract structured entities in strict JSON format:
{
  "summary": "2-sentence executive forensic summary",
  "persons": [{"name": "FullName", "role": "Suspect/Witness/Operative", "aliases": ["alias1"]}],
  "phoneNumbers": ["+1-xxx-xxx-xxxx"],
  "bankAccounts": ["Acct# or Crypto Wallet 0x..."],
  "vehicles": [{"plate": "7XYZ89", "model": "Armored SUV", "color": "Black"}],
  "locations": [{"name": "Pier 4", "address": "Detailed address", "threatLevel": "CRITICAL"}],
  "events": [{"time": "02:15 AM", "description": "Short description of action", "location": "Pier 4"}],
  "threatScore": 88
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { rawAiResponse: text };
    }

    res.json({
      geminiUsed: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({
      error: error?.message || "Failed to analyze document with AI",
      geminiUsed: false,
    });
  }
});

// AI Cross-Case Synthesis & Investigative Deductions
app.post("/api/ai-synthesis", async (req: Request, res: Response) => {
  try {
    const { documentsSummary, casesSummary } = req.body;
    const ai = getGenAI();

    if (!ai) {
      res.json({
        geminiUsed: false,
        synthesis: "Cross-correlating documents using local forensic graph. No Gemini API key detected.",
      });
      return;
    }

    const prompt = `You are a Lead Forensic Crime Analyst for the Falcon Intelligence Core. Review the summarized documents and cases:
Documents: ${JSON.stringify(documentsSummary)}
Cases: ${JSON.stringify(casesSummary)}

Provide an elite investigative synthesis:
1. Executive Modus Operandi (MO) Assessment
2. Prime Suspect Hierarchy & Critical Intercept Links
3. Recommended Immediate Tactical/Subpoena Actions

Keep your response structured, authoritative, and concise (under 300 words).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    res.json({
      geminiUsed: true,
      synthesis: response.text,
    });
  } catch (error: any) {
    console.error("AI synthesis error:", error);
    res.status(500).json({
      error: error?.message || "Synthesis generation failed",
      geminiUsed: false,
    });
  }
});

// Process-level crash prevention
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Express error handler
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error("Express Error Handler:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Falcon Intelligence Server running on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error("Server listen error:", err);
  });
}

startServer();
