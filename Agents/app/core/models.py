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


# Auto-Fix Models
class ViolationInput(BaseModel):
    """Individual violation detected by frontend"""

    elementId: Optional[str] = None
    rule: str
    severity: str  # "hard" or "warning"
    message: str
    autoFixable: bool


class AutoFixRequest(BaseModel):
    """Request for AI-powered compliance auto-fix"""

    html: str
    css: str
    images: Dict[str, str]  # {placeholder_id: base64_data_url}
    violations: List[ViolationInput]
    canvas_width: int = 1080
    canvas_height: int = 1920


class FixApplied(BaseModel):
    """Individual fix applied by LLM"""

    rule: str
    elementId: Optional[str] = None
    element_selector: Optional[str] = None  # CSS selector or class name
    property: str  # e.g., "fontSize", "y", "color"
    old_value: Optional[str] = None
    new_value: str
    description: str


class AutoFixResponse(BaseModel):
    """Response with corrected HTML and metadata"""

    success: bool
    corrected_html: str
    corrected_css: str
    fixes_applied: List[FixApplied]
    remaining_violations: List[str] = []  # Issues that couldn't be auto-fixed
    llm_iterations: int  # Number of LLM retry attempts
    error: Optional[str] = None
