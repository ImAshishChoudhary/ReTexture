from fastapi import APIRouter, File, UploadFile, HTTPException
import uuid
from pathlib import Path
from rembg import remove

router = APIRouter(prefix="/remove-bg")

@router.post("")
async def remove_background(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    base_dir = Path(__file__).resolve().parent.parent
    static_folder = base_dir / "static"
    processed_folder = static_folder / "processed"
    processed_folder.mkdir(parents=True, exist_ok=True)
    
    output_filename = f"{uuid.uuid4()}.png"
    output_path = processed_folder / output_filename
    
    try:
        input_data = await file.read()
        output_data = remove(input_data)
        
        with open(output_path, "wb") as f:
            f.write(output_data)
        
        return {"filename": output_filename, "path": f"static/processed/{output_filename}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
