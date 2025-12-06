from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import uuid
from app.service import remove_background_service

router = APIRouter()

# Define paths relative to the project root
UPLOAD_DIR = "static/uploads"
PROCESSED_DIR = "static/processed"

@router.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...)):
    # 1. Validation
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 2. Prepare paths
    filename = f"{uuid.uuid4()}.png"
    input_path = os.path.join(UPLOAD_DIR, filename)
    output_path = os.path.join(PROCESSED_DIR, filename)

    # 3. Save Upload
    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not save file")

    # 4. Call Service
    success = remove_background_service(input_path, output_path)
    
    if not success:
        raise HTTPException(status_code=500, detail="Background removal failed")

    # 5. Return URLs
    return {
        "status": "success",
        "original_url": f"/static/uploads/{filename}",
        "processed_url": f"/static/processed/{filename}"
    }