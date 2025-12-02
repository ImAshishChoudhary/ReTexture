# app/main.py
from fastapi import FastAPI
from app.api.routes import router as api_router

def create_app():
    app = FastAPI(title="AI Studio")
    app.include_router(api_router, prefix="/api")
    return app

app = create_app()
