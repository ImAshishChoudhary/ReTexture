# src/adaptive_canvas_ai/schemas.py
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: int; y: int; width: int; height: int

class Layer(BaseModel):
    id: str
    type: Literal["text", "image", "shape", "background"]
    content: str
    bbox: BoundingBox
    font_size: Optional[int] = None
    color: Optional[str] = "#000000"
    z_index: int = 0

class ProductMetadata(BaseModel):
    category: str = Field(description="e.g., 'Soda', 'Alcohol', 'Snack'")
    brand_name: str
    is_alcohol: bool
    dominant_colors: List[str] = []
    suggested_background_prompt: str = Field(description="A prompt for SDXL")

class ComplianceStatus(BaseModel):
    status: Literal["pending", "pass", "fail", "warning"] = "pending"
    violations: List[str] = []

class CreativeSpec(BaseModel):
    request_id: str
    # NEW: Format Toggle
    format: Literal["9:16", "1:1", "4:5"] = "9:16" 
    creative_size: tuple[int, int] = (1080, 1920)
    layers: List[Layer] = []
    compliance: ComplianceStatus = Field(default_factory=ComplianceStatus)
    product_metadata: Optional[ProductMetadata] = None