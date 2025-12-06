from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routers.validate import router as validate_router
from app.agents.builder import init_agent

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_agent()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(validate_router)