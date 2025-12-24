"""
FastAPI application for canvas compliance checking and background removal.
This module contains the routes and will run the FastAPI app.
No business logic should be here - it calls utils functions as needed.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import base64
from utils.compliance import check_compliance, validate_compliance_result

app = FastAPI(title="Agent Backend API", version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ComplianceRequest(BaseModel):
    canvas_html: str  # Base64 encoded HTML
    canvas_image: str  # Base64 encoded image


class BackgroundRemovalRequest(BaseModel):
    canvas_html: str  # Base64 encoded HTML
    canvas_image: str  # Base64 encoded image


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Agent Backend API", "version": "0.1.0"}


@app.post("/check_compliance")
async def check_compliance_endpoint(request: ComplianceRequest):
    """
    Check canvas compliance against rules using LLM-based analysis.

    Args:
        request: ComplianceRequest with base64 encoded canvas_html and canvas_image

    Returns:
        JSON response with compliance check results
    """
    try:
        # Call the compliance checking function
        result = check_compliance(request.canvas_html, request.canvas_image)

        # Validate and return the result
        return validate_compliance_result(result)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing compliance check: {str(e)}"
        )


@app.post("/remove_background")
async def remove_background(request: BackgroundRemovalRequest):
    """
    Remove background from canvas image.

    Args:
        request: BackgroundRemovalRequest with base64 encoded canvas_html and canvas_image

    Returns:
        JSON response with processed image
    """
    try:
        # Decode base64 data (for future processing)
        # html_content = base64.b64decode(request.canvas_html).decode('utf-8')
        # image_data = base64.b64decode(request.canvas_image)

        # Return fixed JSON response
        return {
            "status": "success",
            "message": "Background removed successfully",
            "processed_image": request.canvas_image,  # In real implementation, this would be the processed image
            "processing_details": {
                "original_size": "1920x1080",
                "processed_size": "1920x1080",
                "background_removed": True,
                "processing_time_ms": 1250,
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error removing background: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
