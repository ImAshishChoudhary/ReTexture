import uuid
import io
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

load_dotenv()

# Get GCP credentials from environment variables
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "firstproject-c5ac2")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
# Try gemini-2.5-flash-image for image generation
MODEL_ID = os.getenv("GEMINI_MODEL_ID", "gemini-2.5-flash-image")

# Tesco Retail Media Compliance Rules - Applied to all AI generations
TESCO_COMPLIANCE_SUFFIX = """

=== TESCO RETAIL MEDIA COMPLIANCE (MANDATORY) ===
Layout Rules:
- Leave top 100px relatively clear for headline text overlay
- Leave bottom 150px relatively clear for Tesco tag, logo, and value tile placement
- Center the product with breathing room on all sides

Hard Restrictions - Absolutely NO:
- Text, words, letters, typography, numbers, or any written content
- Logos, watermarks, symbols, brand marks, or trademarks  
- People, faces, human figures, hands, or body parts
- Offensive, controversial, or non-brand-safe imagery
- Distortions or modifications to the original product
- Cluttered backgrounds that compete with the product

Brand Safety:
- Professional, family-friendly, premium retail aesthetic
- Background should complement, never overpower the product
- Maintain natural, realistic product appearance
"""


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
        # STUDIO - Clean e-commerce style
        f"""Professional e-commerce product photography of the provided product.
Background: Seamless pure white cyclorama studio backdrop, subtle gradient shadow beneath product.
Lighting: Three-point studio lighting setup - key light (softbox 45° left), fill light (right), hair light (top-back). 
Natural light falloff, no harsh highlights.
Camera: Shot on Canon EOS R5, 100mm macro lens, f/8, 1/160s, ISO 100.
Style: Clean, minimal, {user_concept}. Editorial quality suitable for Tesco retail website.
Realism: Natural product texture preserved, subtle surface imperfections visible, realistic reflections on glossy surfaces.
{TESCO_COMPLIANCE_SUFFIX}""",
        # LIFESTYLE - Contextual setting  
        f"""High-end lifestyle product photography featuring the provided product.
Scene: {user_concept} - Product naturally placed in an aspirational real-world setting, 
slightly asymmetric composition for organic feel.
Lighting: Natural window light from left side, golden hour warmth (5500K-6000K color temperature),
soft shadows with natural falloff, subtle rim light from window reflection.
Camera: Shot on Sony A7R IV, 35mm prime lens, f/2.8 for shallow depth of field, ISO 200.
Bokeh on background elements, foreground product tack-sharp.
Style: Editorial magazine quality, authentic lifestyle moment, premium brand aesthetic.
Realism: Environmental reflections on product, natural dust particles in light rays, 
micro-scratches on surfaces, realistic fabric textures.
{TESCO_COMPLIANCE_SUFFIX}""",
        # CREATIVE - Bold advertising
        f"""Bold commercial advertising campaign photography of the provided product.
Scene: Dramatic studio setup with colored gel lighting, {user_concept}.
Background: Deep gradient backdrop (dark to darker), professional studio environment.
Lighting: Cinematic three-point lighting with colored gels - teal/orange complementary scheme,
strong key light (grid softbox left), subtle fill, dramatic rim light creating edge separation.
Light falloff creating depth and dimension. Volumetric light haze optional.
Camera: Shot on Hasselblad H6D-100c, 80mm f/2.8 lens, medium format quality.
Shallow DOF with product sharp, slight motion blur on any floating elements.
Style: Premium advertising campaign, {user_concept}, brand hero shot quality.
Realism: Product surface catching colored light realistically, specular highlights on edges,
natural material properties (metal reflects, matte absorbs), subtle lens flare if applicable.
{TESCO_COMPLIANCE_SUFFIX}"""
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

            if response.candidates:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if part.inline_data:
                            output_filename = f"var_{uuid.uuid4()}.png"
                            output_dir = static_folder / "output"
                            output_dir.mkdir(parents=True, exist_ok=True)
                            
                            out_path = output_dir / output_filename
                            part.as_image().save(out_path)
                            
                            generated_files.append(f"static/output/{output_filename}")
                            break
            
        except Exception as e:
            print(f"Error generating variation: {e}")
            continue

    return generated_files


def generate_variations_from_bytes(image_bytes: bytes, user_concept: str) -> list[str]:
    """
    Generate background variations from raw image bytes.
    Returns list of base64 encoded PNG images.
    """
    import base64
    
    print("=" * 60)
    print("[AI_SERVICE DEBUG] generate_variations_from_bytes called")
    print("=" * 60)
    print(f"[AI_SERVICE DEBUG] Input image bytes: {len(image_bytes)} bytes")
    print(f"[AI_SERVICE DEBUG] User concept: {user_concept}")
    
    # Process input image
    print("[AI_SERVICE DEBUG] Opening and processing input image...")
    with Image.open(io.BytesIO(image_bytes)) as img:
        print(f"[AI_SERVICE DEBUG] Original image mode: {img.mode}, size: {img.size}")
        if img.mode != 'RGB':
            img = img.convert('RGB')
            print(f"[AI_SERVICE DEBUG] Converted to RGB mode")
        
        img.thumbnail((1024, 1024))
        print(f"[AI_SERVICE DEBUG] Resized to: {img.size}")
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        product_bytes = img_byte_arr.getvalue()
        print(f"[AI_SERVICE DEBUG] Processed image bytes: {len(product_bytes)} bytes")

    print("[AI_SERVICE DEBUG] Initializing Gemini client...")
    print(f"[AI_SERVICE DEBUG] PROJECT_ID: {PROJECT_ID}")
    print(f"[AI_SERVICE DEBUG] LOCATION: {LOCATION}")
    print(f"[AI_SERVICE DEBUG] MODEL_ID: {MODEL_ID}")
    
    client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION,
    )
    print("[AI_SERVICE DEBUG] Gemini client initialized successfully")

    styles = [
        # STUDIO - Clean e-commerce style
        f"""Professional e-commerce product photography of the provided product.
Background: Seamless pure white cyclorama studio backdrop, subtle gradient shadow beneath product.
Lighting: Three-point studio lighting setup - key light (softbox 45° left), fill light (right), hair light (top-back). 
Natural light falloff, no harsh highlights.
Camera: Shot on Canon EOS R5, 100mm macro lens, f/8, 1/160s, ISO 100.
Style: Clean, minimal, {user_concept}. Editorial quality suitable for Tesco retail website.
Realism: Natural product texture preserved, subtle surface imperfections visible, realistic reflections on glossy surfaces.
{TESCO_COMPLIANCE_SUFFIX}""",
        # LIFESTYLE - Contextual setting  
        f"""High-end lifestyle product photography featuring the provided product.
Scene: {user_concept} - Product naturally placed in an aspirational real-world setting, 
slightly asymmetric composition for organic feel.
Lighting: Natural window light from left side, golden hour warmth (5500K-6000K color temperature),
soft shadows with natural falloff, subtle rim light from window reflection.
Camera: Shot on Sony A7R IV, 35mm prime lens, f/2.8 for shallow depth of field, ISO 200.
Bokeh on background elements, foreground product tack-sharp.
Style: Editorial magazine quality, authentic lifestyle moment, premium brand aesthetic.
Realism: Environmental reflections on product, natural dust particles in light rays, 
micro-scratches on surfaces, realistic fabric textures.
{TESCO_COMPLIANCE_SUFFIX}""",
        # CREATIVE - Bold advertising
        f"""Bold commercial advertising campaign photography of the provided product.
Scene: Dramatic studio setup with colored gel lighting, {user_concept}.
Background: Deep gradient backdrop (dark to darker), professional studio environment.
Lighting: Cinematic three-point lighting with colored gels - teal/orange complementary scheme,
strong key light (grid softbox left), subtle fill, dramatic rim light creating edge separation.
Light falloff creating depth and dimension. Volumetric light haze optional.
Camera: Shot on Hasselblad H6D-100c, 80mm f/2.8 lens, medium format quality.
Shallow DOF with product sharp, slight motion blur on any floating elements.
Style: Premium advertising campaign, {user_concept}, brand hero shot quality.
Realism: Product surface catching colored light realistically, specular highlights on edges,
natural material properties (metal reflects, matte absorbs), subtle lens flare if applicable.
{TESCO_COMPLIANCE_SUFFIX}"""
    ]

    generated_base64 = []
    print(f"[AI_SERVICE DEBUG] Will generate {len(styles)} variations")
    print("-" * 60)

    for i, style_prompt in enumerate(styles):
        variation_num = i + 1
        
        # Add delay between requests to avoid rate limiting (except for first request)
        if i > 0:
            delay_seconds = 5
            print(f"[AI_SERVICE DEBUG] Waiting {delay_seconds}s before next request (rate limit protection)...")
            time.sleep(delay_seconds)
        
        print(f"\n[AI_SERVICE DEBUG] === VARIATION {variation_num}/{len(styles)} ===")
        print(f"[AI_SERVICE DEBUG] Style: {style_prompt[:80]}...")
        
        # Retry logic with exponential backoff for rate limiting
        max_retries = 3
        base_delay = 10  # Start with 10 seconds
        
        for retry in range(max_retries):
            try:
                full_prompt = f"""
                Keep the product in the input image EXACTLY unchanged.
                Generate a new background: {style_prompt}
                High realism, commercial photography.
                """
                print(f"[AI_SERVICE DEBUG] Sending request to Gemini API... (attempt {retry + 1}/{max_retries})")

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
                
                print(f"[AI_SERVICE DEBUG] Response received from Gemini")
                print(f"[AI_SERVICE DEBUG] Response has parts: {bool(response.parts)}")
                
                if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                    parts = response.candidates[0].content.parts
                    print(f"[AI_SERVICE DEBUG] Number of parts: {len(parts)}")
                    for j, part in enumerate(parts):
                        print(f"[AI_SERVICE DEBUG] Part {j+1}: has inline_data = {bool(part.inline_data)}")
                        if part.inline_data:
                            # Convert to base64 instead of saving to file
                            img_data = part.inline_data.data
                            print(f"[AI_SERVICE DEBUG] Image data size: {len(img_data)} bytes")
                            
                            base64_str = base64.b64encode(img_data).decode('utf-8')
                            print(f"[AI_SERVICE DEBUG] Base64 string length: {len(base64_str)} chars")
                            
                            generated_base64.append(base64_str)
                            print(f"[AI_SERVICE DEBUG] ✅ VARIATION {variation_num} GENERATED SUCCESSFULLY!")
                            print(f"[AI_SERVICE DEBUG] Total variations so far: {len(generated_base64)}")
                            break
                else:
                    print(f"[AI_SERVICE DEBUG] ⚠️ No parts/candidates in response for variation {variation_num}")
                
                # Success - break out of retry loop
                break
                
            except Exception as e:
                error_msg = str(e)
                is_rate_limit = "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg
                
                print(f"[AI_SERVICE DEBUG] ❌ ERROR generating variation {variation_num} (attempt {retry + 1}):")
                print(f"[AI_SERVICE DEBUG] Error type: {type(e).__name__}")
                print(f"[AI_SERVICE DEBUG] Error message: {e}")
                
                if is_rate_limit and retry < max_retries - 1:
                    # Exponential backoff: 10s, 20s, 40s
                    wait_time = base_delay * (2 ** retry)
                    print(f"[AI_SERVICE DEBUG] 🔄 Rate limit hit! Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    import traceback
                    print(f"[AI_SERVICE DEBUG] Traceback:\n{traceback.format_exc()}")
                    break

    print("\n" + "=" * 60)
    print(f"[AI_SERVICE DEBUG] GENERATION COMPLETE")
    print(f"[AI_SERVICE DEBUG] Total variations generated: {len(generated_base64)}")
    for i, b64 in enumerate(generated_base64):
        print(f"[AI_SERVICE DEBUG] Variation {i+1}: {len(b64)} chars")
    print("=" * 60)
    
    return generated_base64


def generate_single_variation(image_bytes: bytes, user_concept: str, style: str = "studio") -> str | None:
    """
    Generate a single background variation for SSE streaming.
    Returns base64 encoded image immediately.
    
    Args:
        image_bytes: Raw image bytes
        user_concept: User's concept/description
        style: One of 'studio', 'lifestyle', 'creative'
    
    Returns:
        Base64 encoded PNG image string, or None on failure
    """
    import base64
    
    print(f"\n[AI_SERVICE DEBUG] generate_single_variation called")
    print(f"[AI_SERVICE DEBUG] Style: {style}")
    print(f"[AI_SERVICE DEBUG] Concept: {user_concept}")
    
    # Process input image
    with Image.open(io.BytesIO(image_bytes)) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img.thumbnail((1024, 1024))
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        product_bytes = img_byte_arr.getvalue()
    
    # Initialize client with API key (not Vertex AI)
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("[AI_SERVICE DEBUG] ❌ No GOOGLE_API_KEY found in environment")
        return None
    
    client = genai.Client(api_key=api_key)
    
    # Style prompts
    style_prompts = {
        "studio": f"""Professional e-commerce product photography of the provided product.
Background: Seamless pure white cyclorama studio backdrop, subtle gradient shadow beneath product.
Lighting: Three-point studio lighting setup - key light (softbox 45° left), fill light (right), hair light (top-back). 
Natural light falloff, no harsh highlights.
Camera: Shot on Canon EOS R5, 100mm macro lens, f/8, 1/160s, ISO 100.
Style: Clean, minimal, {user_concept}. Editorial quality suitable for Tesco retail website.
Realism: Natural product texture preserved, subtle surface imperfections visible, realistic reflections on glossy surfaces.
{TESCO_COMPLIANCE_SUFFIX}""",
        "lifestyle": f"""High-end lifestyle product photography featuring the provided product.
Scene: {user_concept} - Product naturally placed in an aspirational real-world setting, 
slightly asymmetric composition for organic feel.
Lighting: Natural window light from left side, golden hour warmth (5500K-6000K color temperature),
soft shadows with natural falloff, subtle rim light from window reflection.
Camera: Shot on Sony A7R IV, 35mm prime lens, f/2.8 for shallow depth of field, ISO 200.
Bokeh on background elements, foreground product tack-sharp.
Style: Editorial magazine quality, authentic lifestyle moment, premium brand aesthetic.
Realism: Environmental reflections on product, natural dust particles in light rays, 
micro-scratches on surfaces, realistic fabric textures.
{TESCO_COMPLIANCE_SUFFIX}""",
        "creative": f"""Bold commercial advertising campaign photography of the provided product.
Scene: Dramatic studio setup with colored gel lighting, {user_concept}.
Background: Deep gradient backdrop (dark to darker), professional studio environment.
Lighting: Cinematic three-point lighting with colored gels - teal/orange complementary scheme,
strong key light (grid softbox left), subtle fill, dramatic rim light creating edge separation.
Light falloff creating depth and dimension. Volumetric light haze optional.
Camera: Shot on Hasselblad H6D-100c, 80mm f/2.8 lens, medium format quality.
Shallow DOF with product sharp, slight motion blur on any floating elements.
Style: Premium advertising campaign, {user_concept}, brand hero shot quality.
Realism: Product surface catching colored light realistically, specular highlights on edges,
natural material properties (metal reflects, matte absorbs), subtle lens flare if applicable.
{TESCO_COMPLIANCE_SUFFIX}"""
    }
    
    style_prompt = style_prompts.get(style, style_prompts["studio"])
    
    try:
        full_prompt = f"""
        Keep the product in the input image EXACTLY unchanged.
        Generate a new background: {style_prompt}
        High realism, commercial photography.
        Output a square 1:1 aspect ratio image.
        """
        
        print(f"[AI_SERVICE DEBUG] Calling Gemini API for {style} style...")
        
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
            ),
        )
        
        # Debug: Print full response structure
        print(f"[AI_SERVICE DEBUG] Response type: {type(response)}")
        print(f"[AI_SERVICE DEBUG] Response candidates: {len(response.candidates) if response.candidates else 0}")
        
        if response.candidates:
            for i, candidate in enumerate(response.candidates):
                print(f"[AI_SERVICE DEBUG] Candidate {i}: {candidate}")
                if hasattr(candidate, 'content') and candidate.content:
                    print(f"[AI_SERVICE DEBUG] Candidate {i} content parts: {len(candidate.content.parts) if candidate.content.parts else 0}")
                    for j, part in enumerate(candidate.content.parts):
                        print(f"[AI_SERVICE DEBUG] Part {j}: type={type(part)}, has_inline_data={hasattr(part, 'inline_data')}")
                        if hasattr(part, 'inline_data') and part.inline_data:
                            image_data = part.inline_data.data
                            base64_image = base64.b64encode(image_data).decode('utf-8')
                            print(f"[AI_SERVICE DEBUG] ✅ {style} variation generated: {len(base64_image)} chars")
                            return base64_image
                        elif hasattr(part, 'text'):
                            print(f"[AI_SERVICE DEBUG] Part {j} has text: {part.text[:100] if part.text else 'None'}...")
        
        # Fallback: Check response.parts directly
        if response.parts:
            print(f"[AI_SERVICE DEBUG] response.parts count: {len(response.parts)}")
            for i, part in enumerate(response.parts):
                print(f"[AI_SERVICE DEBUG] Direct part {i}: type={type(part)}")
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_data = part.inline_data.data
                    base64_image = base64.b64encode(image_data).decode('utf-8')
                    print(f"[AI_SERVICE DEBUG] ✅ {style} variation generated: {len(base64_image)} chars")
                    return base64_image
        
        print(f"[AI_SERVICE DEBUG] ❌ No image in response for {style}")
        return None
        
    except Exception as e:
        print(f"[AI_SERVICE DEBUG] ❌ Error generating {style}: {e}")
        import traceback
        print(f"[AI_SERVICE DEBUG] Traceback:\n{traceback.format_exc()}")
        return None