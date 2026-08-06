# Digitization of CDS — OvenFresh CDS

Full-stack PERN app for a university cafeteria: POS, kitchen display, customer
token board, inventory back office, and owner analytics. **All business logic
lives in PostgreSQL** (triggers, cursors, PL/pgSQL functions); Express is a
thin REST layer; React renders it.

## Structure

| Folder | What |
|--------|------|
| `database/` | DDL, triggers, functions, seed data (`run_all.sql` runs everything) |
| `backend/` | Express 5 + TypeScript API on port 3001 — thin wrappers over the PL/pgSQL functions |
| `frontend/` | Vite + React 19 + Tailwind v4 UI on port 5173 (proxies `/api` to the backend) |
| `ui-prompts/` | The design spec pack the UI was built from |
| `plan.md` | Implementation plan |

## Run it

```powershell
# 1. Database (once) — creates tables, triggers, functions, seed data
# Use the postgres superuser (-U postgres); enter the password you chose
# when installing PostgreSQL.
psql -U postgres -h localhost -c "CREATE DATABASE cds_database;"
psql -U postgres -h localhost -d cds_database -f database/run_all.sql

# 2. Backend — first edit backend/.env and put your real postgres password
# in DATABASE_URL, e.g. postgresql://postgres:YOURPASSWORD@localhost:5432/cds_database
cd backend
npm install
npm run dev          # http://localhost:3001/api/health

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

> Windows PowerShell note: `&&` doesn't work in PowerShell 5.1 — run the
> commands on separate lines (or separate with `;`).

## Screens

- `/` Landing — module launcher
- `/pos` Cashier POS — catalog + ticket, guest/registered customers, kitchen
  escalation, parked orders, missed-demand logging
- `/kitchen` Kitchen Display — ticket board with bump buttons, escalation
  approvals, batch management
- `/tokens` Token Display — passive wall board (Now Serving / Preparing / Queue)
- `/inventory` Inventory — raw materials, ready-made stock + waste, purchase
  orders (triggers update stock + weighted average cost), losses & demand
- `/analytics` Owner Dashboard — KPIs, sales chart, top sellers, payment/dine
  mix, missed demand, vendor spend
