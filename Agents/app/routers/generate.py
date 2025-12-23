from fastapi import APIRouter, HTTPException, File, UploadFile
from pydantic import BaseModel
from typing import Optional
from app.core.ai_service import generate_variations_from_bytes
import base64

router = APIRouter(prefix="/generate")

class VariationsRequest(BaseModel):
    image_data: str  # Base64 encoded image
    concept: Optional[str] = "product photography"

class VariationsResponse(BaseModel):
    success: bool
    variations: list[str]  # List of base64 encoded images

@router.post("/variations", response_model=VariationsResponse)
async def create_variations(req: VariationsRequest):
    """
    Generate background variations for a product image.
    Accepts base64 image, returns base64 variations.
    """
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(req.image_data)
        
        # Generate variations (returns list of base64 strings)
        variations = generate_variations_from_bytes(image_bytes, req.concept or "product photography")
        
        if not variations:
            raise HTTPException(status_code=500, detail="AI generation returned no images.")

        return VariationsResponse(
            success=True,
            variations=variations
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Keep the old endpoint for backward compatibility
from app.core.models import GenerationRequest, GenerationResponse
from app.core.ai_service import generate_variations
import os

@router.post("/variations-legacy", response_model=GenerationResponse)
async def create_variations_legacy(req: GenerationRequest):
    """Legacy endpoint that uses file paths."""
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