from fastapi import APIRouter
from app.core.models import ValidationRequest, ValidationResponse
from app.agents.runner import run_validation
import base64

router = APIRouter(prefix="/validate")

@router.post("")
async def validate(req: ValidationRequest) -> ValidationResponse:
    decoded_canvas = base64.b64decode(req.canvas).decode('utf-8')
    result = await run_validation(decoded_canvas)
    return result