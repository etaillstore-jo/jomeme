const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const analyzeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { error: "Daily free limit reached (5 photos/day). Upgrade to Pro!" },
});

app.use(generalLimiter);

// ── Gemini API call ───────────────────────────────────────────────────────────
async function askGemini(parts) {
  const key = process.env.GEMINI_API_KEY;
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  console.log("Status:", resp.status);
  console.log("Response keys:", Object.keys(data));

  if (data.error) {
    console.error("Gemini error:", JSON.stringify(data.error));
    throw new Error(data.error.message || "Gemini API error");
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("Full response:", JSON.stringify(data).substring(0, 500));
    throw new Error("Empty response from Gemini");
  }

  return text.trim();
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "SpotAI", timestamp: new Date().toISOString() });
});
app.get("/api/listmodels", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const d = await r.json();
  res.json(d);
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const reply = await askGemini([{
      text: `You are SpotAI, a friendly geo-location AI assistant. Answer helpfully.\n\nUser: ${message}`
    }]);

    res.json({ success: true, reply });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Analyze Photo ─────────────────────────────────────────────────────────────
app.post("/api/analyze", analyzeLimiter, async (req, res) => {
  try {
    const { image, mediaType } = req.body;
    if (!image || !mediaType) return res.status(400).json({ error: "image and mediaType required" });

    const prompt = `You are SpotAI. Analyze this photo and identify the location. Reply ONLY in this JSON format, no markdown:
{
  "type": "location_result",
  "message": "Found the location!",
  "location": "City, Country",
  "confidence": "High",
  "confidence_pct": 85,
  "lat": 28.6139,
  "lng": 77.2090,
  "country": "India",
  "city": "New Delhi",
  "region": "Delhi",
  "reasoning": "Visual clues explanation",
  "landmarks_nearby": ["Landmark 1"],
  "maps_url": "https://www.google.com/maps?q=28.6139,77.2090"
}`;

    const text = await askGemini([
      { inline_data: { mime_type: mediaType, data: image } },
      { text: prompt }
    ]);

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json({ success: true, result: parsed });

  } catch (err) {
    console.error("Analyze error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.listen(PORT, () => console.log(`SpotAI running on port ${PORT}`));
