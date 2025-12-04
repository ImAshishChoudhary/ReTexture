import os
import time
import json
from typing import Literal, Optional, Dict
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

class TescoBackgroundGenerator:
    """
    A First-Principles Generator that solves Geometry, Lighting, and Context 
    independently before fusing them into a final image.
    """
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("❌ GOOGLE_API_KEY not found in .env")
        
        # Initialize the client (New SDK)
        self.client = genai.Client(api_key=self.api_key)

    # =========================================================================
    # 🧩 SUB-PROBLEM 1: GEOMETRY & PERSPECTIVE
    # Determine the camera angle so the floor/table matches the product.
    # =========================================================================
    def _solve_geometry(self, img: Image.Image) -> str:
        print("   📐 Analyzing Geometry (Angle & Perspective)...")
        prompt = (
            "Analyze the camera angle of this product packshot strictly.\n"
            "Return JSON only: { \"angle\": \"Top-Down\" | \"Front-View\" }\n"
            "Rules:\n"
            "- If we see the top of the cap/lid prominently, it is likely Front-View High Angle.\n"
            "- If it looks like a map or 2D plan, it is Top-Down.\n"
            "- If it looks like a hero shot on a shelf, it is Front-View."
        )
        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[prompt, img],
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            data = json.loads(response.text)
            angle = data.get("angle", "Front-View")
            print(f"      ↳ Detected: {angle}")
            
            # Map physical angle to background keywords
            if angle == "Top-Down":
                return "Background Geometry: Flat lay surface, 90-degree camera angle looking straight down. No horizon line. The surface texture fills the entire frame flatly."
            else:
                return "Background Geometry: Eye-level perspective, distinct horizon line in the distance. Shallow depth of field (f/2.8). The product sits on a surface extending into a blurred background."
        except Exception as e:
            print(f"      ⚠️ Geometry solver failed: {e}")
            return "Background Geometry: Front view, blurred background."

    # =========================================================================
    # 💡 SUB-PROBLEM 2: LIGHTING PHYSICS
    # Analyze the product's shadows/highlights to match the environment light.
    # =========================================================================
    def _solve_lighting(self, img: Image.Image) -> str:
        print("   💡 Analyzing Lighting Physics (Direction & Temp)...")
        prompt = (
            "Act as a Gaffer. Analyze the lighting on this product.\n"
            "Return JSON only: { \"direction\": \"Left\"|\"Right\"|\"Top\"|\"Front\", \"quality\": \"Soft\"|\"Hard\", \"temp\": \"Warm\"|\"Cool\" }"
        )
        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[prompt, img],
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            data = json.loads(response.text)
            print(f"      ↳ Detected: {data}")
            
            return (
                f"Lighting Match: Direction from {data.get('direction', 'Front')}. "
                f"Quality: {data.get('quality', 'Soft')} diffusion. "
                f"Color Temp: {data.get('temp', 'Neutral')} tones to match the product."
            )
        except Exception as e:
            print(f"      ⚠️ Lighting solver failed: {e}")
            return "Lighting Match: Soft studio lighting, neutral white balance."

    # =========================================================================
    # 🎨 SUB-PROBLEM 3: SEMANTIC CONTEXT (BRANDING)
    # Determine the texture/material based on the product vibe.
    # =========================================================================
    def _solve_semantics(self, base_prompt: str, category: str) -> str:
        print(f"   🎨 Solving Semantics for style: {category}...")
        
        # Tesco Design System Mapping
        styles = {
            "LEP": "Texture: Pure white infinite background #FFFFFF. Zero texture. High key.",
            "LIFESTYLE": "Texture: Rustic light oak wooden countertop. Natural, warm, home kitchen vibe. Highly detailed wood grain.",
            "PREMIUM": "Texture: White Carrara marble surface with subtle grey veining. Luxury, cold, clean, stone texture.",
            "GENERIC": "Texture: Clean white laminate shelf in a blurred supermarket aisle context."
        }
        
        selected_style = styles.get(category, styles["GENERIC"])
        return f"Semantic Context: {selected_style} Subject: {base_prompt}."

    # =========================================================================
    # 🛑 SUB-PROBLEM 4: COMPOSITION & SAFE ZONES
    # Physically reserve pixels for the UI overlays.
    # =========================================================================
    def _solve_composition(self, aspect_ratio: str) -> str:
        """
        Dynamically adjusts safe zones based on the output shape.
        """
        if aspect_ratio == "9:16":
            # STRICT TESCO GUIDELINES for Stories
            return (
                "Composition Constraint: NEGATIVE SPACE is mandatory. "
                "The top 20% and bottom 25% of the image must be empty/uniform texture (Safe Zones). "
                "No distinct objects or clutter in the top or bottom thirds."
            )
        else:
            # 1:1 SQUARE (Feed) - Standard Central Composition
            return (
                "Composition Constraint: Central composition. "
                "Keep the subject area in the middle. "
                "Ensure even margins on all sides. Balanced framing."
            )

    # =========================================================================
    # 🚀 MASTER FUSION
    # Combine all solved sub-problems into the final generation.
    # =========================================================================
    def generate(self, 
                 base_prompt: str, 
                 width: int, 
                 height: int, 
                 style_category: Literal["LEP", "LIFESTYLE", "PREMIUM"] = "LIFESTYLE",
                 image_bytes: Optional[bytes] = None) -> str:
        
        print(f"🚀 Starting First-Principles Generation for '{base_prompt}' ({width}x{height})")
        
        # 0. Determine Aspect Ratio (Geometry)
        aspect_ratio = "9:16"
        if width == height: aspect_ratio = "1:1"
        elif width > height: aspect_ratio = "16:9"
        
        # 1. Initialize Solvers
        geometry_prompt = ""
        lighting_prompt = ""
        
        # 2. Run Vision Solvers (if image provided)
        if image_bytes:
            img = Image.open(BytesIO(image_bytes))
            geometry_prompt = self._solve_geometry(img)
            lighting_prompt = self._solve_lighting(img)
        
        # 3. Run Logic Solvers
        semantic_prompt = self._solve_semantics(base_prompt, style_category)
        composition_prompt = self._solve_composition(aspect_ratio)

        # 4. Fusion: Construct the Master Prompt
        master_prompt = (
            f"{semantic_prompt} "
            f"{geometry_prompt} "
            f"{lighting_prompt} "
            f"{composition_prompt} "
            "Quality: 8k, photorealistic, octane render, commercial product photography."
        )

        print(f"   ✨ Master Prompt Constructed: {master_prompt[:100]}...")

        # 5. Execute Generation (Gemini 2.5 Flash Image)
        try:
            print("   🖌️  Rendering Image...")
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=master_prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio=aspect_ratio)
                )
            )

            # 6. Save Artifact
            filename = f"tesco_bg_{style_category}_{int(time.time())}.png"
            for part in response.parts:
                if part.inline_data:
                    with open(filename, "wb") as f:
                        f.write(part.inline_data.data)
                    
                    # Resize to exact pixels (since model output is fixed ratio)
                    with Image.open(filename) as img:
                        img = img.resize((width, height), Image.Resampling.LANCZOS)
                        img.save(filename)
                        
                    print(f"   ✅ Final Image Saved: {filename}")
                    return filename
            
            raise ValueError("No image data returned")

        except Exception as e:
            print(f"   ❌ Generation Failed: {e}")
            return "error.png"

# =========================================================================
# 🔄 COMPATIBILITY WRAPPER
# Allows importing `generate_background` directly like the old version.
# =========================================================================
def generate_background(prompt: str, width: int, height: int, image_bytes: Optional[bytes] = None) -> str:
    """
    Wrapper function to maintain backward compatibility.
    Instantiates the class and calls the generate method.
    """
    generator = TescoBackgroundGenerator()
    return generator.generate(
        base_prompt=prompt,
        width=width,
        height=height,
        style_category="LIFESTYLE", # Default style for legacy calls
        image_bytes=image_bytes
    )

# Example Usage
if __name__ == "__main__":
    generator = TescoBackgroundGenerator()
    
    # Test path
    test_image = "product_packshot.jpg"
    
    if os.path.exists(test_image):
        with open(test_image, "rb") as f:
            img_data = f.read()
        
        # Solves specific sub-problems for a 'Premium' look
        # UPDATED: 1024x1024 as requested
        generator.generate(
            base_prompt="A bottle of finest champagne",
            width=1024,
            height=1024,
            style_category="PREMIUM",
            image_bytes=img_data
        )
    else:
        print("ℹ️ Add 'product_packshot.jpg' to test the full pipeline.")