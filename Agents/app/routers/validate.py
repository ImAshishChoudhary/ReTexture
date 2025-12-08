from fastapi import APIRouter
from app.core.models import ValidationRequest, ValidationResponse
from app.agents.runner import run_validation
import base64
import time

router = APIRouter(prefix="/validate")

@router.post("")
async def validate(req: ValidationRequest) -> ValidationResponse:
    print(req.canvas)
    decoded_canvas = base64.b64decode(req.canvas).decode('utf-8')

    start = time.perf_counter()
    result = await run_validation(decoded_canvas)
    end = time.perf_counter()
    print(f"Validation took {end - start} seconds")
    
    return result