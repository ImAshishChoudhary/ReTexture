from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.agents.builder import init_agent
from app.routers import validate, generate, remove_bg

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_agent()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(validate.router)
app.include_router(generate.router)
app.include_router(remove_bg.router)

