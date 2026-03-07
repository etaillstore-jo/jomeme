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

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ── Groq Chat ─────────────────────────────────────────────────────────────────
async function callGroq(messages, model = "llama-3.1-8b-instant") {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.2 })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Groq error");
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response");
  return text.trim();
}

// ── Groq Vision ───────────────────────────────────────────────────────────────
async function callGroqVision(imageBase64, mediaType) {
  const prompt = `You are an elite geo-location AI trained like GeoSpy and GeoGuessr experts.

TASK: Identify the EXACT location of this photo with maximum precision.

ANALYZE these clues in order of importance:
1. TEXT & SIGNS: Any text, street names, shop names, license plates, billboards (what language/script?)
2. ARCHITECTURE: Building style, construction materials, roof type, window style, colors
3. VEGETATION: Tree types, plants, grass color, season indicators
4. VEHICLES: Car models, bus styles, bike types, driving side (left/right hand traffic)
5. INFRASTRUCTURE: Road type, lane markings, traffic signs, power lines, poles
6. PEOPLE: Clothing style, ethnicity clues
7. TERRAIN & SKY: Mountains, desert, coast, sky color, weather
8. UNIQUE LANDMARKS: Any recognizable structure, statue, tower, bridge

REASONING PROCESS:
- First eliminate continents, then narrow to country, then city, then neighborhood
- Be as specific as possible — give exact street/neighborhood if visible
- If you see Hindi/Devanagari text → India
- If you see Arabic text → Middle East/North Africa
- If you see Cyrillic → Russia/Eastern Europe
- If you see Chinese/Japanese/Korean → East Asia

OUTPUT: Reply with ONLY this raw JSON, no markdown, no backticks:
{
  "type": "location_result",
  "message": "Location identified!",
  "location": "Specific Area, City, Country",
  "confidence": "High",
  "confidence_pct": 87,
  "lat": 28.6139,
  "lng": 77.2090,
  "country": "India",
  "city": "New Delhi",
  "region": "Connaught Place",
  "street": "Janpath Road (if visible)",
  "reasoning": "Step by step: I spotted X which indicates Y country because Z...",
  "visual_clues": ["Clue 1", "Clue 2", "Clue 3"],
  "landmarks_nearby": ["Landmark 1", "Landmark 2"],
  "maps_url": "https://www.google.com/maps?q=28.6139,77.2090",
  "maps_satellite_url": "https://www.google.com/maps/@28.6139,77.2090,15z/data=!3m1!1e3"
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
          { type: "text", text: prompt }
        ]
      }],
      max_tokens: 1200,
      temperature: 0.1
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Vision error");
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty vision response");
  return text.trim();
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "SpotAI", powered_by: "Groq ⚡" });
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const reply = await callGroq([
      {
        role: "system",
        content: `You are SpotAI, the world's most advanced AI geo-location assistant by SpotAI.com — similar to GeoSpy.

Personality: Friendly, smart, enthusiastic about geography and travel. Concise but informative.
- If asked who you are: "I am SpotAI, an AI geo-location assistant"
- Never mention Llama, Meta, or Groq
- Reply in same language as user (Hindi/English/etc)
- For location questions: give interesting facts about that place
- You can identify locations from photos, give coordinates, Maps links`
      },
      { role: "user", content: message }
    ]);

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

    const text = await callGroqVision(image, mediaType);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse location. Try a clearer photo.");

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ success: true, result: parsed });
  } catch (err) {
    console.error("Analyze error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.listen(PORT, () => console.log(`SpotAI ⚡ port ${PORT}`));
