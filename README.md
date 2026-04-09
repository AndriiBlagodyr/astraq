# Astraq Monorepo

This repository is organized into three independent projects:

- `apps/web`: Next.js frontend for authentication, TradingView-based charts, and prediction analysis UX.
- `apps/api`: Node.js backend for frontend support, business logic, and database access.
- `services/ml`: FastAPI service for ML prediction endpoints.

## Suggested architecture

```text
astraq/
├── apps/
│   ├── api/
│   └── web/
└── services/
    └── ml/
```

## Next steps

1. Install dependencies inside each project.
2. Connect the backend to your database.
3. Connect the frontend to the backend and ML service.
4. Add Docker and CI once the first endpoints and pages are in place.

## Running locally

Each service is scaffolded independently so you can evolve them at different speeds.

- Frontend: `cd apps/web && npm install && npm run dev`
- Backend: `cd apps/api && npm install && npm run dev`
- ML service: `cd services/ml && python3 -m venv .venv && source .venv/bin/activate && pip install -e . && uvicorn app.main:app --reload`

