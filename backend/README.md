# Academia Backend

Node.js + Express + TypeScript backend with Patchright-based scraper for [SRM Academia Portal](https://academia.srmist.edu.in/).

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts                    # Express server entry point
│   ├── routes/
│   │   └── academia.routes.ts      # API route handlers
│   ├── scraper/
│   │   ├── academia.scraper.ts     # Patchright login & data scraper
│   │   └── scrape.cron.ts          # node-cron scheduler
│   └── types/
│       └── academia.types.ts       # TypeScript interfaces
├── .env                            # Environment variables
├── package.json
└── tsconfig.json
```

## 🚀 Getting Started

```bash
npm install
npx patchright install chromium   # Install Chromium browser for Patchright
npm run dev
```

## 📡 API Endpoints

### `GET /api/health`
Health check.

---

### `POST /api/academia/login`
Performs a **one-shot** login + scrape. Returns fresh data immediately.

**Body:**
```json
{
  "username": "your_srm_email@srmist.edu.in",
  "password": "your_password"
}
```

---

### `POST /api/academia/schedule`
Schedules a **recurring cron job** that auto-scrapes in the background.

**Body:**
```json
{
  "username": "your_srm_email@srmist.edu.in",
  "password": "your_password",
  "cronExpression": "*/30 * * * *"
}
```
Default: every 30 minutes.

---

### `POST /api/academia/scrape`
Manually **triggers an immediate scrape** and stores in memory cache.

**Body:** Same as `/login`

---

### `GET /api/academia/cached/:username`
Returns the **last cached** scrape result without triggering a new scrape.

**Example:** `GET /api/academia/cached/eb1234@srmist.edu.in`
