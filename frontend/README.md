# Hackathon Frontend UI

Built with **Vite + React + TypeScript + Tailwind CSS + React Query** to talk directly to `family_companion.server`:

- Family onboarding + owner account: `/auth/signup` (includes `family_name`, `family_id?`, `task_price?`, `language`, and owner `user_name/email/password`).
- Member auth: `/auth/login` issues a bearer token stored as `fc-token` (localStorage) and used for all authenticated calls.
- Member invites (owner only): `/families/{family_id}/members` with `name/email/role`, which returns an `invite_url`; invitees register themselves via `/auth/invite/accept`.
- Chat: `/families/{family_id}/messages` uses the authenticated user; responses return `reply`, `context_used`, and a `memory` snapshot (`stm/ltm/profile/user_stm`).
- Memory panel: `/families/{family_id}/memory` (auth) plus `/health` for status.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

The frontend targets `http://localhost:8000` by default. Override it via `.env` or an inline command:

```bash
VITE_API_BASE_URL="https://your-domain" npm run dev
```

Make sure the backend (`uvicorn family_companion.server:app --port 8000`) has a valid `OPENAI_API_KEY` and optional on-chain creds loaded.

Build for production:

```bash
npm run build
```

## Directory
- `src/App.tsx`: main screen, auth/flow logic, chat + memory views.
- `src/lib/api.ts`: centralized API wrapper with bearer token support.
- `src/types.ts`: data contracts aligned with the latest FastAPI schemas.
- `tailwind.config.js`: dark theme plus custom brand palette.

## Design Notes
- Frosted glass aesthetic with gradient lighting to highlight the on-chain vibe.
- React Query keeps family/memory/health data fresh in real time; session tokens persist locally.
- The chat area caches multi-turn conversations locally to keep demos smooth.

> If browser calls run into CORS issues, ensure the backend is running and `family_companion.server` has CORS enabled (it is on by default in this project).
