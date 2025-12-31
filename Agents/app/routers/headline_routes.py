"""
Headline Generator API Routes
Endpoints for AI-powered headline/subheading generation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

from ..services import headline_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/headline", tags=["headline"])

# Request Models
class KeywordSuggestionRequest(BaseModel):
    image_base64: str

class HeadlineGenerationRequest(BaseModel):
    image_base64: str
    design_id: Optional[str] = "default"
    campaign_type: Optional[str] = None
    user_keywords: Optional[List[str]] = None

class PlacementRequest(BaseModel):
    canvas_width: int
    canvas_height: int
    background_color: Optional[str] = "#1a1a1a"

# Response Models
class KeywordResponse(BaseModel):
    success: bool
    keywords: List[str]
    error: Optional[str] = None

class HeadlineItem(BaseModel):
    text: str
    confidence: float

class HeadlineResponse(BaseModel):
    success: bool
    headlines: List[HeadlineItem]
    error: Optional[str] = None

class SubheadingResponse(BaseModel):
    success: bool
    subheadings: List[HeadlineItem]
    error: Optional[str] = None

class PlacementPosition(BaseModel):
    x: int
    y: int
    fontSize: int
    align: str
    color: str

class PlacementResponse(BaseModel):
    headline: PlacementPosition
    subheading: PlacementPosition
    text_color: str


@router.post("/suggest-keywords", response_model=KeywordResponse)
async def suggest_keywords(request: KeywordSuggestionRequest):
    """
    Analyze product image and suggest relevant keywords.
    Like VS Code commit message suggestion.
    """
    logger.info("🔍 [HEADLINE API] POST /suggest-keywords")
    
    try:
        result = await headline_service.suggest_keywords(request.image_base64)
        
        return KeywordResponse(
            success=result.get("success", False),
            keywords=result.get("keywords", []),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"❌ [HEADLINE API] Keyword suggestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-headlines", response_model=HeadlineResponse)
async def generate_headlines(request: HeadlineGenerationRequest):
    """
    Generate 3 headline options based on product image.
    """
    logger.info("📝 [HEADLINE API] POST /generate-headlines")
    logger.info(f"  ↳ design_id: {request.design_id}")
    logger.info(f"  ↳ campaign_type: {request.campaign_type}")
    
    try:
        result = await headline_service.generate_headlines(
            image_base64=request.image_base64,
            design_id=request.design_id,
            campaign_type=request.campaign_type,
            user_keywords=request.user_keywords
        )
        
        # Check for rate limit error
        if not result.get("success") and "Rate limit" in result.get("error", ""):
            raise HTTPException(status_code=429, detail=result.get("error"))
        
        return HeadlineResponse(
            success=result.get("success", False),
            headlines=[HeadlineItem(**h) for h in result.get("headlines", [])],
            error=result.get("error")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [HEADLINE API] Headline generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-subheadings", response_model=SubheadingResponse)
async def generate_subheadings(request: HeadlineGenerationRequest):
    """
    Generate 3 subheading options based on product image.
    """
    logger.info("📝 [HEADLINE API] POST /generate-subheadings")
    logger.info(f"  ↳ design_id: {request.design_id}")
    logger.info(f"  ↳ campaign_type: {request.campaign_type}")
    
    try:
        result = await headline_service.generate_subheadings(
            image_base64=request.design_id,
            design_id=request.design_id,
            campaign_type=request.campaign_type,
            user_keywords=request.user_keywords
        )
        
        # Check for rate limit error
        if not result.get("success") and "Rate limit" in result.get("error", ""):
            raise HTTPException(status_code=429, detail=result.get("error"))
        
        return SubheadingResponse(
            success=result.get("success", False),
            subheadings=[HeadlineItem(**h) for h in result.get("subheadings", [])],
            error=result.get("error")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [HEADLINE API] Subheading generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate-placement", response_model=PlacementResponse)
async def calculate_placement(request: PlacementRequest):
    """
    Calculate optimal text placement for headline and subheading.
    """
    logger.info("📐 [HEADLINE API] POST /calculate-placement")
    logger.info(f"  ↳ canvas: {request.canvas_width}x{request.canvas_height}")
    
    try:
        placement = headline_service.calculate_optimal_placement(
            canvas_width=request.canvas_width,
            canvas_height=request.canvas_height
        )
        
        color_suggestion = headline_service.suggest_text_color(
            background_color=request.background_color
        )
        
        # Apply suggested color to placement
        placement["headline"]["color"] = color_suggestion["text_color"]
        placement["subheading"]["color"] = color_suggestion["text_color"]
        
        return PlacementResponse(
            headline=PlacementPosition(**placement["headline"]),
            subheading=PlacementPosition(**placement["subheading"]),
            text_color=color_suggestion["text_color"]
        )
    except Exception as e:
        logger.error(f"❌ [HEADLINE API] Placement calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check for headline service"""
    return {"status": "healthy", "service": "headline-generator"}
