import io
from PIL import Image
from rembg import remove, new_session
from adaptive_canvas_ai.schemas import BoundingBox

# --- CRITICAL FIX: MEMORY OPTIMIZATION ---
# We initialize the session ONCE globally to avoid reloading the model.
# We use "u2netp" (Portable) instead of "u2net".
# This fixes the "bad allocation" / OOM error on laptops.
session = new_session("u2netp")

def process_packshot(image_bytes: bytes) -> dict:
    """
    1. Resizes huge images (to prevent OOM)
    2. Removes background using lightweight model
    3. Returns cleaned image bytes + Bounding Box
    """
    print("   ... 🖌️ Removing background (Lightweight Mode)...")
    
    # 1. Load Image
    original = Image.open(io.BytesIO(image_bytes))
    
    # 1.5 SAFETY: Resize if too big
    # If an image is huge (e.g. 4000x4000), it crashes local RAM during AI inference.
    # We cap it at 1080px, which is plenty for web/social ads.
    max_dim = 1080
    if original.width > max_dim or original.height > max_dim:
        original.thumbnail((max_dim, max_dim))
        print(f"   ⚠️ Resized huge image to fit memory: {original.size}")

    cleaned = remove(original, session=session)
    
    bbox = cleaned.getbbox() # Returns (left, upper, right, lower)
    
    if not bbox:
        # Fallback if image is empty
        return {
            "image": cleaned,
            "bbox": BoundingBox(x=0, y=0, width=original.width, height=original.height)
        }
    
    # Crop it tight
    cropped = cleaned.crop(bbox)
    
    # Calculate dimensions
    x, y, right, lower = bbox
    width = right - x
    height = lower - y
    
    return {
        "image": cropped,
        "bbox": BoundingBox(x=x, y=y, width=width, height=height)
    }