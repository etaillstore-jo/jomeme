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

// ── Groq API call with auto fallback ─────────────────────────────────────────
async function callGroq(messages, isVision = false) {
  // Vision models (photo analysis)
  const visionModels = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.2-90b-vision-preview",
    "llama-3.2-11b-vision-preview",
  ];

  // Chat models (text only)
  const chatModels = [
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
  ];

  const models = isVision ? visionModels : chatModels;
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`Trying Groq model: ${model}`);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1000,
          temperature: 0.2,
        }),
      });

      const data = await res.json();

      if (data.error) {
        console.log(`Model ${model} failed:`, data.error.message);
        lastError = data.error.message;
        continue; // try next model
      }

      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        console.log(`Model ${model} returned empty`);
        continue;
      }

      console.log(`Success with Groq model: ${model}`);
      return text.trim();

    } catch (err) {
      console.log(`Model ${model} threw error:`, err.message);
      lastError = err.message;
      continue;
    }
  }

  throw new Error(lastError || "All Groq models failed. Please try again.");
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "SpotAI", timestamp: new Date().toISOString() });
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message is required." });

    const reply = await callGroq([
      {
        role: "system",
        content: `You are SpotAI, the world's most advanced AI geo-location assistant created by SpotAI.com.

Your personality:
- Friendly, helpful, and enthusiastic about geography and travel
- You love helping people identify locations from photos
- You give interesting facts about locations when relevant
- You are concise but informative
- If asked who you are, say you are SpotAI, an AI geo-location assistant

Your capabilities:
- Identify exact locations from street photos
- Give GPS coordinates and Google Maps links
- Share interesting facts about cities and locations
- Help with travel and geography questions

Always respond in the same language the user writes in (Hindi, English, etc).`,
      },
      { role: "user", content: message },
    ], false);

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
    if (!image || !mediaType) {
      return res.status(400).json({ error: "image and mediaType are required." });
    }

    const prompt = `You are SpotAI, an expert geo-location AI. Analyze this street photo very carefully.

Look for: street signs, text/language, architecture style, vegetation type, vehicles, road markings, landmarks, license plates, terrain, sky, clothing styles.

Reply ONLY with this exact JSON — no markdown, no backticks, no explanation, just raw JSON:
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
  "reasoning": "Explain clearly what visual clues you used to identify this location",
  "landmarks_nearby": ["Landmark 1", "Landmark 2"],
  "maps_url": "https://www.google.com/maps?q=28.6139,77.2090"
}`;

    const text = await callGroq([
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
          { type: "text", text: prompt },
        ],
      },
    ], true);

    // Clean and parse JSON
    let clean = text.replace(/```json|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse location data.");
    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ success: true, result: parsed });

  } catch (err) {
    console.error("Analyze error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.listen(PORT, () => console.log(`SpotAI running on port ${PORT}`));
