import uuid
import io
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

load_dotenv()

PROJECT_ID = "firstproject-c5ac2"
LOCATION = "us-central1"
MODEL_ID = "gemini-2.5-flash-image"

def generate_variations(product_filename: str, user_concept: str) -> list[str]:
    base_dir = Path(__file__).resolve().parent.parent
    static_folder = base_dir / "static"
    clean_name = Path(product_filename).name
    input_path = static_folder / clean_name

    if not input_path.exists():
        raise FileNotFoundError(f"File not found: {input_path}")

    with Image.open(input_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img.thumbnail((1024, 1024))
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        product_bytes = img_byte_arr.getvalue()

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

            if response.parts:
                for part in response.parts:
                    if part.inline_data:
                        output_filename = f"var_{uuid.uuid4()}.png"
                        output_dir = static_folder / "output"
                        output_dir.mkdir(parents=True, exist_ok=True)
                        
                        out_path = output_dir / output_filename
                        part.as_image().save(out_path)
                        
                        generated_files.append(f"static/output/{output_filename}")
                        break
            
        except Exception as e:
            continue

    return generated_files