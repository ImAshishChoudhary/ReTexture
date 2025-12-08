from pydantic import BaseModel
from typing import List, Dict, Any

class ValidationRequest(BaseModel):
    canvas: str

class ValidationResponse(BaseModel):
    canvas: str
    issues: List[Dict[str, Any]]

class GenerationRequest(BaseModel):
    product_filename: str
    concept: str

class GenerationResponse(BaseModel):
    product_filename: str
    variations: List[str]