# PerpAI — Step by Step Setup Guide

## What you need (all free)
- A computer
- A GitHub account → github.com (free)
- A Vercel account → vercel.com (free)
- An OpenRouter account → openrouter.ai (free)

---

## STEP 1 — Get your free API key from OpenRouter

1. Go to **openrouter.ai**
2. Click **Sign In** → create a free account
3. Once logged in, click your profile icon (top right)
4. Click **API Keys**
5. Click **Create Key**
6. Give it any name (e.g. "perp-agent")
7. **Copy the key** — it looks like: `sk-or-v1-abc123...`
8. Save it somewhere safe (Notepad, Notes app, etc.)

---

## STEP 2 — Put your code on GitHub

1. Go to **github.com** and sign in (or create a free account)
2. Click the **+** button (top right) → **New repository**
3. Name it: `perp-trade-agent`
4. Make sure it's set to **Public**
5. Click **Create repository**
6. Now upload your files:
   - Click **uploading an existing file** (link on the new repo page)
   - Drag ALL the files from this folder into the upload box:
     ```
     index.html
     package.json
     vite.config.js
     .gitignore
     src/
       main.jsx
       App.jsx
     ```
   - Click **Commit changes**

---

## STEP 3 — Deploy on Vercel (free hosting)

1. Go to **vercel.com** and sign in with your GitHub account
2. Click **Add New Project**
3. Find your `perp-trade-agent` repo and click **Import**
4. Vercel will auto-detect it's a Vite project ✅
5. Before clicking Deploy, click **Environment Variables**
6. Add this:
   - **Name:** `VITE_OPENROUTER_API_KEY`
   - **Value:** paste your OpenRouter key from Step 1
7. Click **Deploy**
8. Wait ~1 minute ⏳
9. Vercel gives you a free URL like: `perp-trade-agent.vercel.app`

**That's it — you're live! 🎉**

---

## STEP 4 — Using the app

1. Open your Vercel URL in any browser
2. Type a coin ticker (BTC, ETH, SOL, etc.)
3. Hit **Analyze**
4. Get your trade plan with entry, stop loss, take profits, and leverage

---

## Troubleshooting

**"Analysis failed" error?**
→ Your API key might be wrong. Go to openrouter.ai, create a new key, and update it in Vercel:
  - Vercel dashboard → your project → Settings → Environment Variables

**App not loading?**
→ Make sure all files were uploaded correctly in Step 2

**Want to update the code?**
→ Edit files in GitHub, Vercel auto-redeploys in ~30 seconds

---

## Free tier limits (OpenRouter)

- A few requests per minute
- Plenty for personal use (checking a few coins per day)
- If you hit limits, wait a minute and try again
- For heavier use, add $5 credits to OpenRouter (lasts months)

---

⚠️ DISCLAIMER: This tool is for educational purposes only.
Not financial advice. Always do your own research.
Crypto trading with leverage carries extreme risk.
