from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routers.validate import router as validate_router
from app.agents.builder import init_agent
from app.routers.test import router as test_router
from app.routers import validate, generate 
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_agent()
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(validate_router)
app.include_router(test_router)
app.include_router(generate.router) # Register it here