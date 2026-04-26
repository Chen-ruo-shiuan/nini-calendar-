import { useState } from "react";

const HOLIDAYS = [
  { id: "valentine", name: "情人節", emoji: "🌹", date: "2026-02-14", color: "#b85c7a", light: "#fff0f5" },
  { id: "newyear", name: "農曆新年", emoji: "🧧", date: "2026-02-17", color: "#c8402a", light: "#fff3f0" },
  { id: "anniversary", name: "週年慶 3/6", emoji: "🌿", date: "2026-03-06", color: "#4a7c59", light: "#f0f7f2" },
  { id: "mothers", name: "母親節", emoji: "🌸", date: "2026-05-10", color: "#8b6fad", light: "#f5f0ff" },
  { id: "dragonboat", name: "端午節", emoji: "🎋", date: "2026-06-20", color: "#3d7d62", light: "#f0faf4" },
  { id: "fathers", name: "父親節", emoji: "🌊", date: "2026-08-08", color: "#3d6080", light: "#f0f5ff" },
  { id: "midautumn", name: "中秋節", emoji: "🌕", date: "2026-09-25", color: "#a06b2a", light: "#fff8ee" },
  { id: "halloween", name: "萬聖節", emoji: "🕯️", date: "2026-10-31", color: "#6b3fa0", light: "#f7f0ff" },
  { id: "christmas", name: "聖誕節", emoji: "✨", date: "2026-12-25", color: "#2e6e46", light: "#f0faf4" },
];

const SYSTEM_PROMPT = `你是 NINIの皮膚療癒所 的品牌創意顧問。這是一間位於台中北屯的皮膚療癒工作室，品牌哲學是「護理走入生活，療癒成為日常」。
服務：靈魂美容（精細光彩、原液調理、泡光氧彗）和靈魂療癒（雨林強健頭療、森林癒撥筋、日式小顏骨氣）。
產品純露：桂花、橙花、洋甘菊、千葉玫瑰、葡萄柚、茶樹；季節限定：岩蘭草、沒藥、金盞花、永久花。
原液：B3菸鹼醯胺、B5泛醇、積雪草、神經醯胺、EGF、穀胱甘肽、藍銅胜肽、兒茶素、維他命C、金縷梅、膠原蛋白。
語氣有溫度、有人味、不制式。你必須只回傳純 JSON，不含任何 markdown 符號或說明文字。`;

function getDaysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text.trim()); } catch {}
  // Strip markdown fences
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  // Find first { ... } block
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch {}
  }
  throw new Error("無法解析 AI 回應為 JSON：" + text.slice(0, 200));
}

async function callClaude(userMessage) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    throw new Error(`API 錯誤 ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  if (!text) throw new Error("AI 回應內容為空");
  return extractJSON(text);
}

// ── Spinner ────────────────────────────────────────
function Spinner({ color, label }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <div style={{
        width: 36, height: 36, margin: "0 auto 12px",
        border: `3px solid ${color}22`,
        borderTop: `3px solid ${color}`,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }}/>
      <div style={{ fontSize: 12.5, color: "#998b80", fontFamily: "'Noto Sans TC', sans-serif" }}>{label}</div>
    </div>
  );
}

// ── Error Banner ───────────────────────────────────
function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{
      background: "#fff3f3", border: "1.5px solid #f0c0c0",
      borderRadius: 12, padding: "14px 18px", marginTop: 16,
      fontFamily: "'Noto Sans TC', sans-serif",
    }}>
      <div style={{ fontSize: 13, color: "#b04040", marginBottom: 8 }}>⚠ 生成失敗：{msg}</div>
      <button onClick={onRetry} style={{
        background: "#b04040", color: "#fff", border: "none",
        borderRadius: 20, padding: "6px 18px",
        fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif"
      }}>重試</button>
    </div>
  );
}

// ── Tab Panel ──────────────────────────────────────
function PlanDetail({ plan, color, light }) {
  const [tab, setTab] = useState("props");
  const tabs = [
    { id: "props", label: "🧰 道具清單" },
    { id: "copy", label: "✍️ 宣傳文案" },
    { id: "ig_post", label: "📸 IG 貼文" },
    { id: "ig_story", label: "⚡ IG 限動" },
  ];
  const content = {
    props: { title: "硬體道具 & 佈置清單", body: Array.isArray(plan.props)
      ? plan.props.map((p, i) => <div key={i} style={{ display:"flex", gap:8, marginBottom:7 }}><span style={{ color, minWidth:16 }}>▸</span><span>{p}</span></div>)
      : <span>{plan.props}</span>
    },
    copy: { title: "主視覺宣傳文案", body: <span style={{ whiteSpace:"pre-wrap" }}>{plan.copy}</span> },
    ig_post: { title: "IG 貼文（可直接複製）", body: <span style={{ whiteSpace:"pre-wrap" }}>{plan.ig_post}</span> },
    ig_story: { title: "IG 限動腳本", body: <span style={{ whiteSpace:"pre-wrap" }}>{plan.ig_story}</span> },
  };
  const cur = content[tab];

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:14 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 15px", borderRadius: 20, border: "none",
            background: tab === t.id ? color : "#ede8e0",
            color: tab === t.id ? "#fff" : "#6b6058",
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{
        background: tab === "props" ? light : "#faf9f7",
        border: `1.5px solid ${color}28`,
        borderRadius: 16, padding: "18px 20px",
        fontFamily: "'Noto Sans TC', sans-serif",
        fontSize: 13.5, color: "#3a3530", lineHeight: 1.85,
        minHeight: 120, animation: "fadeIn 0.2s ease"
      }}>
        <div style={{ fontWeight: 700, color, marginBottom: 10, fontFamily: "'Noto Serif TC', serif", fontSize: 13 }}>
          {cur.title}
        </div>
        {cur.body}
      </div>
    </div>
  );
}

// ── Holiday Modal ──────────────────────────────────
function HolidayModal({ holiday, onClose }) {
  const [step, setStep] = useState("idle");
  // idle | loading_ideas | ideas | loading_plan | plan | error_ideas | error_plan
  const [activities, setActivities] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [plan, setPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const { color, light } = holiday;

  async function generateActivities() {
    setStep("loading_ideas");
    setErrorMsg("");
    try {
      const result = await callClaude(
        `針對「${holiday.name}」節日，為 NINIの皮膚療癒所 生成 3 個創意活動方案。
每個方案要符合品牌風格（療癒、自然、有質感），可結合服務或產品。
只回傳這個 JSON 格式，不要其他文字：
{"activities":[{"title":"方案名稱","description":"2-3句活動概念說明"},{"title":"方案名稱","description":"2-3句"},{"title":"方案名稱","description":"2-3句"}]}`
      );
      if (!result.activities || !Array.isArray(result.activities)) throw new Error("回應格式不符");
      setActivities(result.activities);
      setStep("ideas");
    } catch (e) {
      setErrorMsg(e.message);
      setStep("error_ideas");
    }
  }

  async function generatePlan(idx) {
    setSelectedIdx(idx);
    setStep("loading_plan");
    setErrorMsg("");
    const chosen = activities[idx];
    try {
      const result = await callClaude(
        `為「${holiday.name}」節日活動「${chosen.title}」制定執行計劃。活動說明：${chosen.description}
重要：請回傳精簡 JSON，每個欄位控制字數，不要其他文字：
{"props":["道具1","道具2","道具3","道具4","道具5","道具6"],"copy":"2句宣傳文案","ig_post":"caption約80字加hashtag","ig_story":"第1幕：說明\n第2幕：說明\n第3幕：說明\n第4幕：說明"}`
      );
      if (!result.props || !result.copy) throw new Error("回應格式不符");
      setPlan(result);
      setStep("plan");
    } catch (e) {
      setErrorMsg(e.message);
      setStep("error_plan");
    }
  }

  function reset() {
    setStep("idle"); setActivities([]); setSelectedIdx(null); setPlan(null); setErrorMsg("");
  }

  const days = getDaysUntil(holiday.date);

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"rgba(20,14,8,0.5)",
      backdropFilter:"blur(5px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:100, padding:16,
      animation:"fadeIn 0.2s ease"
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fffcf8", borderRadius:24,
        width:"100%", maxWidth:560, maxHeight:"88vh", overflowY:"auto",
        padding:"28px 28px 32px",
        boxShadow:"0 24px 60px rgba(0,0,0,0.2)",
        animation:"slideUp 0.3s cubic-bezier(.22,1,.36,1)"
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:30, marginBottom:4 }}>{holiday.emoji}</div>
            <div style={{ fontSize:20, fontWeight:900, fontFamily:"'Noto Serif TC', serif", color:"#2a201a" }}>
              {holiday.name}
            </div>
            <div style={{ fontSize:12.5, color:"#998b80", marginTop:3, fontFamily:"'Noto Sans TC', sans-serif" }}>
              {new Date(holiday.date).toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric"})}
              {days > 0 && `　還有 ${days} 天`}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#bbb", alignSelf:"flex-start" }}>✕</button>
        </div>

        {/* ─ Idle ─ */}
        {step === "idle" && (
          <div style={{ textAlign:"center", padding:"8px 0" }}>
            <div style={{
              background:light, borderRadius:14, padding:"16px 20px",
              marginBottom:20, fontFamily:"'Noto Sans TC', sans-serif",
              fontSize:13.5, color:"#5a4f48", lineHeight:1.8
            }}>
              AI 會根據 NINI 品牌風格，為 <strong>{holiday.name}</strong><br/>
              提出 <strong>3 個活動方案</strong> 讓妳挑選。
            </div>
            <button onClick={generateActivities} style={{
              background:color, color:"#fff", border:"none",
              borderRadius:50, padding:"13px 36px",
              fontFamily:"'Noto Serif TC', serif",
              fontSize:15, fontWeight:700, cursor:"pointer",
              boxShadow:`0 4px 20px ${color}40`,
            }}>✦ 生成活動方案</button>
          </div>
        )}

        {/* ─ Loading ideas ─ */}
        {step === "loading_ideas" && <Spinner color={color} label="正在構思活動方案…" />}

        {/* ─ Error ideas ─ */}
        {step === "error_ideas" && <ErrorBanner msg={errorMsg} onRetry={generateActivities} />}

        {/* ─ Ideas (+ loading_plan + plan) ─ */}
        {(step === "ideas" || step === "loading_plan" || step === "plan" || step === "error_plan") && (
          <div>
            <div style={{ fontSize:13, color:"#998b80", marginBottom:12, fontFamily:"'Noto Serif TC', serif" }}>
              {step === "ideas" ? "選一個方案，AI 會幫妳生成完整資料 ↓" : `已選方案 ${selectedIdx !== null ? ["一","二","三"][selectedIdx] : ""}`}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {activities.map((a, i) => (
                <div
                  key={i}
                  onClick={() => step === "ideas" && generatePlan(i)}
                  style={{
                    border: selectedIdx === i ? `2px solid ${color}` : "2px solid #e8e0d8",
                    borderRadius:14, padding:"16px 18px",
                    cursor: step === "ideas" ? "pointer" : "default",
                    background: selectedIdx === i ? `${color}0e` : "#faf9f7",
                    transition:"all 0.18s", position:"relative"
                  }}
                >
                  {selectedIdx === i && (
                    <div style={{
                      position:"absolute", top:10, right:12,
                      background:color, borderRadius:20,
                      color:"#fff", fontSize:11, fontWeight:700,
                      padding:"2px 10px", fontFamily:"'Noto Sans TC', sans-serif"
                    }}>已選</div>
                  )}
                  <div style={{ fontSize:13, color, fontWeight:700, marginBottom:4, fontFamily:"'Noto Serif TC', serif" }}>
                    方案{["一","二","三"][i]}｜{a.title}
                  </div>
                  <div style={{ fontSize:13.5, color:"#4a4540", lineHeight:1.7, fontFamily:"'Noto Sans TC', sans-serif" }}>
                    {a.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─ Loading plan ─ */}
        {step === "loading_plan" && <Spinner color={color} label="正在生成執行計劃與文案…" />}

        {/* ─ Error plan ─ */}
        {step === "error_plan" && (
          <ErrorBanner msg={errorMsg} onRetry={() => generatePlan(selectedIdx)} />
        )}

        {/* ─ Plan detail ─ */}
        {step === "plan" && plan && <PlanDetail plan={plan} color={color} light={light} />}

        {/* Reset button */}
        {(step === "ideas" || step === "plan") && (
          <div style={{ marginTop:20, textAlign:"center" }}>
            <button onClick={reset} style={{
              background:"none", border:"1.5px solid #d8cfc5",
              borderRadius:50, padding:"8px 22px",
              fontFamily:"'Noto Sans TC', sans-serif",
              fontSize:12, color:"#8a7b70", cursor:"pointer"
            }}>↺ 重新生成方案</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Holiday Card ───────────────────────────────────
function HolidayCard({ holiday, onClick }) {
  const days = getDaysUntil(holiday.date);
  const planning = days > 0 && days <= 60;
  const past = days < 0;
  const { color, light } = holiday;

  return (
    <div
      onClick={!past ? onClick : undefined}
      style={{
        background: past ? "#f7f4f0" : "#fffcf8",
        border: planning ? `2px solid ${color}` : `1.5px solid ${past ? "#e5ddd5" : "#ebe3da"}`,
        borderRadius:18, padding:"16px 18px",
        cursor: past ? "default" : "pointer",
        opacity: past ? 0.5 : 1,
        transition:"box-shadow 0.2s, transform 0.15s",
        position:"relative", overflow:"hidden",
      }}
      onMouseEnter={e => { if (!past) { e.currentTarget.style.boxShadow = `0 4px 20px ${color}22`; e.currentTarget.style.transform = "translateY(-1px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      {planning && (
        <div style={{
          position:"absolute", top:0, right:0,
          background:color, color:"#fff",
          fontSize:10, fontWeight:700, padding:"4px 12px",
          borderRadius:"0 16px 0 10px",
          fontFamily:"'Noto Sans TC', sans-serif"
        }}>● 規劃視窗開啟</div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{
          width:46, height:46, flexShrink:0,
          background: past ? "#ede8e2" : light,
          borderRadius:13, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:21,
          border: planning ? `1.5px solid ${color}44` : "none"
        }}>{holiday.emoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Noto Serif TC', serif", fontWeight:900, fontSize:15, color: past ? "#aaa" : "#2a201a", marginBottom:3 }}>
            {holiday.name}
          </div>
          <div style={{ fontFamily:"'Noto Sans TC', sans-serif", fontSize:11.5, color:"#b0a59a" }}>
            {new Date(holiday.date).toLocaleDateString("zh-TW",{month:"long",day:"numeric"})}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          {past ? (
            <span style={{ fontSize:11, color:"#ccc", fontFamily:"'Noto Sans TC', sans-serif" }}>已過</span>
          ) : (
            <>
              <div style={{ fontSize:24, fontWeight:900, color: planning ? color : "#c8bfb5", fontFamily:"'Noto Serif TC', serif", lineHeight:1 }}>{days}</div>
              <div style={{ fontSize:10, color:"#b0a59a", fontFamily:"'Noto Sans TC', sans-serif" }}>天後</div>
            </>
          )}
        </div>
      </div>
      {!past && (
        <div style={{ marginTop:12, background:`${color}18`, borderRadius:8, height:3, overflow:"hidden" }}>
          <div style={{
            width:`${Math.max(4, Math.min(100, (1 - days/365)*100))}%`,
            height:"100%", background: planning ? color : "#d8cfca", borderRadius:8
          }}/>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState(null);
  const planCount = HOLIDAYS.filter(h => { const d = getDaysUntil(h.date); return d > 0 && d <= 60; }).length;
  const sorted = [...HOLIDAYS].sort((a,b) => {
    const da = getDaysUntil(a.date), db = getDaysUntil(b.date);
    if (da < 0 && db < 0) return db - da;
    if (da < 0) return 1; if (db < 0) return -1;
    return da - db;
  });

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(150deg,#faf6f0 0%,#f3e8da 100%)", paddingBottom:60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&family=Noto+Sans+TC:wght@400;500;700&display=swap');
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { transform:translateY(28px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        * { box-sizing:border-box; }
      `}</style>

      <div style={{ maxWidth:560, margin:"0 auto", padding:"40px 20px 0" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, letterSpacing:"0.14em", color:"#b0a090", fontFamily:"'Noto Serif TC', serif", marginBottom:6 }}>
              NINIの皮膚療癒所
            </div>
            <h1 style={{ margin:0, fontSize:26, fontFamily:"'Noto Serif TC', serif", fontWeight:900, color:"#2a201a", lineHeight:1.3 }}>
              節慶活動<br/>排程系統
            </h1>
          </div>
          {planCount > 0 && (
            <div style={{ background:"#4a7c59", color:"#fff", borderRadius:20, padding:"12px 18px", textAlign:"center", minWidth:68 }}>
              <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Noto Serif TC', serif", lineHeight:1 }}>{planCount}</div>
              <div style={{ fontSize:10, marginTop:2, opacity:0.85, lineHeight:1.4 }}>個節日<br/>待規劃</div>
            </div>
          )}
        </div>

        {/* Hint */}
        <div style={{
          background:"#fff9f3", border:"1.5px solid #ede3d5",
          borderRadius:14, padding:"12px 16px", marginBottom:22,
          fontSize:12.5, color:"#7a6e64", lineHeight:1.75,
          fontFamily:"'Noto Sans TC', sans-serif"
        }}>
          📅 節日前 <strong>60 天</strong>內標示「規劃視窗開啟」<br/>
          點擊卡片 → 選方案 → 生成道具清單 + 文案 + IG 素材
        </div>

        {/* List */}
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          {sorted.map(h => <HolidayCard key={h.id} holiday={h} onClick={() => setActive(h)} />)}
        </div>

        <div style={{ textAlign:"center", marginTop:40, fontSize:11.5, color:"#c0b5a8", fontFamily:"'Noto Serif TC', serif", letterSpacing:"0.08em" }}>
          護理走入生活，療癒成為日常 🌿
        </div>
      </div>

      {active && <HolidayModal holiday={active} onClose={() => setActive(null)} />}
    </div>
  );
}
