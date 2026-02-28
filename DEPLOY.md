# CleanWear — Deployment Guide

## What You're Deploying

A fully functional clothing safety scanner app with:
- Claude AI-powered product research (server-side API proxy)
- Camera barcode scanning
- Anonymous scan analytics (PostHog + Supabase)
- Wardrobe tracking (localStorage — no accounts needed)
- Deployed on Vercel (free tier)

---

## Step 1: Get Your API Keys (15 min)

You need three accounts. All have free tiers.

### 1A — Anthropic API Key
1. Go to **console.anthropic.com**
2. Sign up / sign in
3. Go to **Settings → API Keys → Create Key**
4. Copy it — starts with `sk-ant-`
5. Add billing (pay-per-use, ~$0.003 per scan with Sonnet)
6. **Save this key somewhere safe — you'll add it to Vercel later**

### 1B — PostHog (anonymous analytics)
1. Go to **posthog.com** → Sign up free
2. After onboarding, go to **Settings → Project → Project API Key**
3. Copy the key — looks like `phc_xxxxxxxxxxxx`
4. You'll paste this into `index.html` in the next step

### 1C — Supabase (scan logging database)
1. Go to **supabase.com** → Sign up free
2. Click **New Project** → name it `cleanwear` → set a password → choose region
3. Wait ~2 min for it to spin up
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
5. Go to **SQL Editor** and run this to create the scans table:

```sql
CREATE TABLE scans (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  score INTEGER,
  brand TEXT,
  product TEXT,
  category TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anonymous inserts (no auth needed)
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert scans"
  ON scans FOR INSERT
  WITH CHECK (true);

-- Allow you to read scans from the dashboard
CREATE POLICY "Anyone can read scans"
  ON scans FOR SELECT
  USING (true);
```

6. Click **Run** — you should see "Success"

---

## Step 2: Set Up the Project Locally (10 min)

### 2A — Install Prerequisites
Make sure you have installed:
- **Node.js** (v18+): https://nodejs.org
- **Git**: https://git-scm.com
- **Vercel CLI**: Run `npm install -g vercel`

### 2B — Create GitHub Repo
1. Go to **github.com** → New repository
2. Name it `cleanwear` → Public or Private → **Don't** add README
3. Copy the repo URL (e.g. `https://github.com/yourname/cleanwear.git`)

### 2C — Set Up Local Files
Open your terminal and run:

```bash
# Clone/download the project files I gave you into a folder called cleanwear
cd ~/Desktop  # or wherever you want
mkdir cleanwear
cd cleanwear

# Copy ALL the project files into this folder, then:
npm install
```

Your folder should look like:
```
cleanwear/
├── api/
│   └── scan.js           ← Vercel serverless function (Claude proxy)
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx           ← Entry point
│   ├── CleanWear.jsx      ← The app
│   └── supabase.js        ← Scan logging
├── .env.example
├── .gitignore
├── index.html             ← Has PostHog snippet
├── package.json
├── vercel.json
└── vite.config.js
```

### 2D — Add Your Keys to the Code

**PostHog:** Open `index.html` and replace `YOUR_POSTHOG_KEY` with your actual PostHog project key:
```js
posthog.init('phc_YOUR_ACTUAL_KEY_HERE', {
```

**Supabase:** Create a file called `.env.local` in the root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour_actual_anon_key_here
```

**Anthropic key:** Do NOT put this in any file. It goes in Vercel dashboard (Step 4).

### 2E — Test Locally (Optional)

```bash
npx vercel dev
```

This will prompt you to link a Vercel project. It simulates the serverless functions locally. The scan won't work until you set the Anthropic key as an env var — but you can verify the UI loads at `http://localhost:3000`.

### 2F — Push to GitHub

```bash
git init
git add .
git commit -m "Initial CleanWear deploy"
git remote add origin https://github.com/yourname/cleanwear.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel (5 min)

### 3A — Connect to Vercel
1. Go to **vercel.com** → Sign up with GitHub
2. Click **Add New → Project**
3. Select your `cleanwear` repo
4. Framework Preset: **Vite**
5. Build command: `vite build` (should auto-detect)
6. Output directory: `dist` (should auto-detect)

### 3B — Add Environment Variables
Before clicking deploy, expand **Environment Variables** and add:

| Key | Value | Environment |
|-----|-------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-your-key-here` | Production |
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJxxxxx` | Production |

### 3C — Deploy
Click **Deploy**. Vercel will build and give you a URL like:
```
https://cleanwear-xxxxx.vercel.app
```

**That's your live app.** Open it on your phone — camera scanning will work.

---

## Step 4: Custom Domain (Optional, 5 min)

1. Buy a domain (Namecheap, Cloudflare, Google Domains)
   - Suggestions: `cleanwear.app`, `cleanwear.health`, `wearclean.co`
2. In Vercel dashboard → your project → **Settings → Domains**
3. Add your domain → follow the DNS instructions
4. Vercel auto-provisions HTTPS

---

## Step 5: Verify Everything Works

### Test the scan:
1. Open your Vercel URL on your phone
2. Search "Nike Dri-FIT Tee"
3. Should show loading → results with cancer risk, effects, score

### Check PostHog:
1. Go to **posthog.com** → your project
2. You should see your page view and `scan_completed` event

### Check Supabase:
1. Go to **supabase.com** → your project → **Table Editor → scans**
2. You should see a row with the product you just scanned

---

## How to Monitor Usage

### PostHog Dashboard (daily check)
- **Pageviews**: How many people visit
- **scan_completed events**: How many actually scan something
- **Unique users**: Returning vs. new
- Set up a dashboard with these metrics — takes 2 minutes

### Supabase (product insights)
Run these queries in SQL Editor to see what's happening:

```sql
-- Total scans
SELECT COUNT(*) FROM scans;

-- Scans per day
SELECT DATE(scanned_at) as day, COUNT(*) as scans
FROM scans GROUP BY day ORDER BY day DESC;

-- Most scanned products
SELECT brand, product, COUNT(*) as times_scanned, AVG(score) as avg_score
FROM scans GROUP BY brand, product ORDER BY times_scanned DESC LIMIT 20;

-- Most scanned brands
SELECT brand, COUNT(*) as scans
FROM scans GROUP BY brand ORDER BY scans DESC LIMIT 10;
```

---

## Cost Breakdown (At Scale)

| Service | Free Tier | When You'd Pay |
|---------|-----------|----------------|
| Vercel | 100GB bandwidth, 100k function invocations/mo | ~1,000+ daily users |
| Anthropic | None (pay-per-use) | ~$0.003/scan = $3 per 1,000 scans |
| PostHog | 1M events/mo | Extremely generous |
| Supabase | 500MB database, 50k rows | ~50,000 scans |

**At 100 scans/day:** ~$9/month (just Anthropic API costs)
**At 1,000 scans/day:** ~$90/month

---

## Updating the App

After making changes locally:

```bash
git add .
git commit -m "Description of changes"
git push
```

Vercel auto-deploys on every push to `main`. Live in ~30 seconds.

---

## Troubleshooting

**Scan shows error:**
→ Check Vercel dashboard → Functions tab → look for errors in `api/scan`
→ Most likely: API key not set or expired

**Camera doesn't work:**
→ Must be on HTTPS (Vercel gives you this automatically)
→ Must allow camera permission when prompted
→ Some browsers (Firefox, older Safari) don't support BarcodeDetector — falls back to manual entry

**PostHog not tracking:**
→ Check browser console for errors
→ Make sure you replaced `YOUR_POSTHOG_KEY` with your actual key
→ Ad blockers may block PostHog — this is normal, you'll still see most users

**Supabase not logging:**
→ Check that the `scans` table exists and RLS policies are set
→ Check browser console for Supabase errors
→ Verify `.env.local` values match your Supabase project
