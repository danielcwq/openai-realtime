import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get("/session", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log("API Key present:", !!apiKey);
    console.log("API Key starts with sk-:", apiKey?.startsWith('sk-'));
    console.log("API Key length:", apiKey?.length);
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2025-06-03",
        voice: "verse",
      }),
    });
    
    if (!r.ok) {
      throw new Error(`OpenAI API request failed: ${r.status} ${r.statusText}`);
    }
    
    const data = await r.json();
    res.json(data);
  } catch (error) {
    console.error("Error creating ephemeral token:", error);
    res.status(500).json({ error: "Failed to create session token" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Make sure to set your OPENAI_API_KEY environment variable");
});