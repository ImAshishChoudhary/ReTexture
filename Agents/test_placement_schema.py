"""Test placement request schema validation"""
import json
from pydantic import BaseModel, ValidationError, Field, validator
from typing import List, Optional

class CanvasElement(BaseModel):
    id: str
    type: str
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    text: Optional[str] = None
    
    @validator('x', 'y', 'width', 'height', pre=True)
    def coerce_to_float(cls, v):
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                raise ValueError(f"Cannot convert '{v}' to number")
        return v

class SubjectBounds(BaseModel):
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    
    @validator('x', 'y', 'width', 'height', pre=True)
    def coerce_to_float(cls, v):
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                raise ValueError(f"Cannot convert '{v}' to number")
        return v

class ElementToPlace(BaseModel):
    type: str = Field(..., min_length=1)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    
    @validator('width', 'height', pre=True)
    def coerce_to_float(cls, v):
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                raise ValueError(f"Cannot convert '{v}' to number")
        return v

class CanvasSize(BaseModel):
    w: float = Field(..., gt=0)
    h: float = Field(..., gt=0)
    
    @validator('w', 'h', pre=True)
    def coerce_to_float(cls, v):
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                raise ValueError(f"Cannot convert '{v}' to number")
        return v

class PlacementRequest(BaseModel):
    canvas_size: CanvasSize
    elements: List[CanvasElement] = Field(default_factory=list)
    element_to_place: ElementToPlace
    subject_bounds: Optional[SubjectBounds] = None
    image_base64: Optional[str] = None
    
    @validator('elements', pre=True)
    def ensure_list(cls, v):
        if v is None:
            return []
        return v

# Test 1: Valid payload
print("="*60)
print("TEST 1: Valid frontend payload")
print("="*60)
frontend_payload = {
    "canvas_size": {"w": 800, "h": 600},
    "elements": [
        {
            "id": "text-123",
            "type": "text",
            "x": 100,
            "y": 50,
            "width": 300,
            "height": 80,
            "text": "Headline"
        }
    ],
    "element_to_place": {
        "type": "subheading",
        "width": 400,
        "height": 60
    },
    "subject_bounds": {
        "x": 200,
        "y": 200,
        "width": 300,
        "height": 400
    }
}

try:
    request = PlacementRequest(**frontend_payload)
    print("✅ Validation SUCCESS!")
    print(f"Canvas: {request.canvas_size.w}x{request.canvas_size.h}")
except ValidationError as e:
    print("❌ Validation FAILED!")
    print(e)

# Test 2: String numbers (should coerce)
print("\n" + "="*60)
print("TEST 2: String numbers (should auto-convert)")
print("="*60)
string_payload = {
    "canvas_size": {"w": "800", "h": "600"},
    "elements": [],
    "element_to_place": {
        "type": "badge",
        "width": "150",
        "height": "150"
    }
}

try:
    request = PlacementRequest(**string_payload)
    print("✅ Validation SUCCESS! (String to float conversion worked)")
    print(f"Canvas: {request.canvas_size.w}x{request.canvas_size.h}")
except ValidationError as e:
    print("❌ Validation FAILED!")
    print(e)

# Test 3: Negative values (should fail)
print("\n" + "="*60)
print("TEST 3: Negative values (should FAIL)")
print("="*60)
bad_payload = {
    "canvas_size": {"w": 800, "h": -600},  # Negative height!
    "elements": [],
    "element_to_place": {
        "type": "badge",
        "width": 150,
        "height": 150
    }
}

try:
    request = PlacementRequest(**bad_payload)
    print("❌ Should have failed but didn't!")
except ValidationError as e:
    print("✅ Correctly REJECTED negative value!")
    print(f"Error: {e.errors()[0]['msg']}")

# Test 4: Missing required field
print("\n" + "="*60)
print("TEST 4: Missing required field (should FAIL)")
print("="*60)
missing_payload = {
    "canvas_size": {"w": 800},  # Missing 'h'!
    "elements": [],
    "element_to_place": {
        "type": "badge",
        "width": 150,
        "height": 150
    }
}

try:
    request = PlacementRequest(**missing_payload)
    print("❌ Should have failed but didn't!")
except ValidationError as e:
    print("✅ Correctly REJECTED missing field!")
    print(f"Error: {e.errors()[0]['msg']}")

print("\n" + "="*60)
print("All tests complete!")
print("="*60)
