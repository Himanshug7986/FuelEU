# FuelEU Maritime — Compliance Platform (Assignment)

Minimal full-stack implementation: **React + TypeScript + Tailwind** dashboard and **Node.js + TypeScript + PostgreSQL** API for routes, GHG comparison, compliance balance (CB), banking (Article 20), and pooling (Article 21). Both sides follow a **hexagonal (ports & adapters)** layout.

## Architecture summary

### Backend (`/backend`)

```
src/
  core/
    domain/           # Pure formulas & invariants (CB, comparison, banking, pooling)
    application/      # Use-cases orchestrating ports
    ports/            # Inbound needs / outbound persistence interfaces
  adapters/
    inbound/http/     # Express app wiring (createApp)
    outbound/postgres/# pg repository implementations
  infrastructure/
    db/               # SQL migrations, seed, migrate script, pool factory
    server/           # Composition root & HTTP listen
  shared/             # Constants (e.g. target intensity)
```

- **Core** has no Express or `pg` imports.
- **HTTP** and **Postgres** are adapters that implement ports.

### Frontend (`/frontend`)

```
src/
  core/
    domain/           # DTO types
    application/      # Formatting helpers (tested)
    ports/            # FuelEuApiPort (list routes, banking, pools, …)
  adapters/
    ui/               # React tabs, context, accessibility
    infrastructure/   # HttpFuelEuApi (fetch)
  shared/             # Constants
```

- UI depends on **ports**, not on `fetch` directly (implementations live in `adapters/infrastructure`).

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) **or** your own Postgres 16 instance

## Quick start

### 1. Database

From the repo root:

```bash
docker compose up -d
```

Copy `backend/.env.example` to `backend/.env` and adjust if needed (default matches `docker-compose.yml`).

### 2. Migrations & seed

```bash
cd backend
npm install
npm run migrate
```

### 3. API

```bash
cd backend
npm run dev
```

Server: `http://localhost:4000`  
Health: `GET http://localhost:4000/health`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173` — API calls use the Vite dev proxy: `/api` → `http://localhost:4000`.

For a static build against a remote API, set `VITE_API_BASE` (see `frontend/.env.example`).

## Tests

**Backend**

```bash
cd backend
npm test
```

**Frontend**

```bash
cd frontend
npm test
```

## Sample API requests

```http
GET /routes
GET /routes?vesselType=Container&year=2024
POST /routes/R002/baseline
GET /routes/comparison
```

```http
GET /compliance/cb?year=2024&shipId=SHIP-002
GET /compliance/adjusted-cb?year=2024
GET /compliance/adjusted-cb?year=2024&shipId=SHIP-002
```

```http
POST /banking/bank
Content-Type: application/json

{"shipId":"SHIP-002","year":2024}
```

```http
POST /banking/apply
Content-Type: application/json

{"shipId":"SHIP-003","year":2024,"amount":1000000}
```

```http
POST /pools
Content-Type: application/json

{
  "year": 2024,
  "members": [
    { "shipId": "SHIP-001", "adjustedCb": -5000000 },
    { "shipId": "SHIP-002", "adjustedCb": 8000000 }
  ]
}
```

**Example JSON — `GET /routes/comparison`**

```json
{
  "baseline": { "routeId": "R001", "ghgIntensity": 91 },
  "targetIntensity": 89.3368,
  "comparisons": [
    {
      "routeId": "R002",
      "ghgIntensity": 88,
      "percentDiff": -3.296703296703296,
      "compliant": true
    }
  ]
}
```

## Screenshots

After `npm run dev` for both apps, capture:

1. **Routes** — table with filters (no baseline column).
2. **Compare** — choose baseline route, table + bar chart with target reference line.
3. **Banking** — CB card, bank / apply actions, KPI strip after apply.
4. **Pooling** — ship list, pool sum (green/red), create pool result.

## Compliance formulas (implemented)

- **Target intensity (2025 reference):** `89.3368` gCO₂e/MJ  
- **Energy (MJ)** ≈ `fuelConsumption (t) × 41_000`  
- **Compliance balance (gCO₂e):** `(target − actualIntensity) × energyMj`  
- **Comparison % diff:** `((comparison / baseline) − 1) × 100`  
- **Compliant (vs target):** `actualIntensity ≤ target`

## AI agent documentation

- [`AGENT_WORKFLOW.md`](./AGENT_WORKFLOW.md) — prompts, validation, observations  
- [`REFLECTION.md`](./REFLECTION.md) — short essay on using AI for this build  

## Repository layout (submission)

```
/backend
/frontend
AGENT_WORKFLOW.md
README.md
REFLECTION.md
docker-compose.yml
```
