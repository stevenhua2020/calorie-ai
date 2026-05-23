# 🔥 CalorieAI

A personal food calorie tracker powered by Claude AI. Analyze meals by text or photo, track daily macros, and store logs privately in your GitHub repo.

## Features

- 🤖 **AI analysis** — Describe food or take a photo; Claude estimates calories & macros
- 🔒 **GitHub login** — Secured by your GitHub Personal Access Token
- 📊 **Daily goals** — Configurable targets for calories, protein, carbs, fat, fiber
- 💾 **Private storage** — Logs saved as JSON in your GitHub repo (up to 90 days)
- 📅 **History** — Browse and export any past day's log
- 📱 **Mobile-first** — Works great on Galaxy Z Fold 6 (add to home screen!)

---

## Setup (5 minutes)

### 1. Fork or clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/calorie-ai.git
cd calorie-ai
```

### 2. Create a second repo for your data (can be private)

Go to [github.com/new](https://github.com/new) and create a repo called `calorie-ai-data` (or any name).
Initialize it with a README so it's not empty.

### 3. Enable GitHub Pages on THIS repo

1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Save

### 4. Push your code

```bash
git add .
git commit -m "Initial commit"
git push
```

GitHub Actions will automatically build and deploy. Your app will be at:
```
https://YOUR_USERNAME.github.io/calorie-ai/
```

### 5. Create a Personal Access Token

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Give it a name like `CalorieAI`
3. Select scopes: ✅ **repo** (full control of private repos)
4. Click **Generate token** — copy it!

### 6. Open the app and sign in

- Open `https://YOUR_USERNAME.github.io/calorie-ai/`
- Paste your PAT
- Enter your data repo name (e.g. `calorie-ai-data`)
- Sign in!

---

## Customise your goals

Edit `public/config.json`:

```json
{
  "goals": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 65,
    "fiber": 30
  }
}
```

Or change them in-app via the **⚙️ Settings** screen.

---

## Data format

Each day's log is saved as:
```
data/logs/YYYY-MM-DD.json
```

Example:
```json
{
  "date": "2026-05-23",
  "totalCalories": 1450,
  "totalProtein": 98,
  "totalCarbs": 160,
  "totalFat": 42,
  "totalFiber": 18,
  "entries": [...]
}
```

---

## Install on Galaxy Z Fold 6

1. Open the app URL in **Chrome** or **Samsung Internet**
2. Tap the **⋮ menu** → **Add to Home screen**
3. Done — it works like a native app with full camera access!

---

## Privacy

- Your GitHub PAT is stored only in your browser's `localStorage`
- Food logs are stored in your own (optionally private) GitHub repo
- Claude API calls go directly from your browser to Anthropic
- No third-party servers involved
