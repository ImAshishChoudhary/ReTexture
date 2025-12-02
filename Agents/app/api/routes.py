# app/api/routes.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from app.agents.background_processors import remove_background_and_crop

router = APIRouter()

@router.post("/process-image/remove-background")
async def api_remove_background(file: UploadFile = File(...)):
    print("\n" + "=" * 60)
    print("[API] Received file upload request")
    print(f"[API] Filename: {file.filename}")
    print(f"[API] Content-type: {file.content_type}")
    print("=" * 60)

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        file_bytes = await file.read()

        processed_bytes = remove_background_and_crop(file_bytes)

        return Response(content=processed_bytes, media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
