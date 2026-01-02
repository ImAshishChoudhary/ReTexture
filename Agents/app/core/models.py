from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ValidationRequest(BaseModel):
    canvas: str

class ComplianceReport(BaseModel):
    compliant: bool
    warnings: List[str] = []
    rules_enforced: List[str] = []
    issues: List[Dict[str, Any]] = []

class ValidationResponse(BaseModel):
    canvas: str  # corrected canvas HTML/CSS
    compliant: bool
    issues: List[Dict[str, Any]]
    suggestions: List[str] = []

class GenerationRequest(BaseModel):
    product_filename: str
    concept: str
    style: Optional[str] = "studio"
    headline: Optional[str] = None
    subhead: Optional[str] = None
    text_color: Optional[str] = None
    logo_position: Optional[str] = "bottom-right"
    value_tile: Optional[str] = None  # "new", "white", "clubcard"
    value_tile_price: Optional[str] = None
    value_tile_end_date: Optional[str] = None
    is_alcohol: bool = False

class GenerationResponse(BaseModel):
    image_data_url: str
    compliance_report: ComplianceReport