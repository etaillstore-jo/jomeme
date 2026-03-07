const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const analyzeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  message: { error: "Daily limit reached. Upgrade to Pro!" },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(generalLimiter);

// ── OpenRouter API call ───────────────────────────────────────────────────────
async function callOpenRouter(messages, model = "meta-llama/llama-3.2-11b-vision-instruct:free") {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://spotai-frontend.vercel.app",
      "X-Title": "SpotAI"
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.2
    })
  });

  const data = await res.json();
  console.log("OpenRouter status:", res.status);

  if (data.error) {
    console.error("OpenRouter error:", JSON.stringify(data.error));
    throw new Error(data.error.message || "OpenRouter API error");
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    console.error("Empty response:", JSON.stringify(data).substring(0, 400));
    throw new Error("Empty response from AI");
  }

  return text.trim();
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "SpotAI", timestamp: new Date().toISOString() });
});

// ── Analyze Photo ─────────────────────────────────────────────────────────────
app.post("/api/analyze", analyzeLimiter, async (req, res) => {
  try {
    const { image, mediaType } = req.body;
    if (!image || !mediaType) {
      return res.status(400).json({ error: "image and mediaType are required." });
    }

    const prompt = `You are SpotAI, an expert geo-location AI. Analyze this street photo carefully.

Look for: street signs, language/text, architecture style, vegetation, vehicles, road markings, landmarks, license plates, terrain, sky.

Reply ONLY with this exact JSON — no markdown, no explanation, just raw JSON:
{
  "type": "location_result",
  "message": "I found this location!",
  "location": "City, Country",
  "confidence": "High",
  "confidence_pct": 85,
  "lat": 28.6139,
  "lng": 77.2090,
  "country": "India",
  "city": "New Delhi",
  "region": "Delhi",
  "reasoning": "Explain the visual clues you used",
  "landmarks_nearby": ["Landmark 1", "Landmark 2"],
  "maps_url": "https://www.google.com/maps?q=28.6139,77.2090"
}`;

    const text = await callOpenRouter([
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
          { type: "text", text: prompt }
        ]
      }
    ]);

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json({ success: true, result: parsed });

  } catch (err) {
    console.error("Analyze error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message is required." });

    const reply = await callOpenRouter([
      {
        role: "system",
        content: "You are SpotAI, the world's most advanced geo-location AI assistant. You were created by SpotAI.com.  Your personality: - Friendly, helpful, and enthusiastic about geography - You love identifying locations from photos - You give interesting facts about locations - You are concise but informative - If someone asks who you are, say you are SpotAI  Your capabilities: - Identify exact locations from street photos - Give GPS coordinates and Google Maps links - Share interesting facts about locations - Help with travel and geography questions  Always respond in the same language the user is using (Hindi, English, etc.). Help users with location questions. Be concise and helpful."
      },
      {
        role: "user",
        content: message
      }
    ], "meta-llama/llama-3.2-3b-instruct:free");

    res.json({ success: true, reply });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.listen(PORT, () => console.log(`SpotAI running on port ${PORT}`));
