from fastapi import APIRouter, File, UploadFile, HTTPException, Body
from pydantic import BaseModel
import uuid
from pathlib import Path
from rembg import remove
import base64

router = APIRouter(prefix="/remove-bg")

class RemoveBgRequest(BaseModel):
    file_path: str

@router.post("")
async def remove_background(
    file: UploadFile = File(None),
    request: RemoveBgRequest = Body(None)
):
    """
    Remove background from image.
    Supports both file upload and file path input.
    Returns base64 encoded PNG image.
    """
    try:
        # Handle file path input (from Backend controller)
        if request and request.file_path:
            with open(request.file_path, "rb") as f:
                input_data = f.read()
        # Handle direct file upload
        elif file:
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="File must be an image")
            input_data = await file.read()
        else:
            raise HTTPException(status_code=400, detail="Either file or file_path must be provided")
        
        # Remove background using rembg
        output_data = remove(input_data)
        
        # Encode to base64
        base64_image = base64.b64encode(output_data).decode('utf-8')
        
        return {
            "success": True,
            "image_data": base64_image,
            "format": "png"
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

