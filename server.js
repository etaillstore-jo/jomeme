// updated
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

const allowedOrigins = [
  "http://localhost:3000",
  "https://spotai.com",
  "https://www.spotai.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors());

app.use(express.json({ limit: "10mb" }));

// Rate limiting — 5 photos/day free
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

// ── Analyze Photo — Gemini Vision ─────────────────────────────────────────────
app.post("/api/analyze", analyzeLimiter, async (req, res) => {
  try {
    const { image, mediaType } = req.body;

    if (!image || !mediaType) {
      return res.status(400).json({ error: "image and mediaType are required." });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(mediaType)) {
      return res.status(400).json({ error: "Invalid image type. Use JPG, PNG, or WEBP." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server config error — API key missing." });
    }

    const prompt = `You are SpotAI, an expert geo-location AI. Analyze this street photo carefully.

Look for clues: street signs, language, text, architecture style, vegetation, vehicles, road markings, landmarks, license plates, sky, terrain, billboards.

Respond ONLY in this exact JSON format — no extra text, no markdown:
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
  "reasoning": "2-3 sentences explaining which visual clues led to this location",
  "landmarks_nearby": ["Times Square", "Empire State Building"],
  "maps_url": "https://www.google.com/maps?q=40.7128,-74.0060"
}`;

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mediaType, data: image } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      console.error("Gemini error:", err);
      return res.status(502).json({ error: "AI service error. Please try again." });
    }

    const data = await geminiRes.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!raw) {
      return res.status(502).json({ error: "Empty response from AI. Try again." });
    }

    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.json({ success: true, result: parsed });

  } catch (err) {
    console.error("Error in /api/analyze:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── Text Chat ─────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "message is required." });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `You are SpotAI, a friendly geo-location AI assistant. Answer helpfully and concisely.\n\nUser: ${message}` }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      }
    );

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    res.json({ success: true, reply });

  } catch (err) {
    console.error("Error in /api/chat:", err.message);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║   SpotAI Backend Running! 🚀     ║
  ║   http://localhost:${PORT}          ║
  ║   Using: Google Gemini (Free)    ║
  ╚══════════════════════════════════╝
  `);
});
