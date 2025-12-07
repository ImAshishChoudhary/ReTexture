from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers.validate import router as validate_router
from app.agents.builder import init_agent
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_agent()
    yield

app = FastAPI(lifespan=lifespan)

backend_origin = os.getenv("BACKEND_ORIGIN", "http://localhost:3008")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[backend_origin, "http://localhost:3008"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(validate_router)