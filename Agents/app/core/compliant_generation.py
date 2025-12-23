"""
Main compliant generation flow - integrates all components
"""
from google import genai
from google.genai import types
from PIL import Image
import io
import base64
import os
from pathlib import Path

from .models import GenerationRequest, GenerationResponse, ComplianceReport
from .validators import validate_with_gemini_guardrail
from .text_overlay import (
    calculate_optimal_text_color, 
    add_text_overlay,
    get_style_prompt
)
from .value_tiles import add_value_tile
from .logo_overlay import add_logos


# Gemini setup
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "your-project-id")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL_ID = "gemini-2.0-flash-exp"


def generate_compliant_banner(request: GenerationRequest) -> GenerationResponse:
    """
    Main generation flow: Validate → Generate → Text → Tiles → Logos → Return
    """
    rules_enforced = []
    
    # Step 1: Pre-validate with AI guardrail
    validate_with_gemini_guardrail(request)
    
    # Step 2: Prepare product image
    if request.product_filename.startswith('data:image'):
        # Base64 data URL
        header, encoded = request.product_filename.split(',', 1)
        image_data = base64.b64decode(encoded)
    else:
        # File path
        with open(request.product_filename, 'rb') as f:
            image_data = f.read()
    
    # Step 3: Generate background with Gemini
    style_prompt = get_style_prompt(request.style, request.concept)
    full_prompt = f"""
Keep the product EXACTLY unchanged. Only replace the background.
{style_prompt}
Leave top 100px and bottom 150px relatively clear for text and logos.
High quality commercial photography, professional lighting, premium feel.
"""
    
    try:
        client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Part.from_text(text=full_prompt),
                types.Part.from_bytes(mime_type="image/png", data=image_data),
            ],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="1:1"),
            ),
        )
        
        # Extract generated image
        generated_bytes = None
        if response.parts:
            for part in response.parts:
                if part.inline_data:
                    generated_bytes = part.inline_data.data
                    break
        
        if not generated_bytes:
            raise Exception("No image generated")
            
    except Exception as e:
        raise Exception(f"Image generation failed: {str(e)}")
    
    # Step 4: Smart contrast calculation
    text_color = request.text_color
    if not text_color:
        text_color = calculate_optimal_text_color(generated_bytes)
        rules_enforced.append(f"Auto-selected {text_color} text for optimal contrast")
    
    # Step 5: Add text overlay
    image_with_text = add_text_overlay(generated_bytes, request, text_color)
    
    # Step 6: Add value tile if requested
    img = Image.open(io.BytesIO(image_with_text))
    if request.value_tile:
        img = add_value_tile(
            img, 
            request.value_tile,
            request.value_tile_price,
            request.value_tile_end_date
        )
        rules_enforced.append(f"Added {request.value_tile} value tile")
    
    # Step 7: Add logos (Tesco + drinkaware if alcohol)
    img = add_logos(img, request.is_alcohol, request.logo_position)
    rules_enforced.append(f"Added Tesco logo at {request.logo_position}")
    
    if request.is_alcohol:
        rules_enforced.append("Added drinkaware logo (alcohol product)")
    
    # Step 8: Convert to base64 data URL
    output = io.BytesIO()
    img.save(output, format='PNG', quality=95)
    base64_str = base64.b64encode(output.getvalue()).decode()
    data_url = f"data:image/png;base64,{base64_str}"
    
    # Step 9: Build compliance report
    report = ComplianceReport(
        compliant=True,
        warnings=[],
        rules_enforced=rules_enforced
    )
    
    return GenerationResponse(
        image_data_url=data_url,
        compliance_report=report
    )
