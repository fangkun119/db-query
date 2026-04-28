from fastapi import APIRouter, HTTPException
from typing import Any

router = APIRouter()


@router.get("/")
async def placeholder() -> dict[str, Any]:
    return {"message": "Database endpoints - to be implemented in Phase 3"}
