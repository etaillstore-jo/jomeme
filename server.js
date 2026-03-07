const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const analyzeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { error: "Daily free limit reached (5 photos/day). Upgrade to Pro!" },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please wait." },
});

app.use(generalLimiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "SpotAI Backend", timestamp: new Date().toISOString() });
});

// ── Helper: Call Gemini ───────────────────────────────────────────────────────
async function callGemini(parts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
    })
  });

  const data = await res.json();
  
  // Log full response for debugging
  console.log("Gemini raw response:", JSON.stringify(data).substring(0, 800));

  // Extract text from response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    console.error("No text in Gemini response:", JSON.stringify(data));
    throw new Error("Empty response from Gemini");
  }

  return text.trim();
}

// ── Analyze Photo ─────────────────────────────────────────────────────────────
app.post("/api/analyze", analyzeLimiter, async (req, res) => {
  try {
    const { image, mediaType } = req.body;

    if (!image || !mediaType) {
      return res.status(400).json({ error: "image and mediaType are required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "API key missing." });
    }

    const prompt = `You are SpotAI, an expert geo-location AI. Analyze this street photo and identify the exact location.

Look for: street signs, language, text, architecture, vegetation, vehicles, road markings, landmarks, license plates, sky, terrain.

Respond ONLY in this exact JSON format — no markdown, no extra text, just pure JSON:
{
  "type": "location_result",
  "message": "One friendly sentence about what you found",
  "location": "Full location name",
  "confidence": "High",
  "confidence_pct": 85,
  "lat": 40.7128,
  "lng": -74.0060,
  "country": "United States",
  "city": "New York",
  "region": "New York State",
  "reasoning": "2-3 sentences explaining visual clues",
  "landmarks_nearby": ["Landmark 1", "Landmark 2"],
  "maps_url": "https://www.google.com/maps?q=40.7128,-74.0060"
}`;

    const text = await callGemini([
      { inline_data: { mime_type: mediaType, data: image } },
      { text: prompt }
    ]);

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.json({ success: true, result: parsed });

  } catch (err) {
    console.error("Error in /api/analyze:", err.message);
    res.status(500).json({ error: "Could not analyze image. Please try again." });
  }
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "API key missing." });
    }

    const systemPrompt = `You are SpotAI, a friendly geo-location AI assistant. Help users with location questions. Be helpful and concise.\n\nUser: ${message}`;

    const reply = await callGemini([{ text: systemPrompt }]);

    res.json({ success: true, reply });

  } catch (err) {
    console.error("Error in /api/chat:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SpotAI Backend running on port ${PORT}`);
});
