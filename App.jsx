import { useState, useRef, useEffect } from "react";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const COINS = [
  { symbol: "BTC", name: "Bitcoin", emoji: "₿" },
  { symbol: "ETH", name: "Ethereum", emoji: "Ξ" },
  { symbol: "SOL", name: "Solana", emoji: "◎" },
  { symbol: "HYPE", name: "Hyperliquid", emoji: "⚡" },
];

const SYSTEM_PROMPT = `You are a professional crypto perpetual futures trading analyst specializing in BTC, ETH, SOL, and HYPE (Hyperliquid). Your job is to analyze a given cryptocurrency and produce a structured trade plan for perpetual futures trading.

When the user gives you a coin, respond ONLY with a valid JSON object — no markdown, no backticks, no preamble. Use this exact structure:

{
  "coin": "BTC",
  "price": 65000,
  "signal": "LONG",
  "confidence": 78,
  "reasoning": "...",
  "leverage": 10,
  "entry": 65000,
  "stopLoss": 63050,
  "takeProfit1": 67500,
  "takeProfit2": 70000,
  "takeProfit3": 73000,
  "riskRewardRatio": "2.5:1",
  "positionSizeNote": "...",
  "marketContext": "...",
  "keyLevels": {
    "support": [63000, 60000],
    "resistance": [67500, 70000]
  },
  "riskWarning": "..."
}

Rules:
- signal must be "LONG", "SHORT", or "NEUTRAL"
- confidence is 0-100
- leverage should be 2-25x (be conservative, HYPE is very volatile so max 5x)
- stopLoss: for LONG, below entry; for SHORT, above entry
- takeProfit1/2/3: for LONG, above entry; for SHORT, below entry
- Use realistic current market prices
- riskRewardRatio: ratio of potential gain to potential loss
- positionSizeNote: brief advice on position sizing (e.g. "Risk no more than 1-2% of account")
- marketContext: 2-3 sentences on current market conditions for this asset
- riskWarning: a brief specific risk for this trade
- reasoning: 3-4 sentences explaining your signal

Always respond with ONLY the JSON object.`;

const formatCurrency = (n) =>
  n >= 1000
    ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : `$${n.toFixed(4)}`;

const pct = (entry, target) => (((target - entry) / entry) * 100).toFixed(2);

// Purple theme colors
const C = {
  bg: "#09070f",
  bg2: "#0e0b18",
  bg3: "#130f20",
  border: "#2a1f45",
  borderBright: "#4a3a70",
  purple: "#b06aff",
  purpleDim: "#7a3fcc",
  purpleGlow: "rgba(176,106,255,0.15)",
  purpleFaint: "rgba(176,106,255,0.06)",
  text: "#d4c8f0",
  textDim: "#7a6a9a",
  textFaint: "#3a2a5a",
  long: "#00e5a0",
  longGlow: "rgba(0,229,160,0.15)",
  short: "#ff4477",
  shortGlow: "rgba(255,68,119,0.15)",
  neutral: "#f5c518",
};

export default function PerpTradeAgent() {
  const [activeCoin, setActiveCoin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trade, setTrade] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const analyze = async (symbol) => {
    setActiveCoin(symbol);
    setLoading(true);
    setError("");
    setTrade(null);

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "PerpAI Trading Agent",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Analyze ${symbol} for a perp trade. Give me entry, leverage, stop loss, and take profit levels.` }
          ],
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setTrade(parsed);
      setHistory((h) => [{ coin: parsed.coin, signal: parsed.signal, time: new Date().toLocaleTimeString() }, ...h.slice(0, 3)]);
    } catch (e) {
      setError("Analysis failed. Check your API key or try again.");
    } finally {
      setLoading(false);
    }
  };

  const sigColor = trade?.signal === "LONG" ? C.long : trade?.signal === "SHORT" ? C.short : C.neutral;
  const sigGlow = trade?.signal === "LONG" ? C.longGlow : trade?.signal === "SHORT" ? C.shortGlow : "rgba(245,197,24,0.12)";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono', 'Courier New', monospace", padding: "24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus { outline: none; }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.35} }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .coin-btn { transition: all 0.15s ease; }
        .coin-btn:hover { transform: translateY(-2px); }
        .coin-btn.active { border-color: #b06aff !important; background: rgba(176,106,255,0.12) !important; }
        .bar-fill { transition: width 0.9s cubic-bezier(0.4,0,0.2,1); }
        .glow-long { text-shadow: 0 0 20px rgba(0,229,160,0.5); }
        .glow-short { text-shadow: 0 0 20px rgba(255,68,119,0.5); }
        .glow-purple { text-shadow: 0 0 20px rgba(176,106,255,0.6); }
      `}</style>

      <div style={{ maxWidth: 840, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.purple, boxShadow: `0 0 10px ${C.purple}` }} className="pulse" />
            <span style={{ fontSize: 10, letterSpacing: 4, color: C.purpleDim, textTransform: "uppercase" }}>Perpetual Futures Signal Engine</span>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: "0 0 2px", letterSpacing: -1 }}>
            <span style={{ color: "#e8e0ff" }}>PERP</span><span style={{ color: C.purple }} className="glow-purple">AI</span>
          </h1>
          <p style={{ fontSize: 11, color: C.textFaint, margin: 0, letterSpacing: 2 }}>SELECT A MARKET TO ANALYZE</p>
        </div>

        {/* Coin Selector — 4 big buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
          {COINS.map((c) => (
            <button
              key={c.symbol}
              onClick={() => analyze(c.symbol)}
              disabled={loading}
              className={`coin-btn ${activeCoin === c.symbol ? "active" : ""}`}
              style={{
                background: activeCoin === c.symbol ? "rgba(176,106,255,0.12)" : C.bg2,
                border: `1px solid ${activeCoin === c.symbol ? C.purple : C.border}`,
                borderRadius: 8,
                padding: "18px 8px",
                cursor: loading ? "not-allowed" : "pointer",
                textAlign: "center",
                color: activeCoin === c.symbol ? C.purple : C.textDim,
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{c.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{c.symbol}</div>
              <div style={{ fontSize: 9, letterSpacing: 1, marginTop: 2, color: activeCoin === c.symbol ? C.purpleDim : C.textFaint }}>{c.name.toUpperCase()}</div>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 28, textAlign: "center", background: C.purpleFaint, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: C.purpleDim }} className="pulse">
              SCANNING {activeCoin} MARKET DATA...
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
              {["PRICE ACTION", "VOLUME", "MOMENTUM", "KEY LEVELS"].map((s, i) => (
                <span key={i} style={{ fontSize: 8, letterSpacing: 1, color: C.textFaint, border: `1px solid ${C.textFaint}`, padding: "2px 8px", borderRadius: 2 }} className="pulse">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ border: `1px solid ${C.short}`, borderRadius: 6, padding: 12, color: C.short, fontSize: 11, letterSpacing: 1, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {/* Trade Result */}
        {trade && !loading && (
          <div className="fade-in">

            {/* Signal Banner */}
            <div style={{ border: `1px solid ${sigColor}`, borderRadius: 8, padding: "22px 24px", background: sigGlow, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 4, color: C.textDim, marginBottom: 6 }}>SIGNAL</div>
                  <div style={{ fontSize: 44, fontWeight: 700, color: sigColor, lineHeight: 1, letterSpacing: -1 }}
                    className={trade.signal === "LONG" ? "glow-long" : trade.signal === "SHORT" ? "glow-short" : ""}>
                    {trade.signal}
                  </div>
                  <div style={{ fontSize: 12, color: C.textDim, marginTop: 6, letterSpacing: 1 }}>{trade.coin}USDT PERP</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 6 }}>CONFIDENCE</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: trade.confidence >= 70 ? sigColor : C.neutral }}>{trade.confidence}%</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>R:R RATIO {trade.riskRewardRatio}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, height: 3, background: C.bg3, borderRadius: 2 }}>
                <div className="bar-fill" style={{ height: "100%", width: `${trade.confidence}%`, background: sigColor, borderRadius: 2 }} />
              </div>
            </div>

            {/* Trade Math Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <Cell label="ENTRY PRICE" value={formatCurrency(trade.entry)} color="#e8e0ff" />
              <Cell label="LEVERAGE" value={`${trade.leverage}x`} color={C.purple} note="recommended max" />
              <Cell label="STOP LOSS" value={formatCurrency(trade.stopLoss)} color={C.short}
                note={`${Math.abs(pct(trade.entry, trade.stopLoss))}% from entry`} />
              <Cell label="TAKE PROFIT 1" value={formatCurrency(trade.takeProfit1)} color={C.long}
                note={`+${Math.abs(pct(trade.entry, trade.takeProfit1))}% → ${trade.leverage}x = +${(Math.abs(pct(trade.entry, trade.takeProfit1)) * trade.leverage).toFixed(1)}%`} />
              <Cell label="TAKE PROFIT 2" value={formatCurrency(trade.takeProfit2)} color="#00c488"
                note={`+${Math.abs(pct(trade.entry, trade.takeProfit2))}% → ${trade.leverage}x = +${(Math.abs(pct(trade.entry, trade.takeProfit2)) * trade.leverage).toFixed(1)}%`} />
              <Cell label="TAKE PROFIT 3" value={formatCurrency(trade.takeProfit3)} color="#009a6a"
                note={`+${Math.abs(pct(trade.entry, trade.takeProfit3))}% → ${trade.leverage}x = +${(Math.abs(pct(trade.entry, trade.takeProfit3)) * trade.leverage).toFixed(1)}%`} />
            </div>

            {/* Key Levels */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px", marginBottom: 8, background: C.bg2 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 12 }}>KEY LEVELS</div>
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, color: C.long, letterSpacing: 2, marginBottom: 6 }}>SUPPORT</div>
                  {trade.keyLevels?.support?.map((l, i) => <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 2 }}>{formatCurrency(l)}</div>)}
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.short, letterSpacing: 2, marginBottom: 6 }}>RESISTANCE</div>
                  {trade.keyLevels?.resistance?.map((l, i) => <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 2 }}>{formatCurrency(l)}</div>)}
                </div>
              </div>
            </div>

            {/* Analysis blocks */}
            {[
              { label: "ANALYSIS", key: "reasoning" },
              { label: "MARKET CONTEXT", key: "marketContext" },
              { label: "POSITION SIZING", key: "positionSizeNote" },
            ].map(({ label, key }) => (
              <div key={key} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px", marginBottom: 8, background: C.bg2 }}>
                <div style={{ fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 8 }}>{label}</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: "#9a8abf" }}>{trade[key]}</p>
              </div>
            ))}

            {/* Risk Warning */}
            <div style={{ border: `1px solid ${C.short}`, borderRadius: 8, padding: "14px 18px", background: "rgba(255,68,119,0.05)", marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: C.short, marginBottom: 6 }}>⚠ RISK WARNING</div>
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.8, color: "#aa5a70" }}>{trade.riskWarning}</p>
            </div>

            <div style={{ fontSize: 9, color: C.textFaint, lineHeight: 1.8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              DISCLAIMER: AI-generated analysis for educational purposes only. Not financial advice. Crypto perpetual trading with leverage carries extreme risk of total loss. Never trade more than you can afford to lose. Always do your own research.
            </div>
          </div>
        )}

        {/* Recent history */}
        {history.length > 0 && !loading && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: C.textFaint, marginBottom: 8 }}>RECENT SCANS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {history.map((h, i) => (
                <button key={i} onClick={() => analyze(h.coin)}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 12px", color: C.textDim, fontSize: 9, fontFamily: "inherit", letterSpacing: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: h.signal === "LONG" ? C.long : h.signal === "SHORT" ? C.short : C.neutral, fontSize: 7 }}>▶</span>
                  {h.coin} · {h.signal} · <span style={{ color: C.textFaint }}>{h.time}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!trade && !loading && !error && (
          <div style={{ textAlign: "center", padding: "40px 0", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 28, opacity: 0.15, marginBottom: 10, color: C.purple }}>⬡</div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: C.textFaint }}>TAP A MARKET ABOVE TO GET YOUR TRADE PLAN</div>
          </div>
        )}

      </div>
    </div>
  );
}

function Cell({ label, value, color, note }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", background: C.bg2 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.text, letterSpacing: -0.5 }}>{value}</div>
      {note && <div style={{ fontSize: 9, color: C.textDim, marginTop: 5, letterSpacing: 0.3, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );
}
