# Freezy Prop Firm Command Center - PRD

## Overview
Premium React Native Expo mobile app for traders to plan, track, and execute a prop firm scaling protocol from a single 25K evaluation to a cumulative $50,000 payout goal.

## Architecture
- **Frontend**: Expo SDK 54 (Expo Router) with React Native, Reanimated, gifted-charts, react-native-svg, expo-linear-gradient, @gorhom/bottom-sheet, expo-image-picker
- **Backend**: FastAPI + MongoDB (Motor async). No auth — single-user personal app.
- **Storage**: MongoDB collections: `settings`, `accounts`, `plan_days`, `journal`
- **Theme**: Luxury Dark Mode — Bloomberg terminal aesthetic. Electric Blue + Gold + Neon Green / Soft Red.

## Tabs
1. **Command** — Hero $50K goal ring, KPI grid (8 tiles), scaling roadmap, quick actions, recent payouts
2. **Accounts** — Filterable list (All/Eval/Passed/Funded/Blown), per-account neon glow, add-account modal
3. **Planner** — 90-day calendar grid, day detail bottom-sheet with checklist + R earned + notes
4. **Journal** — Trade log with screenshot upload (base64); Analytics sub-tab (R-curve LineChart, R-distribution BarChart)

## Stack Screens
- `/account/[id]` — Status transitions, profit %, consistency %, 5-day funded tracker, payout log
- `/payouts` — Animated payout growth chart + history
- `/goal` — Ring + tier progression (Rookie/Builder/Scaler/Elite/Mission Complete)
- `/copy-trading` — Master/Slave management (unlocks at ≥2 funded accounts)
- `/achievements` — 7 milestone badges, gold glow on unlocked
- `/scaling` — Vertical roadmap timeline 
- `/settings` — Configure days/R/split/goal

## Key Backend Endpoints
- `GET /api/dashboard` — aggregated KPIs, goal progress, achievements, scaling roadmap, recent payouts
- `GET /api/settings`, `PUT /api/settings`
- CRUD on `/api/accounts`, sub-resources `/funded-days`, `/payouts`
- `GET /api/plan`, `PUT /api/plan/{day}` (auto-seeds 90 days)
- CRUD on `/api/journal`
- `GET /api/copy-trading`, `PUT /api/copy-trading/master/{id}`

## Business Logic
- Auto-bootstrap on startup: default settings + 90-day plan + 1×25K starter account
- Funded day counts if profit ≥ $150
- Payout split applied server-side (default 90%)
- Achievements computed in /dashboard based on accounts + payouts state
- Scaling roadmap nodes flip "done" automatically from data
