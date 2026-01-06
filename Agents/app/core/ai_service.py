import uuid
import io
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

# Load .env from the Agents directory (parent of app/core)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
print(f"[AI_SERVICE] Loading .env from: {env_path}")
print(f"[AI_SERVICE] GOOGLE_API_KEY loaded: {'Yes' if os.getenv('GOOGLE_API_KEY') else 'No'}")

# Get GCP credentials from environment variables
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "firstproject-c5ac2")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
# Use gemini-2.0-flash-exp which supports image generation via response_modalities
MODEL_ID = os.getenv("GEMINI_MODEL_ID", "gemini-2.0-flash-exp")

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
    import gc
    import psutil
    import traceback
    from datetime import datetime
    
    start_time = datetime.now()
    
    def log_mem(stage):
        try:
            process = psutil.Process()
            mem_mb = process.memory_info().rss / 1024 / 1024
            print(f"[AI_SERVICE MEMORY] {stage}: {mem_mb:.2f} MB")
            return mem_mb
        except:
            return 0
    
    print("=" * 80)
    print(f"[AI_SERVICE DEBUG] generate_variations_from_bytes called at {start_time.isoformat()}")
    print("=" * 80)
    print(f"[AI_SERVICE DEBUG] Input parameters:")
    print(f"[AI_SERVICE DEBUG]   - Image bytes: {len(image_bytes)} bytes ({len(image_bytes)/1024:.1f} KB)")
    print(f"[AI_SERVICE DEBUG]   - User concept: '{user_concept}'")
    log_mem("Function start")
    
    # Process input image with reduced resolution to save memory
    print("[AI_SERVICE DEBUG] Step 1: Processing input image...")
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            print(f"[AI_SERVICE DEBUG]   - Original mode: {img.mode}")
            print(f"[AI_SERVICE DEBUG]   - Original size: {img.size} ({img.width}x{img.height})")
            print(f"[AI_SERVICE DEBUG]   - Original format: {img.format}")
            
            if img.mode != 'RGB':
                print(f"[AI_SERVICE DEBUG]   - Converting {img.mode} → RGB")
                img = img.convert('RGB')
            
            # Reduce from 1024x1024 to 768x768 to save memory
            original_size = img.size
            img.thumbnail((768, 768))
            print(f"[AI_SERVICE DEBUG]   - Resized: {original_size} → {img.size}")
            print(f"[AI_SERVICE DEBUG]   - Pixel reduction: {(1 - (img.width * img.height) / (original_size[0] * original_size[1])) * 100:.1f}%")
            log_mem("After image resize")
            
            img_byte_arr = io.BytesIO()
            # Use PNG optimization to reduce file size
            img.save(img_byte_arr, format='PNG', optimize=True)
            product_bytes = img_byte_arr.getvalue()
            print(f"[AI_SERVICE DEBUG]   - Processed size: {len(product_bytes)} bytes ({len(product_bytes)/1024:.1f} KB)")
            print(f"[AI_SERVICE DEBUG]   - Compression ratio: {len(product_bytes)/len(image_bytes)*100:.1f}%")
    except Exception as img_error:
        print(f"[AI_SERVICE DEBUG] ✗ Image processing failed:")
        print(f"[AI_SERVICE DEBUG]   - Error: {type(img_error).__name__}: {img_error}")
        print(f"[AI_SERVICE DEBUG] Traceback:")
        print(traceback.format_exc())
        return []
    
    # Clear byte array from memory
    img_byte_arr.close()
    del img_byte_arr
    gc.collect()
    log_mem("After cleanup")

    print("[AI_SERVICE DEBUG] Step 2: Initializing Gemini client...")
    print(f"[AI_SERVICE DEBUG]   - PROJECT_ID: {PROJECT_ID}")
    print(f"[AI_SERVICE DEBUG]   - LOCATION: {LOCATION}")
    print(f"[AI_SERVICE DEBUG]   - MODEL_ID: {MODEL_ID}")
    
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
        )
        print("[AI_SERVICE DEBUG] ✓ Gemini client initialized successfully")
        log_mem("After client init")
    except Exception as client_error:
        print(f"[AI_SERVICE DEBUG] ✗ Client initialization failed:")
        print(f"[AI_SERVICE DEBUG]   - Error: {type(client_error).__name__}: {client_error}")
        print(f"[AI_SERVICE DEBUG] Traceback:")
        print(traceback.format_exc())
        return []

    print("[AI_SERVICE DEBUG] Step 3: Preparing style prompts...")
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
    style_names = ["Studio", "Lifestyle", "Creative"]
    print(f"[AI_SERVICE DEBUG] Step 4: Generating {len(styles)} variations...")
    print(f"[AI_SERVICE DEBUG]   - Styles: {', '.join(style_names)}")
    print("-" * 80)

    for i, style_prompt in enumerate(styles):
        variation_num = i + 1
        variation_start = datetime.now()
        
        # Add delay between requests to avoid rate limiting (except for first request)
        if i > 0:
            delay_seconds = 5
            print(f"[AI_SERVICE DEBUG] Rate limit delay: waiting {delay_seconds}s...")
            time.sleep(delay_seconds)
        
        print(f"\n[AI_SERVICE DEBUG] === VARIATION {variation_num}/{len(styles)}: {style_names[i]} ===")
        print(f"[AI_SERVICE DEBUG] Started at: {variation_start.isoformat()}")
        print(f"[AI_SERVICE DEBUG] Style prompt: {style_prompt[:100]}...")
        log_mem(f"Before variation {variation_num}")
        
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
                print(f"[AI_SERVICE DEBUG] API call attempt {retry + 1}/{max_retries}")
                print(f"[AI_SERVICE DEBUG]   - Prompt length: {len(full_prompt)} chars")
                print(f"[AI_SERVICE DEBUG]   - Image data: {len(product_bytes)} bytes")
                
                api_call_start = datetime.now()
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
                
                api_call_time = (datetime.now() - api_call_start).total_seconds()
                print(f"[AI_SERVICE DEBUG] ✓ API responded in {api_call_time:.2f}s")
                print(f"[AI_SERVICE DEBUG] Response type: {type(response)}")
                print(f"[AI_SERVICE DEBUG] Has parts: {bool(response.parts)}")
                print(f"[AI_SERVICE DEBUG] Has candidates: {bool(response.candidates)}")
                log_mem(f"After API response {variation_num}")
                
                if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                    parts = response.candidates[0].content.parts
                    print(f"[AI_SERVICE DEBUG] Processing {len(parts)} part(s)")
                    
                    for j, part in enumerate(parts):
                        print(f"[AI_SERVICE DEBUG]   Part {j+1}:")
                        print(f"[AI_SERVICE DEBUG]     - Type: {type(part)}")
                        print(f"[AI_SERVICE DEBUG]     - Has inline_data: {bool(part.inline_data)}")
                        
                        if part.inline_data:
                            # Convert to base64 instead of saving to file
                            img_data = part.inline_data.data
                            data_size_kb = len(img_data) / 1024
                            print(f"[AI_SERVICE DEBUG]     - Raw image size: {data_size_kb:.1f} KB")
                            
                            encode_start = datetime.now()
                            base64_str = base64.b64encode(img_data).decode('utf-8')
                            encode_time = (datetime.now() - encode_start).total_seconds()
                            b64_size_kb = len(base64_str) / 1024
                            print(f"[AI_SERVICE DEBUG]     - Base64 size: {b64_size_kb:.1f} KB")
                            print(f"[AI_SERVICE DEBUG]     - Encoding time: {encode_time:.2f}s")
                            
                            generated_base64.append(base64_str)
                            
                            variation_time = (datetime.now() - variation_start).total_seconds()
                            print(f"[AI_SERVICE DEBUG] ✓✓✓ VARIATION {variation_num} ({style_names[i]}) COMPLETE!")
                            print(f"[AI_SERVICE DEBUG]     - Total time: {variation_time:.2f}s")
                            print(f"[AI_SERVICE DEBUG]     - Progress: {len(generated_base64)}/{len(styles)} complete")
                            
                            # Clear image data from memory immediately
                            del img_data
                            del base64_str
                            del part
                            gc.collect()
                            log_mem(f"After cleanup variation {variation_num}")
                            break
                else:
                    print(f"[AI_SERVICE DEBUG] ✗ No parts/candidates in response")
                    print(f"[AI_SERVICE DEBUG]   - response.candidates: {response.candidates if response.candidates else 'None'}")
                
                # Clear response from memory
                del response
                gc.collect()
                
                # Success - break out of retry loop
                break
                
            except Exception as e:
                error_msg = str(e)
                is_rate_limit = "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg
                
                print(f"[AI_SERVICE DEBUG] ✗ ERROR on variation {variation_num} (attempt {retry + 1}/{max_retries}):")
                print(f"[AI_SERVICE DEBUG]   - Error type: {type(e).__name__}")
                print(f"[AI_SERVICE DEBUG]   - Error message: {str(e)}")
                print(f"[AI_SERVICE DEBUG]   - Is rate limit: {is_rate_limit}")
                log_mem(f"Error on variation {variation_num}")
                
                if is_rate_limit and retry < max_retries - 1:
                    # Exponential backoff: 10s, 20s, 40s
                    wait_time = base_delay * (2 ** retry)
                    print(f"[AI_SERVICE DEBUG] 🔄 Rate limit detected, backing off {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"[AI_SERVICE DEBUG] Full traceback:")
                    print(traceback.format_exc())
                    log_mem(f"Final error variation {variation_num}")
                    break

    # Final summary
    total_time = (datetime.now() - start_time).total_seconds()
    print("\n" + "=" * 80)
    print(f"[AI_SERVICE DEBUG] ===== GENERATION SUMMARY =====")
    print(f"[AI_SERVICE DEBUG] Started:  {start_time.isoformat()}")
    print(f"[AI_SERVICE DEBUG] Finished: {datetime.now().isoformat()}")
    print(f"[AI_SERVICE DEBUG] Duration: {total_time:.2f}s ({total_time/60:.1f} min)")
    print(f"[AI_SERVICE DEBUG] Requested: {len(styles)} variations")
    print(f"[AI_SERVICE DEBUG] Generated: {len(generated_base64)} variations")
    print(f"[AI_SERVICE DEBUG] Success rate: {len(generated_base64)/len(styles)*100:.0f}%")
    
    if generated_base64:
        total_size = sum(len(b64) for b64 in generated_base64)
        avg_size = total_size / len(generated_base64)
        print(f"[AI_SERVICE DEBUG] Total data: {total_size/1024:.1f} KB")
        print(f"[AI_SERVICE DEBUG] Average size: {avg_size/1024:.1f} KB per variation")
        
        for i, b64 in enumerate(generated_base64):
            print(f"[AI_SERVICE DEBUG]   Variation {i+1} ({style_names[i]}): {len(b64)/1024:.1f} KB")
    else:
        print(f"[AI_SERVICE DEBUG] ⚠️ NO VARIATIONS GENERATED!")
        print(f"[AI_SERVICE DEBUG] Check:")
        print(f"[AI_SERVICE DEBUG]   - API key validity")
        print(f"[AI_SERVICE DEBUG]   - Network connectivity")
        print(f"[AI_SERVICE DEBUG]   - Gemini API quota")
        print(f"[AI_SERVICE DEBUG]   - Error messages above")
    
    log_mem("Function end")
    print("=" * 80)
    
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
    import gc
    import traceback
    import psutil
    from datetime import datetime
    
    start_time = datetime.now()
    print("\n" + "=" * 80)
    print(f"[AI_SERVICE SINGLE] generate_single_variation called at {start_time.isoformat()}")
    print(f"[AI_SERVICE SINGLE] Style: {style}")
    print(f"[AI_SERVICE SINGLE] Concept: {user_concept}")
    print(f"[AI_SERVICE SINGLE] Image bytes: {len(image_bytes)} ({len(image_bytes)/1024:.1f} KB)")
    
    try:
        process = psutil.Process()
        mem_mb = process.memory_info().rss / 1024 / 1024
        print(f"[AI_SERVICE SINGLE] Memory at start: {mem_mb:.2f} MB")
    except:
        pass
    
    # Process input image with reduced resolution to save memory
    print("[AI_SERVICE SINGLE] Step 1: Processing image...")
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            print(f"[AI_SERVICE SINGLE]   Original: {img.mode}, {img.size}")
            if img.mode != 'RGB':
                img = img.convert('RGB')
                print(f"[AI_SERVICE SINGLE]   Converted to RGB")
            # Reduce from 1024x1024 to 768x768 to save memory (40% less pixels)
            img.thumbnail((768, 768))
            print(f"[AI_SERVICE SINGLE]   Resized to: {img.size}")
            img_byte_arr = io.BytesIO()
            # Use PNG optimization to reduce file size
            img.save(img_byte_arr, format='PNG', optimize=True)
            product_bytes = img_byte_arr.getvalue()
            print(f"[AI_SERVICE SINGLE]   Processed: {len(product_bytes)} bytes ({len(product_bytes)/1024:.1f} KB)")
    except Exception as img_error:
        print(f"[AI_SERVICE SINGLE] ✗ Image processing failed: {img_error}")
        print(traceback.format_exc())
        return None
    
    # Clear byte array from memory
    img_byte_arr.close()
    del img_byte_arr
    gc.collect()
    
    # Initialize client with API key (not Vertex AI)
    print("[AI_SERVICE SINGLE] Step 2: Checking API key...")
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("[AI_SERVICE SINGLE] ✗✗✗ CRITICAL: No GOOGLE_API_KEY found in environment!")
        print("[AI_SERVICE SINGLE] Environment variables available:")
        for key in sorted(os.environ.keys()):
            if 'GOOGLE' in key.upper() or 'API' in key.upper() or 'KEY' in key.upper():
                print(f"[AI_SERVICE SINGLE]   - {key}: {'SET' if os.environ.get(key) else 'NOT SET'}")
        return None
    
    print(f"[AI_SERVICE SINGLE] ✓ API key found: {api_key[:10]}...{api_key[-5:]}")
    
    print("[AI_SERVICE SINGLE] Step 3: Initializing Gemini client...")
    try:
        client = genai.Client(api_key=api_key)
        print("[AI_SERVICE SINGLE] ✓ Client initialized successfully")
    except Exception as client_error:
        print(f"[AI_SERVICE SINGLE] ✗ Client initialization failed: {client_error}")
        print(traceback.format_exc())
        return None
    
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
    
    print("[AI_SERVICE SINGLE] Step 4: Preparing style prompt...")
    style_prompt = style_prompts.get(style, style_prompts["studio"])
    if not style_prompt:
        print(f"[AI_SERVICE SINGLE] ✗ Invalid style: {style}")
        return None
    print(f"[AI_SERVICE SINGLE] ✓ Prompt prepared ({len(style_prompt)} chars)")
    
    try:
        full_prompt = f"""
        Keep the product in the input image EXACTLY unchanged.
        Generate a new background: {style_prompt}
        High realism, commercial photography.
        Output a square 1:1 aspect ratio image.
        """
        
        print(f"[AI_SERVICE SINGLE] Step 5: Calling Gemini API...")
        print(f"[AI_SERVICE SINGLE]   Model: {MODEL_ID}")
        print(f"[AI_SERVICE SINGLE]   Prompt length: {len(full_prompt)} chars")
        print(f"[AI_SERVICE SINGLE]   Image size: {len(product_bytes)} bytes")
        
        api_start = datetime.now()
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
        
        api_time = (datetime.now() - api_start).total_seconds()
        print(f"[AI_SERVICE SINGLE] ✓ API responded in {api_time:.2f}s")
        
        # Debug: Print full response structure
        print(f"[AI_SERVICE SINGLE] Step 6: Processing response...")
        print(f"[AI_SERVICE SINGLE]   Response type: {type(response)}")
        print(f"[AI_SERVICE SINGLE]   Response dir: {[attr for attr in dir(response) if not attr.startswith('_')]}")
        print(f"[AI_SERVICE SINGLE]   Has candidates: {bool(hasattr(response, 'candidates') and response.candidates)}")
        print(f"[AI_SERVICE SINGLE]   Has parts: {bool(hasattr(response, 'parts') and response.parts)}")
        print(f"[AI_SERVICE SINGLE]   Has text: {bool(hasattr(response, 'text') and response.text)}")
        
        # Try response.text first (might contain base64)
        if hasattr(response, 'text') and response.text:
            print(f"[AI_SERVICE SINGLE]   Response.text length: {len(response.text)}")
            print(f"[AI_SERVICE SINGLE]   Response.text preview: {response.text[:200]}")
        
        if response.candidates:
            print(f"[AI_SERVICE SINGLE]   Candidates count: {len(response.candidates)}")
        
        if response.candidates:
            for i, candidate in enumerate(response.candidates):
                print(f"[AI_SERVICE SINGLE]   Candidate {i}:")
                if hasattr(candidate, 'content') and candidate.content:
                    parts_count = len(candidate.content.parts) if candidate.content.parts else 0
                    print(f"[AI_SERVICE SINGLE]     Has content with {parts_count} part(s)")
                    for j, part in enumerate(candidate.content.parts):
                        has_inline = hasattr(part, 'inline_data') and part.inline_data
                        has_text = hasattr(part, 'text') and part.text
                        print(f"[AI_SERVICE SINGLE]     Part {j}: inline_data={has_inline}, text={has_text}")
                        
                        if has_inline:
                            image_data = part.inline_data.data
                            data_size = len(image_data)
                            print(f"[AI_SERVICE SINGLE]     ✓ Image data found: {data_size} bytes ({data_size/1024:.1f} KB)")
                            
                            encode_start = datetime.now()
                            base64_image = base64.b64encode(image_data).decode('utf-8')
                            encode_time = (datetime.now() - encode_start).total_seconds()
                            b64_size = len(base64_image)
                            print(f"[AI_SERVICE SINGLE]     ✓ Encoded to base64: {b64_size} chars ({b64_size/1024:.1f} KB) in {encode_time:.2f}s")
                            
                            total_time = (datetime.now() - start_time).total_seconds()
                            print(f"[AI_SERVICE SINGLE] ✓✓✓ SUCCESS! {style} variation generated in {total_time:.2f}s")
                            print("=" * 80)
                            
                            # Clear image data from memory
                            del image_data
                            del part
                            gc.collect()
                            return base64_image
                        elif has_text:
                            text_preview = part.text[:100] if part.text else 'None'
                            print(f"[AI_SERVICE SINGLE]     Part {j} has text: {text_preview}...")
                else:
                    print(f"[AI_SERVICE SINGLE]     Candidate {i} has no content")
        
        # Fallback: Check response.parts directly
        print("[AI_SERVICE SINGLE] Checking response.parts directly...")
        if hasattr(response, 'parts') and response.parts:
            print(f"[AI_SERVICE SINGLE]   Found {len(response.parts)} part(s) in response.parts")
            for i, part in enumerate(response.parts):
                print(f"[AI_SERVICE SINGLE]   Part {i}: type={type(part)}")
                print(f"[AI_SERVICE SINGLE]   Part {i} attributes: {[attr for attr in dir(part) if not attr.startswith('_')]}")
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_data = part.inline_data.data
                    base64_image = base64.b64encode(image_data).decode('utf-8')
                    print(f"[AI_SERVICE SINGLE] ✓✓✓ SUCCESS via response.parts! {len(base64_image)} chars")
                    print("=" * 80)
                    # Clear image data from memory
                    del image_data
                    del part
                    gc.collect()
                    return base64_image
        
        print(f"[AI_SERVICE SINGLE] ✗✗✗ NO IMAGE FOUND IN RESPONSE")
        print(f"[AI_SERVICE SINGLE] This usually means:")
        print(f"[AI_SERVICE SINGLE]   1. API Key is invalid or expired")
        print(f"[AI_SERVICE SINGLE]   2. Model '{MODEL_ID}' doesn't support image generation")
        print(f"[AI_SERVICE SINGLE]   3. Request format is incorrect")
        print(f"[AI_SERVICE SINGLE]   4. API quota exceeded")
        print(f"[AI_SERVICE SINGLE]")
        print(f"[AI_SERVICE SINGLE] To fix:")
        print(f"[AI_SERVICE SINGLE]   - Check GOOGLE_API_KEY is set in Render environment")
        print(f"[AI_SERVICE SINGLE]   - Verify API key at https://aistudio.google.com/apikey")
        print(f"[AI_SERVICE SINGLE]   - Check quota at https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com")
        print("=" * 80)
        return None
        
    except Exception as e:
        print(f"[AI_SERVICE DEBUG] ❌ Error generating {style}: {e}")
        import traceback
        print(f"[AI_SERVICE DEBUG] Traceback:\n{traceback.format_exc()}")
        return None
    finally:
        # Clean up product bytes and response
        del product_bytes
        gc.collect()