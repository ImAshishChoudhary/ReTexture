from fastapi import APIRouter, HTTPException
from app.core.models import GenerationRequest, GenerationResponse
from app.core.ai_service import generate_variations
import os

router = APIRouter(prefix="/generate")

@router.post("/variations", response_model=GenerationResponse)
async def create_variations(req: GenerationRequest):
    try:
        file_paths = generate_variations(req.product_filename, req.concept)
        
        if not file_paths:
            raise HTTPException(status_code=500, detail="AI generation returned no images.")

        urls = [f"/{p.replace(os.sep, '/')}" for p in file_paths]

        return GenerationResponse(
            product_filename=req.product_filename,
            variations=urls
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))