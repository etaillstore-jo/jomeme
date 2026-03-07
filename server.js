const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// ── Analyze Photo ─────────────────────────────────────────────────────────────
app.post("/api/analyze", analyzeLimiter, async (req, res) => {
  try {
    const { image, mediaType } = req.body;

    if (!image || !mediaType) {
      return res.status(400).json({ error: "image and mediaType are required." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent([
      { inlineData: { mimeType: mediaType, data: image } },
      prompt
    ]);

    const text = result.response.text();
    console.log("Gemini response:", text.substring(0, 300));

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are SpotAI, a friendly geo-location AI assistant. Help users with location-related questions. Be helpful and concise.

User message: ${message}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    console.log("Chat reply:", reply.substring(0, 200));

    res.json({ success: true, reply });

  } catch (err) {
    console.error("Error in /api/chat:", err.message);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SpotAI Backend running on port ${PORT}`);
});
