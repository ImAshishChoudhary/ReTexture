from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api import router
import os

app = FastAPI(title="Ad Generator API")

# Ensure directories exist (double check)
os.makedirs("./static/uploads", exist_ok=True)
os.makedirs("./static/processed", exist_ok=True)

# Mount the static folder so images are accessible via URL
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include the routes
app.include_router(router)

@app.get("/")
def home():
    return {"message": "System is running. Go to /docs to test."}