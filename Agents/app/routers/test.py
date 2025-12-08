from fastapi import APIRouter

router = APIRouter(prefix="/test")

@router.post("")
async def validate() :
    pass