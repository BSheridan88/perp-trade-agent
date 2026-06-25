import { useState, useEffect, useRef } from "react";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const COINS = [
  { symbol: "BTC", name: "Bitcoin", emoji: "₿", geckoId: "bitcoin", tvSymbol: "BINANCE:BTCUSDT" },
  { symbol: "ETH", name: "Ethereum", emoji: "Ξ", geckoId: "ethereum", tvSymbol: "BINANCE:ETHUSDT" },
  { symbol: "SOL", name: "Solana", emoji: "◎", geckoId: "solana", tvSymbol: "BINANCE:SOLUSDT" },
  { symbol: "HYPE", name: "Hyperliquid", emoji: "⚡", geckoId: "hyperliquid", tvSymbol: "HYPERLIQUID:HYPEUSDT" },
];

const C = {
  bg: "#09070f", bg2: "#0e0b18", bg3: "#130f20",
  border: "#2a1f45", purple: "#b06aff", purpleDim: "#7a3fcc",
  purpleFaint: "rgba(176,106,255,0.06)",
  text: "#d4c8f0", textDim: "#7a6a9a", textFaint: "#3a2a5a",
  long: "#00e5a0", longGlow: "rgba(0,229,160,0.15)",
  short: "#ff4477", shortGlow: "rgba(255,68,119,0.15)", neutral: "#f5c518",
};

const formatCurrency = (n) =>
  n >= 1000
    ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : `$${n.toFixed(4)}`;

const pct = (entry, target) => (((target - entry) / entry) * 100).toFixed(2);

async function fetchLivePrice(geckoId) {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`
  );
  const data = await res.json();
  return {
    price: data[geckoId].usd,
    change24h: data[geckoId].usd_24h_change?.toFixed(2),
  };
}

// TradingView chart with horizontal lines drawn via postMessage after load
function TradingViewChart({ tvSymbol, trade }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!tvSymbol || !containerRef.current) return;

    // Clear previous
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (!window.TradingView) return;
      widgetRef.current = new window.TradingView.widget({
        container_id: "tv_chart_container",
        symbol: tvSymbol,
        interval: "60",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0e0b18",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        backgroundColor: "#09070f",
        gridColor: "rgba(42,31,69,0.4)",
        width: "100%",
        height: 420,
        studies: [],
        // Draw price lines for SL, Entry, TP1/2/3
        overrides: {
          "paneProperties.background": "#09070f",
          "paneProperties.backgroundType": "solid",
          "scalesProperties.textColor": "#7a6a9a",
          "scalesProperties.lineColor": "#2a1f45",
        },
      });
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [tvSymbol]);

  // Price levels overlay drawn on top of iframe
  const levels = trade ? [
    { label: "SL", price: trade.stopLoss, color: C.short },
    { label: "ENTRY", price: trade.entry, color: "#e8e0ff" },
    { label: "TP1", price: trade.takeProfit1, color: C.long },
    { label: "TP2", price: trade.takeProfit2, color: "#00c488" },
    { label: "TP3", price: trade.takeProfit3, color: "#009a6a" },
  ] : [];

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 10, background: C.bg2 }}>
      {/* Level badges above chart */}
      {trade && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 9, letterSpacing: 3, color: C.textDim, marginRight: 4 }}>LEVELS</span>
          {levels.map((l) => (
            <span key={l.label} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1,
              color: l.color, border: `1px solid ${l.color}`,
              padding: "2px 8px", borderRadius: 3,
              background: `${l.color}11`,
            }}>
              {l.label} {formatCurrency(l.price)}
            </span>
          ))}
        </div>
      )}

      {/* TradingView widget */}
      <div id="tv_chart_container" ref={containerRef} style={{ width: "100%", height: 420 }} />

      {/* Visual price level lines overlaid - these are reference only since TradingView free doesn't allow programmatic lines */}
      {trade && (
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ fontSize: 9, color: C.textFaint, letterSpacing: 2, marginBottom: 8 }}>TRADE LEVELS REFERENCE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { label: "STOP LOSS", price: trade.stopLoss, color: C.short, pctVal: `${Math.abs(pct(trade.entry, trade.stopLoss))}% below entry` },
              { label: "ENTRY", price: trade.entry, color: "#e8e0ff", pctVal: "your buy-in price" },
              { label: "TAKE PROFIT 1", price: trade.takeProfit1, color: C.long, pctVal: `+${Math.abs(pct(trade.entry, trade.takeProfit1))}% from entry` },
              { label: "TAKE PROFIT 2", price: trade.takeProfit2, color: "#00c488", pctVal: `+${Math.abs(pct(trade.entry, trade.takeProfit2))}% from entry` },
              { label: "TAKE PROFIT 3", price: trade.takeProfit3, color: "#009a6a", pctVal: `+${Math.abs(pct(trade.entry, trade.takeProfit3))}% from entry` },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 2, background: l.color, borderRadius: 1, flexShrink: 0,
                  boxShadow: `0 0 6px ${l.color}` }} />
                <span style={{ fontSize: 9, color: l.color, letterSpacing: 1, width: 90, flexShrink: 0 }}>{l.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: l.color }}>{formatCurrency(l.price)}</span>
                <span style={{ fontSize: 9, color: C.textFaint }}>{l.pctVal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PerpTradeAgent() {
  const [activeCoin, setActiveCoin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [trade, setTrade] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const analyze = async (coin) => {
    setActiveCoin(coin);
    setLoading(true);
    setError("");
    setTrade(null);
    setLivePrice(null);

    try {
      setLoadingStep("FETCHING LIVE PRICE...");
      const priceData = await fetchLivePrice(coin.geckoId);
      setLivePrice(priceData);

      setLoadingStep("RUNNING AI ANALYSIS...");
      const systemPrompt = `You are a professional crypto perpetual futures trading analyst specializing in BTC, ETH, SOL, and HYPE (Hyperliquid).

The user will give you a coin and its CURRENT LIVE PRICE. You MUST use this exact price as the entry price.

Respond ONLY with a valid JSON object — no markdown, no backticks, no preamble:

{
  "coin": "BTC",
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
  "keyLevels": { "support": [63000, 60000], "resistance": [67500, 70000] },
  "riskWarning": "..."
}

Rules:
- signal: "LONG", "SHORT", or "NEUTRAL"
- confidence: 0-100
- entry MUST equal the live price provided exactly
- leverage: HYPE max 5x, SOL max 10x, BTC/ETH max 20x
- stopLoss: LONG = 2-4% below entry, SHORT = 2-4% above entry
- takeProfit1/2/3: realistic spaced targets from entry
- reasoning: 3-4 sentences on the signal
- marketContext: 2-3 sentences on current conditions
- positionSizeNote: risk 1-2% of account
- riskWarning: one specific risk for this trade

Always respond with ONLY the JSON object.`;

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
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analyze ${coin.symbol} for a perp trade. CURRENT LIVE PRICE: $${priceData.price}. 24h change: ${priceData.change24h}%. Use $${priceData.price} as the entry price.` }
          ],
        }),
      });

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setTrade(parsed);
      setHistory((h) => [{ coin: parsed.coin, signal: parsed.signal, time: new Date().toLocaleTimeString(), coinObj: coin }, ...h.slice(0, 3)]);
    } catch (e) {
      setError("Analysis failed. Check your API key or internet connection.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const sigColor = trade?.signal === "LONG" ? C.long : trade?.signal === "SHORT" ? C.short : C.neutral;
  const sigGlow = trade?.signal === "LONG" ? C.longGlow : trade?.signal === "SHORT" ? C.shortGlow : "rgba(245,197,24,0.12)";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono', 'Courier New', monospace", padding: "24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.35} }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .coin-btn { transition: all 0.15s ease; cursor: pointer; }
        .coin-btn:hover { transform: translateY(-2px); }
        .bar-fill { transition: width 0.9s cubic-bezier(0.4,0,0.2,1); }
        .glow-long { text-shadow: 0 0 20px rgba(0,229,160,0.5); }
        .glow-short { text-shadow: 0 0 20px rgba(255,68,119,0.5); }
        .glow-purple { text-shadow: 0 0 20px rgba(176,106,255,0.6); }
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.purple, boxShadow: `0 0 10px ${C.purple}` }} className="pulse" />
            <span style={{ fontSize: 10, letterSpacing: 4, color: C.purpleDim, textTransform: "uppercase" }}>Perpetual Futures Signal Engine</span>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: "0 0 2px", letterSpacing: -1 }}>
            <span style={{ color: "#e8e0ff" }}>PERP</span><span style={{ color: C.purple }} className="glow-purple">AI</span>
          </h1>
          <p style={{ fontSize: 11, color: C.textFaint, margin: 0, letterSpacing: 2 }}>LIVE PRICES · AI ANALYSIS · LIVE CHART</p>
        </div>

        {/* Coin Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
          {COINS.map((c) => (
            <button key={c.symbol} onClick={() => analyze(c)} disabled={loading} className="coin-btn"
              style={{
                background: activeCoin?.symbol === c.symbol ? "rgba(176,106,255,0.12)" : C.bg2,
                border: `1px solid ${activeCoin?.symbol === c.symbol ? C.purple : C.border}`,
                borderRadius: 8, padding: "18px 8px", textAlign: "center",
                color: activeCoin?.symbol === c.symbol ? C.purple : C.textDim, fontFamily: "inherit",
              }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{c.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{c.symbol}</div>
              <div style={{ fontSize: 9, letterSpacing: 1, marginTop: 2, color: activeCoin?.symbol === c.symbol ? C.purpleDim : C.textFaint }}>{c.name.toUpperCase()}</div>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 28, textAlign: "center", background: C.purpleFaint, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: C.purpleDim, marginBottom: 14 }} className="pulse">{loadingStep}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {["LIVE PRICE", "PRICE ACTION", "KEY LEVELS", "AI SIGNAL"].map((s, i) => (
                <span key={i} style={{ fontSize: 8, letterSpacing: 1, color: C.textFaint, border: `1px solid ${C.textFaint}`, padding: "2px 8px", borderRadius: 2 }} className="pulse">{s}</span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ border: `1px solid ${C.short}`, borderRadius: 6, padding: 12, color: C.short, fontSize: 11, letterSpacing: 1, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {trade && !loading && (
          <div className="fade-in">

            {/* Live price badge */}
            {livePrice && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 14px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.long, boxShadow: `0 0 6px ${C.long}` }} className="pulse" />
                <span style={{ fontSize: 10, letterSpacing: 2, color: C.textDim }}>LIVE PRICE</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{formatCurrency(livePrice.price)}</span>
                <span style={{ fontSize: 10, color: parseFloat(livePrice.change24h) >= 0 ? C.long : C.short, marginLeft: "auto" }}>
                  {parseFloat(livePrice.change24h) >= 0 ? "▲" : "▼"} {Math.abs(livePrice.change24h)}% 24h
                </span>
              </div>
            )}

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
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>R:R {trade.riskRewardRatio}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, height: 3, background: C.bg3, borderRadius: 2 }}>
                <div className="bar-fill" style={{ height: "100%", width: `${trade.confidence}%`, background: sigColor, borderRadius: 2 }} />
              </div>
            </div>

            {/* Trade Math */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <Cell label="ENTRY PRICE" value={formatCurrency(trade.entry)} color="#e8e0ff" note="live market price" />
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

            {/* LIVE CHART */}
            <TradingViewChart tvSymbol={activeCoin?.tvSymbol} trade={trade} />

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

            <div style={{ border: `1px solid ${C.short}`, borderRadius: 8, padding: "14px 18px", background: "rgba(255,68,119,0.05)", marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: C.short, marginBottom: 6 }}>⚠ RISK WARNING</div>
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.8, color: "#aa5a70" }}>{trade.riskWarning}</p>
            </div>

            <div style={{ fontSize: 9, color: C.textFaint, lineHeight: 1.8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              DISCLAIMER: AI-generated analysis for educational purposes only. Not financial advice. Crypto perpetual trading with leverage carries extreme risk of total loss. Never trade more than you can afford to lose.
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && !loading && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: C.textFaint, marginBottom: 8 }}>RECENT SCANS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {history.map((h, i) => (
                <button key={i} onClick={() => analyze(h.coinObj)}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 12px", color: C.textDim, fontSize: 9, fontFamily: "inherit", letterSpacing: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: h.signal === "LONG" ? C.long : h.signal === "SHORT" ? C.short : C.neutral, fontSize: 7 }}>▶</span>
                  {h.coin} · {h.signal} · <span style={{ color: C.textFaint }}>{h.time}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
