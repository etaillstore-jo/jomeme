import { useState, useRef, useEffect } from "react";

// ✅ Apna backend URL — Vercel deploy hone ke baad wahan ka URL daalo
const BACKEND_URL = "http://localhost:3001";

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080c10; font-family: 'Space Grotesk', sans-serif; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,210,160,0.2); border-radius: 4px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
`;

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ chats, activeChatId, onSelectChat, onNewChat, collapsed, setCollapsed }) {
  return (
    <div style={{
      width: collapsed ? 64 : 260,
      minWidth: collapsed ? 64 : 260,
      height: "100vh",
      background: "#050810",
      borderRight: "1px solid rgba(0,210,160,0.08)",
      display: "flex", flexDirection: "column",
      transition: "width 0.3s cubic-bezier(.22,1,.36,1), min-width 0.3s cubic-bezier(.22,1,.36,1)",
      overflow: "hidden", position: "relative", zIndex: 10
    }}>
      {/* Logo row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between",
        padding: collapsed ? "20px 0" : "20px 16px",
        borderBottom: "1px solid rgba(0,210,160,0.07)"
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg,#00d4a0,#0080ff)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
            }}>📍</div>
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 16, color: "#e8fff8" }}>
              SpotAI
            </span>
          </div>
        )}
        {collapsed && <span style={{ fontSize: 18 }}>📍</span>}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(0,210,160,0.5)", fontSize: 16, padding: 4,
          display: collapsed ? "none" : "block"
        }}>◀</button>
      </div>

      {/* New Chat */}
      <div style={{ padding: collapsed ? "12px 8px" : "12px 12px" }}>
        <button onClick={onNewChat} style={{
          width: "100%", padding: collapsed ? "10px 0" : "10px 14px",
          borderRadius: 8, border: "1px dashed rgba(0,210,160,0.25)",
          background: "transparent", color: "#00d4a0",
          fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 13,
          cursor: "pointer", transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
          gap: 8
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,210,160,0.07)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 16 }}>+</span>
          {!collapsed && "New Chat"}
        </button>
      </div>

      {/* Chat list */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {chats.length === 0 && (
            <p style={{
              fontFamily: "'Space Grotesk'", fontSize: 12,
              color: "rgba(180,240,220,0.25)", textAlign: "center", padding: "20px 0"
            }}>No chats yet</p>
          )}
          {chats.map(chat => (
            <button key={chat.id} onClick={() => onSelectChat(chat.id)} style={{
              width: "100%", textAlign: "left", padding: "10px 12px",
              borderRadius: 8, border: "none",
              background: activeChatId === chat.id ? "rgba(0,210,160,0.09)" : "transparent",
              borderLeft: activeChatId === chat.id ? "2px solid #00d4a0" : "2px solid transparent",
              color: activeChatId === chat.id ? "#e8fff8" : "rgba(180,240,220,0.45)",
              fontFamily: "'Space Grotesk'", fontSize: 13,
              cursor: "pointer", marginBottom: 2,
              transition: "all 0.18s", display: "block",
              animation: "slideIn 0.3s ease both"
            }}
              onMouseEnter={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12 }}>
                  {chat.hasPhoto ? "📸" : "💬"}
                </span>
                <span style={{
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", flex: 1, fontSize: 13
                }}>{chat.title}</span>
              </div>
              <div style={{
                fontSize: 11, color: "rgba(180,240,220,0.25)", marginTop: 3, marginLeft: 20
              }}>{chat.time}</div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom profile */}
      {!collapsed && (
        <div style={{
          padding: "14px 16px",
          borderTop: "1px solid rgba(0,210,160,0.07)",
          display: "flex", alignItems: "center", gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#00d4a0,#0080ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: "#020c14", fontWeight: 700
          }}>U</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 600, color: "#e8fff8" }}>Free Plan</div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "rgba(0,210,160,0.5)" }}>5 photos/day</div>
          </div>
          <button style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "rgba(180,240,220,0.3)", cursor: "pointer", fontSize: 14
          }}>⚙</button>
        </div>
      )}

      {/* Collapsed expand button */}
      {collapsed && (
        <button onClick={() => setCollapsed(false)} style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,210,160,0.1)", border: "1px solid rgba(0,210,160,0.2)",
          borderRadius: 6, color: "#00d4a0", cursor: "pointer", padding: "6px 8px", fontSize: 12
        }}>▶</button>
      )}
    </div>
  );
}

// ── Location Result Card ──────────────────────────────────────────────────────
function LocationCard({ result }) {
  const confColor = result.confidence_pct >= 75 ? "#00d4a0" : result.confidence_pct >= 50 ? "#f0c040" : "#ff6060";
  return (
    <div style={{
      marginTop: 12, borderRadius: 14,
      border: "1px solid rgba(0,210,160,0.2)",
      background: "rgba(0,210,160,0.04)",
      overflow: "hidden", animation: "fadeUp 0.4s ease both"
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        background: "rgba(0,210,160,0.06)",
        borderBottom: "1px solid rgba(0,210,160,0.1)",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>📍</span>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 17, color: "#e8fff8" }}>
              {result.city || result.location}
            </div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: "rgba(180,240,220,0.45)", marginTop: 1 }}>
              {result.region && result.region + " · "}{result.country}
            </div>
          </div>
        </div>
        <div style={{
          padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: `${confColor}18`, border: `1px solid ${confColor}40`,
          color: confColor, fontFamily: "'Space Grotesk'"
        }}>{result.confidence_pct}% {result.confidence}</div>
      </div>

      {/* Coords + reasoning */}
      <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Coordinates box */}
        <div style={{
          padding: "12px 14px", borderRadius: 10,
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(0,210,160,0.12)",
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <div style={{ fontSize: 10, color: "rgba(0,210,160,0.5)", letterSpacing: 1, marginBottom: 6 }}>COORDINATES</div>
          <div style={{ fontSize: 13, color: "#00d4a0" }}>
            LAT <span style={{ color: "#e8fff8" }}>{result.lat?.toFixed(5)}</span>
          </div>
          <div style={{ fontSize: 13, color: "#00d4a0" }}>
            LNG <span style={{ color: "#e8fff8" }}>{result.lng?.toFixed(5)}</span>
          </div>
        </div>

        {/* Confidence bar */}
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, color: "rgba(180,240,220,0.35)", letterSpacing: 1, marginBottom: 8 }}>CONFIDENCE</div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginBottom: 6 }}>
            <div style={{
              height: "100%", borderRadius: 3, width: `${result.confidence_pct}%`,
              background: `linear-gradient(90deg, ${confColor}, ${confColor}88)`,
              boxShadow: `0 0 8px ${confColor}55`
            }} />
          </div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700, color: confColor }}>
            {result.confidence_pct}%
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div style={{ padding: "0 18px 16px" }}>
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          fontFamily: "'Space Grotesk'", fontSize: 13, lineHeight: 1.6,
          color: "rgba(180,240,220,0.5)"
        }}>
          💡 {result.reasoning}
        </div>
      </div>

      {/* Landmarks */}
      {result.landmarks_nearby?.length > 0 && (
        <div style={{ padding: "0 18px 16px" }}>
          <div style={{ fontSize: 10, color: "rgba(0,210,160,0.4)", letterSpacing: 1, marginBottom: 8 }}>NEARBY LANDMARKS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.landmarks_nearby.map(l => (
              <span key={l} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 12,
                background: "rgba(0,210,160,0.06)", border: "1px solid rgba(0,210,160,0.15)",
                color: "rgba(0,210,160,0.75)", fontFamily: "'Space Grotesk'"
              }}>📌 {l}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: "12px 18px",
        borderTop: "1px solid rgba(0,210,160,0.08)",
        display: "flex", gap: 8
      }}>
        <a href={result.maps_url} target="_blank" rel="noreferrer" style={{
          flex: 1, display: "block", textAlign: "center",
          padding: "9px", borderRadius: 8,
          background: "linear-gradient(135deg,#00d4a0,#0088ee)",
          color: "#020c14", fontFamily: "'Space Grotesk'", fontWeight: 700,
          fontSize: 13, textDecoration: "none"
        }}>🗺 Open Google Maps</a>
        <button
          onClick={() => navigator.clipboard?.writeText(`${result.lat},${result.lng}`)}
          style={{
            padding: "9px 16px", borderRadius: 8, fontSize: 13,
            border: "1px solid rgba(0,210,160,0.2)",
            background: "transparent", color: "rgba(0,210,160,0.7)",
            fontFamily: "'Space Grotesk'", fontWeight: 600, cursor: "pointer"
          }}>Copy Coords</button>
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", gap: 12, padding: "6px 0",
      flexDirection: isUser ? "row-reverse" : "row",
      animation: "fadeUp 0.3s ease both"
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: isUser
          ? "linear-gradient(135deg,#0080ff,#00a0ff)"
          : "linear-gradient(135deg,#00d4a0,#00a080)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, marginTop: 2,
        boxShadow: isUser ? "0 0 12px rgba(0,128,255,0.25)" : "0 0 12px rgba(0,210,160,0.25)"
      }}>
        {isUser ? "👤" : "📍"}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "72%", minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontFamily: "'Space Grotesk'", fontWeight: 600,
          color: isUser ? "rgba(100,180,255,0.6)" : "rgba(0,210,160,0.6)",
          marginBottom: 5, textAlign: isUser ? "right" : "left"
        }}>{isUser ? "You" : "SpotAI"}</div>

        {/* Image if present */}
        {msg.image && (
          <div style={{ marginBottom: 8 }}>
            <img src={msg.image} alt="uploaded" style={{
              maxWidth: 260, maxHeight: 200, borderRadius: 10, objectFit: "cover",
              border: "1px solid rgba(0,210,160,0.15)"
            }} />
          </div>
        )}

        {/* Text */}
        {msg.text && (
          <div style={{
            padding: "11px 15px", borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
            background: isUser ? "rgba(0,128,255,0.12)" : "rgba(0,210,160,0.07)",
            border: isUser ? "1px solid rgba(0,128,255,0.18)" : "1px solid rgba(0,210,160,0.12)",
            fontFamily: "'Space Grotesk'", fontSize: 14, lineHeight: 1.65,
            color: "#d8f4ec"
          }}>{msg.text}</div>
        )}

        {/* Location card */}
        {msg.result && <LocationCard result={msg.result} />}
      </div>
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", animation: "fadeUp 0.3s ease" }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "linear-gradient(135deg,#00d4a0,#00a080)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15
      }}>📍</div>
      <div style={{ paddingTop: 6 }}>
        <div style={{ fontSize: 11, fontFamily: "'Space Grotesk'", fontWeight: 600, color: "rgba(0,210,160,0.6)", marginBottom: 8 }}>SpotAI</div>
        <div style={{
          display: "flex", gap: 5, padding: "12px 16px", borderRadius: "4px 14px 14px 14px",
          background: "rgba(0,210,160,0.07)", border: "1px solid rgba(0,210,160,0.12)"
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#00d4a0",
              animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  const suggestions = [
    { icon: "🏙️", text: "Upload a street photo to identify its location" },
    { icon: "🌆", text: "Find coordinates from any city scene" },
    { icon: "🗺️", text: "Get a Google Maps link from a photo" },
    { icon: "🏛️", text: "Identify landmarks in an image" }
  ];
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 40,
      textAlign: "center"
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "linear-gradient(135deg,#00d4a0,#0080ff)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 34, marginBottom: 24,
        boxShadow: "0 0 40px rgba(0,210,160,0.2)"
      }}>📍</div>
      <h2 style={{
        fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 24,
        color: "#e8fff8", marginBottom: 10, letterSpacing: "-0.5px"
      }}>Where was this taken?</h2>
      <p style={{
        fontFamily: "'Space Grotesk'", fontSize: 15,
        color: "rgba(180,240,220,0.4)", maxWidth: 380, lineHeight: 1.65, marginBottom: 36
      }}>
        Upload any street photo and I'll instantly identify the location, coordinates, and nearby landmarks.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 460 }}>
        {suggestions.map(s => (
          <div key={s.text} style={{
            padding: "14px 16px", borderRadius: 10, textAlign: "left",
            border: "1px solid rgba(0,210,160,0.1)",
            background: "rgba(0,210,160,0.03)",
            display: "flex", alignItems: "flex-start", gap: 10
          }}>
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: "rgba(180,240,220,0.45)", lineHeight: 1.5 }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Input Bar ─────────────────────────────────────────────────────────────────
function InputBar({ onSend, onImageUpload, disabled }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const fileRef = useRef();
  const textRef = useRef();

  const handleFile = (file) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setImageData({ base64: e.target.result.split(",")[1], mediaType: file.type, dataUrl: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if (disabled || (!text.trim() && !imageData)) return;
    onSend(text.trim(), imageData);
    setText(""); setPreview(null); setImageData(null);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{
      padding: "16px 20px",
      borderTop: "1px solid rgba(0,210,160,0.08)",
      background: "rgba(5,8,16,0.95)",
      backdropFilter: "blur(12px)"
    }}>
      {/* Image preview strip */}
      {preview && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 10, padding: "8px 10px", borderRadius: 8,
          background: "rgba(0,210,160,0.05)", border: "1px solid rgba(0,210,160,0.12)"
        }}>
          <img src={preview} alt="preview" style={{
            width: 48, height: 48, borderRadius: 6, objectFit: "cover"
          }} />
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: "rgba(0,210,160,0.7)", flex: 1 }}>
            📸 Photo ready to analyze
          </span>
          <button onClick={() => { setPreview(null); setImageData(null); }} style={{
            background: "none", border: "none", color: "rgba(180,240,220,0.35)",
            cursor: "pointer", fontSize: 16
          }}>✕</button>
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 8,
        padding: "6px 6px 6px 14px", borderRadius: 14,
        border: "1px solid rgba(0,210,160,0.2)",
        background: "rgba(0,210,160,0.04)",
        transition: "border-color 0.2s"
      }}>
        {/* Attach photo */}
        <button onClick={() => fileRef.current.click()} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(0,210,160,0.5)", fontSize: 20, padding: "6px 4px",
          transition: "color 0.2s", flexShrink: 0
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#00d4a0"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(0,210,160,0.5)"}
          title="Upload photo"
        >📎</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])} />

        {/* Text */}
        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Upload a photo or ask about a location…"
          rows={1}
          style={{
            flex: 1, background: "none", border: "none", outline: "none", resize: "none",
            fontFamily: "'Space Grotesk'", fontSize: 14, color: "#d8f4ec",
            lineHeight: 1.5, paddingTop: 6, paddingBottom: 6,
            maxHeight: 120, overflowY: "auto"
          }}
          onInput={e => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />

        {/* Send */}
        <button onClick={handleSend} disabled={disabled || (!text.trim() && !imageData)} style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          border: "none", cursor: disabled || (!text.trim() && !imageData) ? "not-allowed" : "pointer",
          background: disabled || (!text.trim() && !imageData)
            ? "rgba(0,210,160,0.1)"
            : "linear-gradient(135deg,#00d4a0,#0088ee)",
          color: disabled || (!text.trim() && !imageData) ? "rgba(0,210,160,0.3)" : "#020c14",
          fontSize: 16, transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>↑</button>
      </div>
      <p style={{
        fontFamily: "'Space Grotesk'", fontSize: 11,
        color: "rgba(180,240,220,0.2)", textAlign: "center", marginTop: 8
      }}>
        SpotAI may make mistakes. Always verify critical locations. · Free: 5 photos/day
      </p>
    </div>
  );
}

// ── Main Chat ─────────────────────────────────────────────────────────────────
function ChatArea({ messages, loading, onSend }) {
  const bottomRef = useRef();
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{
        padding: "0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(0,210,160,0.07)",
        background: "rgba(5,8,16,0.6)", backdropFilter: "blur(12px)",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#00d4a0",
            boxShadow: "0 0 8px #00d4a0", animation: "pulse 2s infinite"
          }} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, color: "#e8fff8" }}>
            SpotAI Chat
          </span>
          <span style={{
            padding: "2px 8px", borderRadius: 20, fontSize: 11,
            background: "rgba(0,210,160,0.08)", border: "1px solid rgba(0,210,160,0.15)",
            color: "rgba(0,210,160,0.7)", fontFamily: "'Space Grotesk'"
          }}>Beta</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["📤 Export", "🔗 Share"].map(btn => (
            <button key={btn} style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(180,240,220,0.4)",
              fontFamily: "'Space Grotesk'", cursor: "pointer"
            }}>{btn}</button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <InputBar onSend={onSend} disabled={loading} />
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
let chatCounter = 1;

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);

  const currentMessages = messages[activeChatId] || [];

  const createNewChat = () => {
    const id = `chat_${Date.now()}`;
    const newChat = {
      id, title: `New Chat ${chatCounter++}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      hasPhoto: false
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(id);
    setMessages(prev => ({ ...prev, [id]: [] }));
  };

  const handleSend = async (text, imageData) => {
    if (!activeChatId) {
      const id = `chat_${Date.now()}`;
      const newChat = {
        id, title: text || "Photo Analysis",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hasPhoto: !!imageData
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(id);
      setMessages(prev => ({ ...prev, [id]: [] }));
      await processMessage(id, [], text, imageData, newChat);
      return;
    }
    await processMessage(activeChatId, currentMessages, text, imageData);
  };

  const processMessage = async (chatId, prevMessages, text, imageData, chatMeta) => {
    // Add user message
    const userMsg = { role: "user", text, image: imageData?.dataUrl };
    const updatedMsgs = [...prevMessages, userMsg];
    setMessages(prev => ({ ...prev, [chatId]: updatedMsgs }));

    // Update chat title if first message
    if (prevMessages.length === 0) {
      setChats(prev => prev.map(c => c.id === chatId
        ? { ...c, title: text || "Photo Analysis", hasPhoto: !!imageData }
        : c
      ));
    }

    setLoading(true);

    try {
      // Build content
      const content = [];
      if (imageData) {
        content.push({ type: "image", source: { type: "base64", media_type: imageData.mediaType, data: imageData.base64 } });
      }

      const systemPrompt = imageData
        ? `You are SpotAI, an expert geo-location assistant. Analyze the image and identify the exact location.

Look for: street signs, text, language, architecture, vegetation, vehicles, landmarks, sky, terrain, license plates, road markings.

Always respond in this EXACT JSON format, no markdown, no extra text:
{
  "type": "location_result",
  "message": "A brief 1-sentence friendly message about what you found",
  "location": "Full location name",
  "confidence": "High / Medium / Low",
  "confidence_pct": 85,
  "lat": 40.7128,
  "lng": -74.0060,
  "country": "United States",
  "city": "New York",
  "region": "New York State",
  "reasoning": "2-3 sentences about visual clues",
  "landmarks_nearby": ["Landmark 1", "Landmark 2"],
  "maps_url": "https://www.google.com/maps?q=LAT,LNG"
}`
        : `You are SpotAI, a friendly geo-location AI assistant. Help users with location-related questions. Be concise and helpful. Respond in plain text (no JSON needed unless asked for coordinates).`;

      content.push({ type: "text", text: text || (imageData ? "Analyze this photo and tell me the location." : "Hello") });

      // ✅ API key safe hai — seedha backend ko call karo
      let aiMsg;
      if (imageData) {
        const response = await fetch(`${BACKEND_URL}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageData.base64,
            mediaType: imageData.mediaType,
            message: text || "Analyze this photo and identify the location."
          })
        });
        const data = await response.json();
        if (data.success && data.result) {
          aiMsg = { role: "assistant", text: data.result.message, result: data.result };
        } else {
          aiMsg = { role: "assistant", text: data.error || "Could not analyze image." };
        }
      } else {
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        aiMsg = { role: "assistant", text: data.reply || data.error || "Something went wrong." };
      }

      setMessages(prev => ({ ...prev, [chatId]: [...updatedMsgs, aiMsg] }));
    } catch (err) {
      setMessages(prev => ({
        ...prev,
        [chatId]: [...updatedMsgs, { role: "assistant", text: "⚠️ Something went wrong. Please try again with a clearer photo." }]
      }));
    }

    setLoading(false);
  };

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ display: "flex", height: "100vh", background: "#080c10", overflow: "hidden" }}>
        {/* Sidebar */}
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={(id) => setActiveChatId(id)}
          onNewChat={createNewChat}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Main chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {/* Subtle bg grid */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            backgroundImage: `
              linear-gradient(rgba(0,210,160,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,210,160,0.025) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px"
          }} />
          <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
            {activeChatId ? (
              <ChatArea
                messages={currentMessages}
                loading={loading}
                onSend={handleSend}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{
                  padding: "0 24px", height: 56, display: "flex", alignItems: "center",
                  borderBottom: "1px solid rgba(0,210,160,0.07)",
                  background: "rgba(5,8,16,0.6)", backdropFilter: "blur(12px)", flexShrink: 0
                }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, color: "rgba(180,240,220,0.4)" }}>
                    SpotAI — Geo-Location Intelligence
                  </span>
                </div>
                <EmptyState />
                <InputBar onSend={(text, img) => {
                  createNewChat();
                  setTimeout(() => handleSend(text, img), 50);
                }} disabled={loading} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
