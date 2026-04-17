# MANAS360 Project Guidelines

## Build And Test

- Root:
  - `npm run protect:branch`
- Backend:
  - `cd backend && npm install`
  - `cd backend && npm run dev`
  - `cd backend && npm run typecheck`
  - `cd backend && npm test`
  - `cd backend && npm run prisma:generate`
  - `cd backend && npm run prisma:migrate:dev`
- Frontend:
  - `cd frontend && npm install`
  - `cd frontend && npm run dev`
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run lint`
  - `cd frontend && npm test`

## Architecture

- Monorepo layout:
  - `backend/`: Express + TypeScript + Prisma + PostgreSQL + Redis.
  - `frontend/`: React + TypeScript + Vite + Tailwind.
  - `shared/`: shared cross-package types/utilities.
- Backend flow:
  - Entry: `backend/src/server.ts`.
  - App composition: `backend/src/app.ts`.
  - Feature routing: `backend/src/routes/`.
  - Business logic: `backend/src/services/` (keep controllers thin).
- Frontend flow:
  - Entry: `frontend/src/main.tsx`.
  - Main route composition: `frontend/src/App.tsx`.
  - Route modules: `frontend/src/routes/`.

## Conventions

- Keep backend business rules in service files, not controllers.
- Use shared error handling patterns (`AppError` and central error middleware) instead of ad hoc response shaping.
- Maintain role checks via existing auth/RBAC middleware in backend routes.
- Prefer existing frontend patterns:
  - route guards via protected route components,
  - lazy page loading in route composition,
  - TypeScript-first components and API typing.
- Do not introduce new architectural patterns when an established one already exists in the feature area.

## Environment And Pitfalls

- Prisma on Windows can fail with EPERM on `query_engine-windows.dll.node`.
  - Typical recovery: stop stale `node.exe`, delete `backend/node_modules/.prisma/client`, rerun `cd backend && npm run prisma:generate`.
- API connection issues often come from frontend/backend port mismatches.
  - Ensure frontend env API URL matches backend runtime port.
- Dev bypass flags in backend are local-development only.
  - Keep them disabled outside local dev.

## References

- Primary setup and quickstart: `README.md`
- Frontend docs index: `frontend/docs/README.md`
- Backend API docs index: `backend/docs/ADMIN_API_INDEX.md`
- Deployment overview: `DEPLOYMENT_CHECKLIST.md`
- Deployment runbook: `deployment_v2_guide.md`
- Architecture deep dive: `MANAS360_System_Architecture_v1.md`
- Backend schema and migrations: `backend/prisma/schema.prisma`
- Frontend landing specifics: `frontend/docs/LANDING_PAGE_SETUP.md`

## Agent Behavior Expectations

- Before editing, inspect nearby files in the same feature to match naming, structure, and style.
- Prefer minimal, targeted changes; avoid broad refactors unless explicitly requested.
- After edits, run the smallest relevant validation command (typecheck, test, lint) for touched area when feasible.
- If documentation exists for a topic, link it in responses rather than re-embedding long guidance.
