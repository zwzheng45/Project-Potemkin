# Hackathon Frontend UI

Built with **Vite + React + TypeScript + Tailwind CSS + React Query** to showcase the on-chain capabilities of the Family Companion AI:

- Family onboarding: create a family agent, set a description, customize `family_id`, and optionally define a task price.
- Conversation demo: switch between different identities (mom/dad/kid/grandparent) and view live AI responses.
- Memory snapshot: compare STM / LTM / Profile memories alongside the backend `context_used`.
- Status panel: poll `/health` and the family count for booth-friendly demos.

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

Build for production:

```bash
npm run build
```

## Directory
- `src/App.tsx`: main screen, components, and layout logic.
- `src/lib/api.ts`: centralized API wrapper.
- `src/types.ts`: data contracts aligned with the FastAPI schemas.
- `tailwind.config.js`: dark theme plus custom brand palette.

## Design Notes
- Frosted glass aesthetic with gradient lighting to highlight the on-chain vibe.
- React Query keeps family/memory/health data fresh in real time.
- The chat area caches multi-turn conversations locally to keep demos smooth.

> If browser calls run into CORS issues, ensure the backend is running and `family_companion.server` has CORS enabled (it is on by default in this project).
