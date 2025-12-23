"""
Smart text overlay system with intelligent contrast detection and sizing
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io
from typing import Tuple, Dict
from .models import GenerationRequest


# Style prompts for different generation modes
STYLES = {
    "studio": "minimal luxury background, softbox lighting, commercial product shot, high-end retail photography",
    "lifestyle": "placed in natural setting, morning sunlight, realistic shadows, lifestyle context, everyday use",
    "dramatic": "cinematic lighting, premium advertising style, dramatic atmosphere, bold creative vision"
}


def calculate_optimal_text_color(image_bytes: bytes) -> str:
    """
    Analyze background luminance and return optimal text color.
    Returns white for dark backgrounds, black for light backgrounds.
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # Sample top region where text will be placed
    sample_region = img.crop((0, 0, img.width, 300))
    
    # Convert to grayscale and calculate average luminance
    gray = sample_region.convert('L')
    pixels = list(gray.getdata())
    avg_luminance = sum(pixels) / len(pixels)
    
    # Return contrasting color (WCAG AA compliant)
    if avg_luminance < 128:
        return "#FFFFFF"  # White text on dark background
    else:
        return "#000000"  # Black text on light background


def calculate_smart_text_sizes(headline: str, subhead: str) -> Tuple[int, int]:
    """
    Smart sizing algorithm: Scale font sizes based on text length
    to handle overflow while staying compliant (min 20px).
    """
    headline_chars = len(headline)
    subhead_chars = len(subhead)
    
    # Start with ideal sizes
    headline_size = 56
    subhead_size = 36
    
    # Scale down for long text (smart compromise)
    if headline_chars > 30:
        # Reduce by 1px per extra 2 characters
        reduction = (headline_chars - 30) // 2
        headline_size = max(48, 56 - reduction)
    
    if subhead_chars > 50:
        # Reduce by 1px per extra 3 characters
        reduction = (subhead_chars - 50) // 3
        subhead_size = max(28, 36 - reduction)
    
    # Ensure compliance minimums (20px)
    headline_size = max(headline_size, 20)
    subhead_size = max(subhead_size, 20)
    
    return headline_size, subhead_size


def draw_text_with_stroke(draw: ImageDraw.ImageDraw, position: Tuple[int, int], 
                           text: str, font: ImageFont.FreeTypeFont, 
                           fill: str, stroke_width: int = 3):
    """
    Draw text with stroke/outline for better contrast on any background.
    """
    x, y = position
    
    # Draw stroke (black outline)
    for offset_x in range(-stroke_width, stroke_width + 1):
        for offset_y in range(-stroke_width, stroke_width + 1):
            if offset_x != 0 or offset_y != 0:
                draw.text((x + offset_x, y + offset_y), text, font=font, fill="#000000")
    
    # Draw main text
    draw.text(position, text, font=font, fill=fill)


def add_text_overlay(image_bytes: bytes, request: GenerationRequest, 
                     text_color: str) -> bytes:
    """
    Add text overlays to generated image with smart positioning.
    """
    img = Image.open(io.BytesIO(image_bytes))
    draw = ImageDraw.Draw(img)
    
    # Calculate smart font sizes
    headline_size, subhead_size = calculate_smart_text_sizes(
        request.headline, request.subhead
    )
    
    # Try to load Tesco-style fonts, fallback to defaults
    try:
        headline_font = ImageFont.truetype("arial.ttf", headline_size)
        subhead_font = ImageFont.truetype("arial.ttf", subhead_size)
    except:
        # Fallback to PIL default
        headline_font = ImageFont.load_default()
        subhead_font = ImageFont.load_default()
    
    # Position with safe zones (leave space for logos)
    headline_y = 80
    subhead_y = headline_y + headline_size + 30
    
    # Draw text with stroke for contrast
    draw_text_with_stroke(
        draw, (50, headline_y), 
        request.headline, headline_font, text_color
    )
    draw_text_with_stroke(
        draw, (50, subhead_y), 
        request.subhead, subhead_font, text_color
    )
    
    # Convert back to bytes
    output = io.BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()


def get_style_prompt(style: str, concept: str) -> str:
    """Get full prompt for Gemini based on style and concept."""
    base_style = STYLES.get(style, STYLES["studio"])
    return f"{base_style}. {concept}"
