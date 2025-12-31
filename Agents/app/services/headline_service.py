"""
Headline/Subheading Generator Service
Uses Google Gemini Vision to analyze product images and generate Tesco brand-compliant headlines.
"""

import os
import base64
import json
import logging
import sys
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Configure JSON logging for heavy terminal output
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": "headline-service",
            "function": record.funcName,
            "message": record.getMessage(),
        }
        if hasattr(record, 'extra_data'):
            log_obj["data"] = record.extra_data
        return json.dumps(log_obj)

# Configure logger with JSON format
logger = logging.getLogger("headline_service")
logger.setLevel(logging.DEBUG)

# Remove existing handlers
for handler in logger.handlers[:]:
    logger.removeHandler(handler)

# Add console handler with JSON formatter
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(JsonFormatter())
logger.addHandler(console_handler)

def log_json(level: str, message: str, **data):
    """Helper to log with extra data"""
    extra = {"extra_data": data} if data else {}
    record = logger.makeRecord(
        logger.name, getattr(logging, level.upper()), 
        "", 0, message, (), None
    )
    if data:
        record.extra_data = data
    logger.handle(record)

# Configuration - USE VERTEX AI like existing ai_service.py
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "firstproject-c5ac2")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
MODEL_ID = os.getenv("GEMINI_MODEL_ID", "gemini-2.0-flash")

log_json("INFO", "🚀 Headline Service Initialized", 
         project_id=PROJECT_ID,
         location=LOCATION,
         model=MODEL_ID)


# Rate limiting
generation_counts = {}
MAX_GENERATIONS_PER_DESIGN = 10

# Tesco Brand Guidelines
TESCO_BRAND_GUIDELINES = """
Tesco Brand Voice Guidelines:
- Friendly, warm, and approachable
- Value-focused but not cheap
- Clear and simple language
- Family-friendly
- Confident but not arrogant
- Helpful and informative

Avoid:
- Promotional language ("Free", "Win", "% off", "Prize")
- Complex or jargon-heavy words
- Negative or offensive language
- Exaggerated claims
"""

def _init_gemini_client():
    """Initialize Gemini client with Vertex AI (GCP project-based auth)"""
    log_json("INFO", "📦 Initializing Gemini client with Vertex AI...",
             project=PROJECT_ID, location=LOCATION)
    
    client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION,
    )
    log_json("INFO", "✅ Gemini client initialized (Vertex AI)")
    return client


def _check_rate_limit(design_id: str) -> bool:
    """Check if design has exceeded rate limit"""
    count = generation_counts.get(design_id, 0)
    logger.info(f"🔢 [HEADLINE SERVICE] Rate limit check: design={design_id}, count={count}/{MAX_GENERATIONS_PER_DESIGN}")
    
    if count >= MAX_GENERATIONS_PER_DESIGN:
        logger.warning(f"⚠️ [HEADLINE SERVICE] Rate limit exceeded for design {design_id}")
        return False
    
    generation_counts[design_id] = count + 1
    return True

def _decode_base64_image(image_base64: str) -> bytes:
    """Decode base64 image string to bytes"""
    logger.info("🖼️ [HEADLINE SERVICE] Decoding base64 image...")
    
    # Remove data URL prefix if present
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    
    image_bytes = base64.b64decode(image_base64)
    logger.info(f"✅ [HEADLINE SERVICE] Image decoded: {len(image_bytes)} bytes")
    return image_bytes

async def suggest_keywords(image_base64: str) -> dict:
    """
    Analyze product image and suggest relevant keywords.
    Like VS Code commit message suggestion.
    """
    logger.info("🔍 [HEADLINE SERVICE] suggest_keywords called")
    
    try:
        client = _init_gemini_client()
        image_bytes = _decode_base64_image(image_base64)
        
        prompt = """Analyze this product image and suggest 5-7 relevant marketing keywords.
        
        Focus on:
        - Product category (e.g., dairy, snacks, beverages)
        - Key attributes (e.g., organic, fresh, premium)
        - Emotional associations (e.g., healthy, delicious, family)
        - Usage occasions (e.g., breakfast, party, everyday)
        
        Return ONLY a JSON array of keywords, no explanation:
        ["keyword1", "keyword2", "keyword3", ...]
        """
        
        logger.info("📤 [HEADLINE SERVICE] Sending keyword request to Gemini...")
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ]
        )
        
        result_text = response.text.strip()
        logger.info(f"📥 [HEADLINE SERVICE] Gemini response: {result_text}")
        
        # Parse JSON response
        # Try to extract JSON array from response
        if "[" in result_text:
            json_start = result_text.index("[")
            json_end = result_text.rindex("]") + 1
            keywords = json.loads(result_text[json_start:json_end])
        else:
            keywords = ["product", "quality", "fresh", "value", "Tesco"]
        
        logger.info(f"✅ [HEADLINE SERVICE] Keywords extracted: {keywords}")
        
        return {
            "success": True,
            "keywords": keywords
        }
        
    except Exception as e:
        logger.error(f"❌ [HEADLINE SERVICE] Keyword suggestion failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "keywords": ["product", "quality", "fresh", "value", "Tesco"]  # Fallback
        }

async def generate_headlines(
    image_base64: str,
    design_id: str = "default",
    campaign_type: Optional[str] = None,
    user_keywords: Optional[list] = None
) -> dict:
    """
    Generate 3 headline options based on product image.
    """
    logger.info("📝 [HEADLINE SERVICE] generate_headlines called")
    logger.info(f"  ↳ design_id: {design_id}")
    logger.info(f"  ↳ campaign_type: {campaign_type}")
    logger.info(f"  ↳ user_keywords: {user_keywords}")
    
    # Check rate limit
    if not _check_rate_limit(design_id):
        return {
            "success": False,
            "error": f"Rate limit exceeded. Maximum {MAX_GENERATIONS_PER_DESIGN} generations per design.",
            "headlines": []
        }
    
    try:
        client = _init_gemini_client()
        image_bytes = _decode_base64_image(image_base64)
        
        # Build context
        context_parts = []
        if campaign_type:
            context_parts.append(f"Campaign Type: {campaign_type}")
        if user_keywords:
            context_parts.append(f"Keywords: {', '.join(user_keywords)}")
        context = "\n".join(context_parts) if context_parts else "General product promotion"
        
        prompt = f"""You are a Tesco brand copywriter. Analyze this product image and generate 3 headline options.

{TESCO_BRAND_GUIDELINES}

Context:
{context}

Requirements:
- Maximum 5 words per headline
- Catchy and memorable
- Appropriate for Tesco retail marketing
- No promotional language (no "free", "win", "% off")

Return ONLY a JSON array with 3 headlines:
[
  {{"text": "Headline 1", "confidence": 0.95}},
  {{"text": "Headline 2", "confidence": 0.85}},
  {{"text": "Headline 3", "confidence": 0.75}}
]
"""
        
        logger.info("📤 [HEADLINE SERVICE] Sending headline request to Gemini...")
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ]
        )
        
        result_text = response.text.strip()
        logger.info(f"📥 [HEADLINE SERVICE] Gemini response: {result_text[:200]}...")
        
        # Parse JSON response
        if "[" in result_text:
            json_start = result_text.index("[")
            json_end = result_text.rindex("]") + 1
            headlines = json.loads(result_text[json_start:json_end])
        else:
            headlines = [
                {"text": "Quality You Can Trust", "confidence": 0.9},
                {"text": "Fresh Every Day", "confidence": 0.8},
                {"text": "Taste the Difference", "confidence": 0.7}
            ]
        
        logger.info(f"✅ [HEADLINE SERVICE] Headlines generated: {len(headlines)}")
        
        return {
            "success": True,
            "headlines": headlines
        }
        
    except Exception as e:
        logger.error(f"❌ [HEADLINE SERVICE] Headline generation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "headlines": []
        }

async def generate_subheadings(
    image_base64: str,
    design_id: str = "default",
    campaign_type: Optional[str] = None,
    user_keywords: Optional[list] = None
) -> dict:
    """
    Generate 3 subheading options based on product image.
    """
    logger.info("📝 [HEADLINE SERVICE] generate_subheadings called")
    logger.info(f"  ↳ design_id: {design_id}")
    logger.info(f"  ↳ campaign_type: {campaign_type}")
    logger.info(f"  ↳ user_keywords: {user_keywords}")
    
    # Check rate limit
    if not _check_rate_limit(design_id):
        return {
            "success": False,
            "error": f"Rate limit exceeded. Maximum {MAX_GENERATIONS_PER_DESIGN} generations per design.",
            "subheadings": []
        }
    
    try:
        client = _init_gemini_client()
        image_bytes = _decode_base64_image(image_base64)
        
        # Build context
        context_parts = []
        if campaign_type:
            context_parts.append(f"Campaign Type: {campaign_type}")
        if user_keywords:
            context_parts.append(f"Keywords: {', '.join(user_keywords)}")
        context = "\n".join(context_parts) if context_parts else "General product promotion"
        
        prompt = f"""You are a Tesco brand copywriter. Analyze this product image and generate 3 subheading options.

{TESCO_BRAND_GUIDELINES}

Context:
{context}

Requirements:
- 8-15 words per subheading
- Descriptive and informative
- Supports the main headline
- Highlights product benefits
- Appropriate for Tesco retail marketing

Return ONLY a JSON array with 3 subheadings:
[
  {{"text": "Subheading 1 with more descriptive text", "confidence": 0.95}},
  {{"text": "Subheading 2 with more descriptive text", "confidence": 0.85}},
  {{"text": "Subheading 3 with more descriptive text", "confidence": 0.75}}
]
"""
        
        logger.info("📤 [HEADLINE SERVICE] Sending subheading request to Gemini...")
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ]
        )
        
        result_text = response.text.strip()
        logger.info(f"📥 [HEADLINE SERVICE] Gemini response: {result_text[:200]}...")
        
        # Parse JSON response
        if "[" in result_text:
            json_start = result_text.index("[")
            json_end = result_text.rindex("]") + 1
            subheadings = json.loads(result_text[json_start:json_end])
        else:
            subheadings = [
                {"text": "Premium quality products sourced for your family", "confidence": 0.9},
                {"text": "Carefully selected to bring you the best value", "confidence": 0.8},
                {"text": "Fresh from farm to your table every day", "confidence": 0.7}
            ]
        
        logger.info(f"✅ [HEADLINE SERVICE] Subheadings generated: {len(subheadings)}")
        
        return {
            "success": True,
            "subheadings": subheadings
        }
        
    except Exception as e:
        logger.error(f"❌ [HEADLINE SERVICE] Subheading generation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "subheadings": []
        }

async def analyze_image_for_placement(image_base64: str, canvas_width: int, canvas_height: int) -> dict:
    """
    🎯 SMART AI-POWERED PLACEMENT
    Uses Gemini Vision to analyze the image and find optimal text placement.
    """
    log_json("INFO", "🎯 Analyzing image for smart placement...", 
             canvas_width=canvas_width, canvas_height=canvas_height)
    
    try:
        client = _init_gemini_client()
        image_bytes = _decode_base64_image(image_base64)
        
        prompt = f"""Analyze this image for optimal text placement in a retail advertisement.

Canvas dimensions: {canvas_width}px x {canvas_height}px

Please identify:
1. Where is the main subject (person/product) located? (top, center, bottom, left, right)
2. Which areas are relatively empty/clear for text overlay?
3. What is the dominant background color/brightness?

Based on your analysis, recommend placement for:
- HEADLINE: Short text (3-5 words), should be prominent and readable
- SUBHEADING: Longer text (8-15 words), below or near headline

Return ONLY a JSON object (no markdown, no explanation):
{{
    "subject_position": "center-bottom",
    "empty_zones": ["top", "bottom-left"],
    "background_brightness": "dark",
    "headline": {{
        "x": 540,
        "y": 100,
        "align": "center",
        "fontSize": 42,
        "fontWeight": "bold",
        "color": "#FFFFFF",
        "shadow": true,
        "shadowColor": "rgba(0,0,0,0.5)"
    }},
    "subheading": {{
        "x": 540,
        "y": 160,
        "align": "center", 
        "fontSize": 22,
        "fontWeight": "normal",
        "color": "#FFFFFF",
        "shadow": true,
        "shadowColor": "rgba(0,0,0,0.3)"
    }}
}}

IMPORTANT:
- Place text where it won't overlap with the main subject
- Use white text (#FFFFFF) for dark backgrounds, use dark (#1a1a1a) for light backgrounds
- Include shadow for readability over images
- Keep headline in top third if possible, unless blocked by subject
- Follow Tesco brand style: clean, professional, family-friendly
"""
        
        log_json("INFO", "📤 Sending smart placement request to Gemini...")
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ]
        )
        
        result_text = response.text.strip()
        log_json("INFO", "📥 Gemini placement response received", 
                 response_length=len(result_text))
        
        # Parse JSON response
        if "{" in result_text:
            json_start = result_text.index("{")
            json_end = result_text.rindex("}") + 1
            placement = json.loads(result_text[json_start:json_end])
            
            log_json("INFO", "✅ Smart placement calculated", 
                     subject_position=placement.get("subject_position"),
                     background=placement.get("background_brightness"))
            
            return {
                "success": True,
                "placement": placement
            }
        else:
            # Fallback to safe defaults
            return _get_default_placement(canvas_width, canvas_height)
            
    except Exception as e:
        log_json("ERROR", f"❌ Smart placement failed: {str(e)}")
        return _get_default_placement(canvas_width, canvas_height)


def _get_default_placement(canvas_width: int, canvas_height: int) -> dict:
    """Fallback placement when AI analysis fails"""
    return {
        "success": True,
        "placement": {
            "subject_position": "center",
            "empty_zones": ["top"],
            "background_brightness": "dark",
            "headline": {
                "x": canvas_width // 2,
                "y": int(canvas_height * 0.15),
                "align": "center",
                "fontSize": 42,
                "fontWeight": "bold",
                "color": "#FFFFFF",
                "shadow": True,
                "shadowColor": "rgba(0,0,0,0.5)",
                "shadowBlur": 4,
                "shadowOffsetX": 2,
                "shadowOffsetY": 2
            },
            "subheading": {
                "x": canvas_width // 2,
                "y": int(canvas_height * 0.22),
                "align": "center",
                "fontSize": 22,
                "fontWeight": "normal",
                "color": "#FFFFFF",
                "shadow": True,
                "shadowColor": "rgba(0,0,0,0.3)",
                "shadowBlur": 3,
                "shadowOffsetX": 1,
                "shadowOffsetY": 1
            }
        }
    }


def calculate_optimal_placement(canvas_width: int, canvas_height: int) -> dict:
    """
    Calculate optimal text placement positions (synchronous fallback).
    Returns positions for headline and subheading.
    """
    logger.info(f"📐 [HEADLINE SERVICE] Calculating placement for {canvas_width}x{canvas_height}")
    
    # Headline: centered, in top 15%
    headline_x = canvas_width // 2
    headline_y = int(canvas_height * 0.15)
    
    # Subheading: centered, below headline
    subheading_x = canvas_width // 2
    subheading_y = int(canvas_height * 0.22)
    
    placement = {
        "headline": {
            "x": headline_x,
            "y": headline_y,
            "fontSize": 42,
            "fontWeight": "bold",
            "align": "center",
            "color": "#FFFFFF",
            "shadow": True,
            "shadowColor": "rgba(0,0,0,0.5)",
            "shadowBlur": 4,
            "shadowOffsetX": 2,
            "shadowOffsetY": 2,
            "fontFamily": "Arial, sans-serif"
        },
        "subheading": {
            "x": subheading_x,
            "y": subheading_y,
            "fontSize": 22,
            "fontWeight": "normal",
            "align": "center",
            "color": "#FFFFFF",
            "shadow": True,
            "shadowColor": "rgba(0,0,0,0.3)",
            "shadowBlur": 3,
            "shadowOffsetX": 1,
            "shadowOffsetY": 1,
            "fontFamily": "Arial, sans-serif"
        }
    }
    
    logger.info(f"✅ [HEADLINE SERVICE] Placement calculated: {placement}")
    return placement

def suggest_text_color(background_color: str = "#1a1a1a") -> dict:
    """
    Suggest text color based on background for contrast.
    """
    logger.info(f"🎨 [HEADLINE SERVICE] Suggesting text color for background: {background_color}")
    
    # Simple luminance check
    if background_color.startswith("#"):
        r = int(background_color[1:3], 16)
        g = int(background_color[3:5], 16)
        b = int(background_color[5:7], 16)
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        
        if luminance > 0.5:
            # Dark text for light background
            text_color = "#1a1a1a"
        else:
            # Light text for dark background
            text_color = "#FFFFFF"
    else:
        text_color = "#FFFFFF"  # Default to white
    
    logger.info(f"✅ [HEADLINE SERVICE] Suggested text color: {text_color}")
    
    return {
        "text_color": text_color,
        "luminance": luminance if 'luminance' in locals() else 0.5
    }

def reset_rate_limit(design_id: str):
    """Reset rate limit for a design (for testing)"""
    if design_id in generation_counts:
        del generation_counts[design_id]
        logger.info(f"🔄 [HEADLINE SERVICE] Rate limit reset for design: {design_id}")

