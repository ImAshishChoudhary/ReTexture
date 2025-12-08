import os
import uuid
import io
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image  # Ensure you have 'pillow' installed: uv add pillow

load_dotenv()

# --- CONFIGURATION ---
PROJECT_ID = "firstproject-c5ac2"
LOCATION = "us-central1"
MODEL_ID = "gemini-2.5-flash-image" 

def generate_variations(product_filename: str, user_concept: str) -> list[str]:
    """
    1. Finds the image in the 'static' folder (robustly).
    2. Resizes it if it's too big (23MB is too big!).
    3. Sends it to Vertex AI for background generation.
    """
    
    # --- 1. ROBUST PATH FINDING ---
    # Finds 'Agents/static' regardless of where you run the command from
    base_dir = Path(__file__).resolve().parent.parent 
    static_folder = base_dir / "static"
    
    # Handle if user sent "static/image.png" or just "image.png"
    clean_name = Path(product_filename).name 
    input_path = static_folder / clean_name

    print(f"DEBUG: Looking for image at: {input_path}")
    
    if not input_path.exists():
        # This prints the EXACT path to your terminal so you can debug
        print(f"ERROR: File not found at {input_path}")
        raise FileNotFoundError(f"File missing at: {input_path}")

    # --- 2. RESIZE IMAGE (Crucial for 23MB files) ---
    print(f"DEBUG: Processing image size...")
    with Image.open(input_path) as img:
        # Convert to RGB to ensure compatibility
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Resize to max 1024x1024 (Gemini doesn't need 4k inputs for context)
        img.thumbnail((1024, 1024))
        
        # Save to memory buffer instead of disk
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        product_bytes = img_byte_arr.getvalue()
        
    print(f"DEBUG: Image prepared. Size: {len(product_bytes)/1024/1024:.2f} MB")

    # --- 3. CALL VERTEX AI ---
    print(f"DEBUG: Initializing Client for {PROJECT_ID}...")
    client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION,
    )

    styles = [
        f"Studio Photography: {user_concept}, minimal luxury background, softbox lighting, commercial product shot",
        f"Lifestyle Context: {user_concept} placed in a natural setting, morning sunlight, realistic shadows",
        f"Creative/Dramatic: {user_concept}, cinematic lighting, premium advertising style"
    ]

    generated_files = []

    for i, style_prompt in enumerate(styles):
        print(f"DEBUG: Generating variation {i+1}...")
        try:
            full_prompt = f"""
            Keep the product in the input image EXACTLY unchanged.
            Generate a new background: {style_prompt}
            High realism, commercial photography.
            """

            response = client.models.generate_content(
                model=MODEL_ID,
                contents=[
                    types.Part.from_text(text=full_prompt),
                    types.Part.from_bytes(
                        mime_type="image/png",
                        data=product_bytes,
                    ),
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio="1:1"),
                ),
            )

            # Extract Image
            if response.parts:
                for part in response.parts:
                    if part.inline_data:
                        # Save result
                        output_filename = f"var_{uuid.uuid4()}.png"
                        # Save strictly to 'static/output'
                        output_dir = static_folder / "output"
                        output_dir.mkdir(exist_ok=True)
                        
                        out_path = output_dir / output_filename
                        
                        part.as_image().save(out_path)
                        
                        # Return path relative to static for frontend
                        generated_files.append(f"static/output/{output_filename}")
                        print(f"DEBUG: Saved {out_path}")
                        break
            
        except Exception as e:
            print(f"ERROR on var {i+1}: {e}")
            continue

    return generated_files