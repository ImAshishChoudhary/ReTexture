from fastapi import APIRouter
from app.core.models import ValidationRequest, ValidationResponse
from app.agents.runner import run_validation

router = APIRouter(prefix="/validate")

@router.post("")
async def validate(req: ValidationRequest) -> ValidationResponse:
    result = await run_validation(req.canvas)
    return result