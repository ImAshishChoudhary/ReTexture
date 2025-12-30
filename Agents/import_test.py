print("Starting import test...")
import time
start = time.time()

print("Importing fastapi...")
from fastapi import FastAPI, File, UploadFile, HTTPException
print(f"Done in {time.time() - start:.2f}s")
start = time.time()

print("Importing cors...")
from fastapi.middleware.cors import CORSMiddleware
print(f"Done in {time.time() - start:.2f}s")
start = time.time()

print("Importing rembg...")
from rembg import remove
print(f"Done in {time.time() - start:.2f}s")
start = time.time()

print("Importing PIL...")
from PIL import Image
print(f"Done in {time.time() - start:.2f}s")
start = time.time()

print("All imports complete.")
