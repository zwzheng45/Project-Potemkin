# On-Chain Family Companion AI (Unibase/Membase Demo)

An on-chain family companion built on Unibase’s Membase memory layer. Every family owns its own agent, short-/long-term memory, and profile, plus optional BNB Testnet on-chain permissions. This project is fully in English, with per-family multi-language replies supported.

## Highlights
- **Family-scoped agents**: `family_id` is a family’s lifelong identity with isolated SQLite + Chroma memory at `~/.membase/<family_id>/…`.
- **Automatic long-term memory**: `LTMemory` summarizes every 16 short-term turns into long-term memory and a profile, with optional Hub sync.
- **On-chain sovereignty (optional)**: With BNB Testnet creds, each family gets an on-chain task/space and the service agent buys access.
- **Cross-device ready**: Hub sync + local persistence make memories reusable across devices or third-party agents.
- **Multi-language output**: Pick a preferred language per family (e.g., `en/zh/es/fr/ja`); inputs can mix languages, outputs follow the family setting.
- **FastAPI out of the box**: Endpoints for family registration, chat, and memory snapshots.

## Quickstart
1) Install deps
```bash
pip install -r requirements.txt
```

2) Configure environment (copy `.env.example` to `.env` and fill in)
- `OPENAI_API_KEY` (required for memory + chat)
- `OPENAI_MODEL_NAME` (default `gpt-4.1-mini`)
- `MEMBASE_ACCOUNT` / `MEMBASE_SECRET_KEY` / `MEMBASE_ID` (optional; enables on-chain auth on BNB Testnet)
- `MEMBASE_HUB` (Membase Hub endpoint, defaults to testnet)

3) Run the service
```bash
uvicorn family_companion.server:app --host 0.0.0.0 --port 8000
# or python -m family_companion
```

4) Multi-language
- Set `language` (ISO code like `en`/`zh`/`es`/`fr`/`ja`) when registering a family; replies follow that language.

## API Examples
Register a family (custom `family_id` optional; slug is auto-generated otherwise):
```bash
curl -X POST http://localhost:8000/families \
  -H "Content-Type: application/json" \
  -d '{"name":"Li Family","description":"Loves weekend camping; child is 8.","language":"en"}'
```

Chat and store memory:
```bash
curl -X POST http://localhost:8000/families/li/messages \
  -H "Content-Type: application/json" \
  -d '{"sender":"Mom","content":"Where should we take the kid this weekend?"}'
```

Check memory snapshot (latest STM, LTM, profile):
```bash
curl http://localhost:8000/families/li/memory
```

List families:
```bash
curl http://localhost:8000/families
```

## Directory Tour
- `family_companion/server.py`: FastAPI entrypoint.
- `family_companion/service.py`: Family registration, chain access, agent orchestration.
- `family_companion/agent.py`: Family companion agent; uses LTMemory context to reply.
- `family_companion/memory.py`: Per-family `LTMemory` (STM/LTM/profile) bootstrap.
- `family_companion/chain.py`: On-chain wrapper calling `membase_chain.createTask/buy`.
- `family_companion/state.py`: Family metadata persisted at `~/.membase/family_agents/state.json`.
- `.env.example`: Environment template.

## Tech Notes
- **Frameworks**: FastAPI + Uvicorn (Python). Memory uses Unibase Membase (`membase.memory.LTMemory`: SQLite + Chroma for STM/LTM/profile).
- **LLM**: OpenAI API (`OPENAI_API_KEY`, default model `gpt-4.1-mini`).
- **On-chain**: `membase.chain.chain` (Web3, BNB Testnet RPCs) to create family tasks and buy permissions; behaves as a no-op when creds are absent.
- **Storage**: Local `~/.membase/<family_id>/sql.db` for dialogue, `~/.membase/<family_id>/rag` for vector store; optional Hub upload via `MEMBASE_AUTO_UPLOAD`.
- **Background summarization**: `LTMemory` worker summarizes every 16 STMs into LTM and refreshes the profile.
- **Multi-language**: Family-scoped `language` field; system prompt enforces reply language while accepting mixed input.

## Memory & Profile Flow
- STM: every turn stored in SQLite and into Chroma for retrieval.
- LTM: every 16 STMs are summarized into LTM, and the family profile is refreshed.
- Storage: `~/.membase/<family_id>/sql.db` (dialogue) and `~/.membase/<family_id>/rag` (vector DB).
- Hub sync: with `MEMBASE_AUTO_UPLOAD=true`, memories push to Membase Hub for cross-device reuse.

## On-Chain (Optional)
With `MEMBASE_ACCOUNT`, `MEMBASE_SECRET_KEY`, and `MEMBASE_ID` set:
- Registering a family creates a task/space on-chain with stake `MEMBASE_TASK_PRICE` (BNB Testnet).
- The service agent auto-buys/checks permission.
- See `family_companion/chain.py` (uses `membase/chain/chain.py`).

## Extend Ideas
- Hook home devices/calendars to enrich context before `FamilyAgent.chat`.
- Wrap FastAPI for Telegram/WeChat/WhatsApp bots sharing the same memory space.
- Add signature checks (see `membase/auth.py`) to limit who can write memories.
- Customize summarization cadence/prompts inside `LTMemory`, or mirror LTM on-chain.

## Verify
- Health: `curl http://localhost:8000/health` → expect `status: ok` and on-chain status.
- Memory: chat multiple times then call `/families/{id}/memory` to see LTM/profile updates.

> For official docs see [Unibase Docs](https://openos-labs.gitbook.io/unibase-docs/).
