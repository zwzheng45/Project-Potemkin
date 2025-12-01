import logging
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from family_companion.schemas import (
    ChatResponse,
    CreateFamilyRequest,
    FamilyResponse,
    MessageRequest,
    UpdateFamilyRequest,
)
from family_companion.service import FamilyService

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

service = FamilyService()

app = FastAPI(
    title="Unibase Family Companion",
    description="链上家庭陪伴AI：每个家庭拥有独立的长期记忆与画像。",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, object]:
    return {
        "status": "ok",
        "onchain": service.chain.summarize_status(),
        "agent_uuid": service.chain.agent_uuid,
        "families": len(service.agents),
    }


@app.get("/families", response_model=List[FamilyResponse])
def list_families() -> List[FamilyResponse]:
    return [FamilyResponse(**agent) for agent in service.list_families().values()]


@app.post("/families", response_model=FamilyResponse)
def register_family(req: CreateFamilyRequest) -> FamilyResponse:
    agent = service.register_family(
        name=req.name,
        description=req.description,
        family_id=req.family_id,
        task_price=req.task_price,
        language=req.language,
    )
    return FamilyResponse(**agent.to_dict())


@app.patch("/families/{family_id}", response_model=FamilyResponse)
def update_family(family_id: str, req: UpdateFamilyRequest) -> FamilyResponse:
    payload = service.update_family(
        family_id,
        description=req.description,
        task_price=req.task_price,
        members=[member.dict() for member in req.members] if req.members is not None else None,
    )
    return FamilyResponse(**payload)


@app.delete("/families/{family_id}", status_code=204)
def delete_family(family_id: str) -> None:
    service.delete_family(family_id)


@app.post("/families/{family_id}/messages", response_model=ChatResponse)
def chat(family_id: str, req: MessageRequest) -> ChatResponse:
    try:
        result = service.chat(family_id=family_id, sender=req.sender, content=req.content)
        return ChatResponse(**result)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive for demo
        logger.exception("chat failed: %s", exc)
        raise HTTPException(status_code=500, detail="chat failed") from exc


@app.get("/families/{family_id}/memory")
def memory(family_id: str) -> Dict[str, object]:
    try:
        return service.memory_snapshot(family_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
