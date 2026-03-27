# AI Investment Allocator

A **goal-based investment allocation** web app. All percentages and rupee splits are computed by a **deterministic engine** on your device (and optionally via the API). **Google Gemini** is used **only** to generate short, plain-language explanations—it never changes the numbers.

---

## Disclaimer

**This is an AI-powered educational tool and not financial advice.** Consult a qualified, SEBI-registered advisor before investing.

---

## How the app works (current behaviour)

### 1. Profile — **Basics** (empty by default)

| Field | Default | Notes |
|-------|---------|--------|
| Age | Empty | Until you enter a valid age (18–100), age does **not** affect the risk score. |
| Monthly income (₹) | Empty | Typed as digits; **Indian comma grouping** (e.g. `80,000`) when not focused. |
| Monthly investment (₹) | Empty | Same formatting. Drives “what-if” and per-goal ₹ amounts. |
| Income stability | “Select stability” | Choose **Stable** or **Unstable** to affect scoring. |

### 2. **Goals** (none until you add them)

- Start with **no goals**. Use **+ Add goal** (or **Add your first goal**).
- Each goal: name, **target amount** (₹, comma-formatted), **time horizon** (years). Remove any goal with the small **×** control.
- **Risk appetite** (Low / Medium / High) is part of this panel.
- **Risk exposure** (the three-segment bar) **matches your selected risk appetite**: Low → Low, Medium → Medium, High → High.

### 3. **Portfolio snapshot**

- **Monthly investment required for numbers**: Until you enter **monthly investment (₹)**, allocation **%**, weighted return, success score, default SIP chart, and goal rupee amounts show **—** / placeholders. **Risk profile** and **risk exposure** still reflect your inputs (age, appetite, stability).
- **After entering monthly SIP** (no goals): **default allocation** (10-year horizon), **₹ split**, **large SIP chart**, weighted return, and success score.
- **With goals + monthly SIP**: blended mix by target weights; per-goal cards show full projections and instruments.
- Asset buckets: **Equity**, **Mutual funds**, **Debt**, **Bonds**, **Gold**.

### 4. **By goal**

- One card per goal: **status** (On Track / Needs Improvement / High Risk), **inflation-adjusted target vs projected SIP corpus**, progress bar, **doughnut**, **3-scenario SIP line chart** (6% / blended / 12%), bucket breakdown, **smart suggestions** (e.g. raise SIP or extend horizon).
- Engine may **tilt equity slightly** if feasibility is low (&lt;70% of target) or **lock gains** into bonds/debt if projected corpus is well above target (&gt;120%). Totals stay **100%**.
- Updates live as you edit inputs.

### Engine notes (deterministic)

- **Inflation** 6% p.a. on goal targets → inflation-adjusted target.
- **Expected returns** per bucket (e.g. Equity 12%, MF 10%, Bonds 7%, Debt 6%, Gold 6.5%) drive weighted SIP **future value** and scenario bands.

### 5. **AI explanations**

- **Generate AI explanations** calls the server (**Google Gemini**). Requires at least one goal and at least one investment stream.
- Explains *why* the shown mix fits the user; it does **not** recalculate allocation.

### 6. Demos

**Try aggressive** / **Try conservative** load sample profiles (including goals) so you can explore without typing everything.

---

## Tech stack

| Layer | Details |
|-------|---------|
| **Frontend** | React 18 (Vite), Tailwind CSS, Chart.js via `react-chartjs-2` |
| **Fonts** | [Inter](https://rsms.me/inter/) + [Lexend](https://www.lexend.com/) (SIL OFL) |
| **Backend** | Node.js, Express (`server/`) |
| **Engine** | [`services/allocationEngine.js`](services/allocationEngine.js) + [`services/allocationConfig.js`](services/allocationConfig.js) + [`services/suggestionEngine.js`](services/suggestionEngine.js) |
| **AI** | [`ai/openaiService.js`](ai/openaiService.js) — Gemini text generation only; **API key stays on the server** |

---

## Prerequisites

- **Node.js** 18+ recommended  
- **Google Gemini API key** (only if you use AI explanations)

---

## Setup & run

```bash
npm install
cp .env.example .env
# Add GEMINI_API_KEY to .env in the project root (required for /api/explain)
```

The server reads **`.env` from the project root** first, then the working directory.

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| [http://localhost:5173](http://localhost:5173) | Web app (Vite proxies `/api` → `http://localhost:3001`) |
| [http://localhost:3001/api/health](http://localhost:3001/api/health) | API health check |

**Important:** Open the app through the dev server URL above. Opening `index.html` as a file will not load the app correctly.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + API together (concurrent) |
| `npm run dev -w client` | Frontend only |
| `npm run dev -w server` | API only |
| `npm test` | Vitest — allocation engine tests |
| `npm run build` | Production build of `client` → `client/dist` |

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | `{ ok: true }` |
| `POST` | `/api/plan` | Same body as above. Response adds per-goal: `inflatedTarget`, `projectedValue`, `successRatio`, `goalStatus`, `projections` (monthly series), `portfolioMetrics`, top-level `projections[]` summary, and `suggestions[]`. Existing fields unchanged. |
| `POST` | `/api/explain` | `goals[]` may include `targetAmount`, `inflatedTarget`, `projectedValue`, `successRatio`, `goalStatus` for richer AI copy. Returns `{ explanations: [{ goalName, text }] }`. |

---

## Production build (split hosting)

If the UI and API are on different origins:

```bash
VITE_API_URL=https://your-api.example.com npm run build -w client
```

Serve `client/dist` as static files; run the server with CORS/env configured for that origin.

---

## Project layout

```
client/          Vite + React UI
server/          Express API (includes `server/ai` for Gemini logic)
services/        Allocation config + engine (shared; client uses `@services` alias)
```

---

## Engine (summary)

- **Risk score** from age (when provided), risk appetite, income stability, and whether any goal is short-term (&lt; 3 years).
- **Profile:** Aggressive / Moderate / Conservative from that score.
- **Per goal:** Horizon (short / mid / long) drives a base mix; then profile and rules (e.g. short-term equity cap, conservative floor on bonds+debt) adjust and normalize to **100%**.
- **₹ split:** Monthly investment distributed across goals by **target amount** (equal split if all targets are 0).

All numeric rules live in [`services/allocationConfig.js`](services/allocationConfig.js).
