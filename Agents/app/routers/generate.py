from fastapi import APIRouter, HTTPException
from app.core.models import GenerationRequest, GenerationResponse
from app.core.ai_service import generate_variations
import os

router = APIRouter(prefix="/generate")

@router.post("/variations", response_model=GenerationResponse)
async def create_variations(req: GenerationRequest):
    """
    Generates 3 unique composites. 
    Delegates all file finding logic to ai_service.py.
    """
    print(f"Received request for: {req.product_filename}") # Debug log

    try:
        # 1. Run AI Service (It handles finding the file in static/ or static/processed)
        # We pass just the filename, e.g., "test_product.png"
        file_paths = generate_variations(req.product_filename, req.concept)
        
        if not file_paths:
            raise HTTPException(status_code=500, detail="AI generation returned no images.")

        # 2. Convert file paths to Frontend URLs
        # ai_service returns paths like "static/output/var_123.png"
        # We convert them to "/static/output/var_123.png"
        urls = [f"/{p.replace(os.sep, '/')}" for p in file_paths]

        return GenerationResponse(
            product_filename=req.product_filename,
            variations=urls
        )

    except FileNotFoundError as e:
        # This catches the specific error from ai_service if the file is truly missing
        raise HTTPException(status_code=404, detail=str(e))
        
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))