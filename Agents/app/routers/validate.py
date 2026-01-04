from fastapi import APIRouter, HTTPException
from app.core.models import (
    ValidationRequest,
    ValidationResponse,
    AutoFixRequest,
    AutoFixResponse,
    FixApplied,
)
from app.agents.runner import run_validation
from app.services.validation_service import (
    prepare_html_for_llm,
    restore_html_from_llm,
    validate_html_structure,
)
import base64
import time
import json
import logging
import os
from pathlib import Path
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/validate")

# Load validation rules
RULES_PATH = Path(__file__).parent.parent / "resources" / "validation_rules.json"
with open(RULES_PATH, "r", encoding="utf-8") as f:
    VALIDATION_RULES = json.load(f)

# Gemini configuration
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "firstproject-c5ac2")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
MODEL_ID = os.getenv("GEMINI_MODEL_ID", "gemini-2.5-flash-image")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


@router.post("")
async def validate(req: ValidationRequest) -> ValidationResponse:
    """
    Validate canvas against Tesco compliance rules.
    Returns compliance status, violations, and HTML preview.
    """
    logger.info(f"[VALIDATE] ========== NEW VALIDATION REQUEST ==========")
    logger.info(f"[VALIDATE] Received canvas data ({len(req.canvas)} chars)")
    
    try:
        decoded_canvas = base64.b64decode(req.canvas).decode("utf-8")
        logger.info(f"[VALIDATE] Decoded canvas size: {len(decoded_canvas)} chars")
        
        # Try to parse and log canvas structure for debugging
        try:
            canvas_json = json.loads(decoded_canvas)
            width = canvas_json.get('width', 'unknown')
            height = canvas_json.get('height', 'unknown')
            objects = canvas_json.get('objects', [])
            bg = canvas_json.get('background', 'unknown')
            
            logger.info(f"[VALIDATE] Canvas: {width}x{height}px, background: {bg}")
            logger.info(f"[VALIDATE] Objects: {len(objects)} elements")
            
            # Log element summary with custom properties
            for i, obj in enumerate(objects[:10]):  # Limit to first 10
                obj_type = obj.get('type', 'unknown')
                custom_id = obj.get('customId', '')
                is_tesco_tag = obj.get('isTescoTag', False)
                is_logo = obj.get('isLogo', False)
                
                if obj_type in ['text', 'textbox', 'i-text']:
                    text = (obj.get('text') or '')[:40]
                    font_size = obj.get('fontSize', 16)
                    logger.info(f"  [{i}] TEXT: '{text}' ({font_size}px) {f'[{custom_id}]' if custom_id else ''}")
                elif obj_type == 'image':
                    src = (obj.get('src') or '')[:50]
                    flags = []
                    if is_tesco_tag: flags.append('TESCO_TAG')
                    if is_logo: flags.append('LOGO')
                    if custom_id: flags.append(f'id:{custom_id}')
                    logger.info(f"  [{i}] IMAGE: {src[:30] if src else '(no src)'}... {' '.join(flags)}")
                else:
                    logger.info(f"  [{i}] {obj_type.upper()} {f'[{custom_id}]' if custom_id else ''}")
            
            if len(objects) > 10:
                logger.info(f"  ... and {len(objects) - 10} more elements")
                
        except json.JSONDecodeError:
            logger.warning("[VALIDATE] Could not parse canvas as JSON")
    except Exception as e:
        logger.error(f"[VALIDATE] Failed to decode canvas: {e}")
        decoded_canvas = req.canvas

    start = time.perf_counter()
    result = await run_validation(decoded_canvas)
    end = time.perf_counter()
    
    logger.info(f"[VALIDATE] ========== VALIDATION RESULT ==========")
    logger.info(f"[VALIDATE] Compliant: {result.compliant}")
    logger.info(f"[VALIDATE] Issues: {len(result.issues)}")
    for issue in result.issues:
        logger.info(f"  - [{issue.get('severity', 'unknown').upper()}] {issue.get('type')}: {issue.get('message')}")
    logger.info(f"[VALIDATE] Suggestions: {result.suggestions}")
    logger.info(f"[VALIDATE] Completed in {end - start:.4f}s")
    
    # Print HTML preview (first 2000 chars for readability)
    if result.canvas:
        logger.info(f"[VALIDATE] ========== HTML PREVIEW (first 2000 chars) ==========")
        preview = result.canvas[:2000] if len(result.canvas) > 2000 else result.canvas
        for line in preview.split('\n')[:50]:  # First 50 lines
            logger.info(f"  {line}")
        if len(result.canvas) > 2000:
            logger.info(f"  ... (truncated, total {len(result.canvas)} chars)")
    
    logger.info(f"[VALIDATE] ==========================================")

    return result


@router.post("/auto-fix")
async def auto_fix_compliance(req: AutoFixRequest) -> AutoFixResponse:
    """
    AI-powered compliance auto-fix endpoint.
    Receives HTML/CSS with violations, uses Gemini to fix compliance issues.
    Retries up to 3 times if invalid HTML is returned.
    """
    logger.info(f"🤖 [AUTO-FIX] ========== NEW AUTO-FIX REQUEST ==========")
    logger.info(f"🤖 [AUTO-FIX] Violations count: {len(req.violations)}")
    logger.info(f"🤖 [AUTO-FIX] Canvas size: {req.width}x{req.height}")
    logger.info(f"🤖 [AUTO-FIX] HTML length: {len(req.html)} chars")
    logger.info(f"🤖 [AUTO-FIX] CSS length: {len(req.css)} chars")
    logger.info(f"🤖 [AUTO-FIX] Images provided: {len(req.images) if req.images else 0}")
    
    for i, v in enumerate(req.violations):
        logger.info(f"🤖 [AUTO-FIX]   Violation {i+1}: [{v.severity}] {v.rule} - {v.message}")
        if v.autoFix:
            logger.info(f"🤖 [AUTO-FIX]     AutoFix hint: {v.autoFix}")
    
    logger.info(f"🤖 [AUTO-FIX] ==========================================")

    try:
        # Step 1: Extract base64 images and replace with placeholders
        cleaned_html, cleaned_css, image_map = await prepare_html_for_llm(
            req.html, req.css
        )

        # Step 2: Build LLM prompt with rules and violations
        prompt = _build_auto_fix_prompt(
            cleaned_html,
            cleaned_css,
            req.violations,
            req.width,
            req.height,
        )

        # Step 3: Call Gemini with retry logic (max 3 attempts)
        max_retries = 3
        corrected_html = None
        corrected_css = None
        fixes = []

        for attempt in range(1, max_retries + 1):
            logger.info(f"🔄 [AUTO-FIX] Attempt {attempt}/{max_retries}")

            try:
                llm_response = await _call_gemini_for_fixes(prompt)

                # Extract structured response
                corrected_html = llm_response.get("html", "")
                corrected_css = llm_response.get("css", "")
                fixes = llm_response.get("fixes", [])

                # Validate HTML structure
                is_valid = await validate_html_structure(corrected_html)

                if is_valid:
                    logger.info(
                        f"✅ [AUTO-FIX] Valid HTML received on attempt {attempt}"
                    )
                    break
                else:
                    logger.warning(
                        f"⚠️ [AUTO-FIX] Invalid HTML on attempt {attempt}, retrying..."
                    )
                    if attempt < max_retries:
                        # Add validation feedback to prompt for next attempt
                        prompt += f"\n\n[RETRY {attempt}] Previous HTML was malformed. Ensure all tags are properly closed and nested."
                        time.sleep(1)  # Rate limiting

            except Exception as e:
                logger.error(f"❌ [AUTO-FIX] Attempt {attempt} failed: {e}")
                if attempt == max_retries:
                    raise
                time.sleep(1)

        # Check if we got valid HTML
        if not corrected_html or not await validate_html_structure(corrected_html):
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate valid HTML after {max_retries} attempts",
            )

        # Step 4: Restore base64 images
        final_html, final_css = await restore_html_from_llm(
            corrected_html,
            corrected_css,
            req.images,  # Use images from request, not image_map
        )

        # Step 5: Parse fixes into structured format
        structured_fixes = [
            FixApplied(
                rule=fix.get("rule", "UNKNOWN"),
                elementId=fix.get("elementId"),
                element_selector=fix.get("element_selector"),
                property=fix.get("property", ""),
                old_value=fix.get("old_value"),
                new_value=fix.get("new_value", ""),
                description=fix.get("description", ""),
            )
            for fix in fixes
        ]

        logger.info(
            f"✅ [AUTO-FIX] Completed with {len(structured_fixes)} fixes applied"
        )

        return AutoFixResponse(
            success=True,
            corrected_html=final_html,
            corrected_css=final_css,
            fixes_applied=structured_fixes,
            remaining_violations=[],
            llm_iterations=attempt,
            error=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [AUTO-FIX] Fatal error: {e}")
        return AutoFixResponse(
            success=False,
            corrected_html=req.html,  # Return original on failure
            corrected_css=req.css,
            fixes_applied=[],
            remaining_violations=[v.rule for v in req.violations],
            llm_iterations=0,
            error=str(e),
        )


def _build_auto_fix_prompt(
    html: str, css: str, violations: list, canvas_width: int, canvas_height: int
) -> str:
    """Build structured prompt for Gemini auto-fix"""

    # Get relevant rules from violations
    violation_rules = {v.rule for v in violations}
    relevant_rules = [
        rule
        for rule in VALIDATION_RULES.get("rules", [])
        if rule["id"] in violation_rules
    ]

    prompt = f"""You are a Tesco Retail Media compliance specialist. Fix the provided HTML/CSS to resolve compliance violations.

=== CANVAS SPECIFICATIONS ===
Width: {canvas_width}px
Height: {canvas_height}px
Aspect Ratio: 9:16 (Instagram Stories format)

=== VIOLATIONS DETECTED ({len(violations)}) ===
"""

    for i, violation in enumerate(violations, 1):
        prompt += f"\n{i}. {violation.rule}: {violation.message}"
        if violation.elementId:
            prompt += f" (Element ID: {violation.elementId})"

    prompt += f"\n\n=== COMPLIANCE RULES ===\n"

    for rule in relevant_rules:
        prompt += f"""
Rule: {rule["name"]} ({rule["id"]})
Severity: {rule["severity"]}
Description: {rule["description"]}
Fix Instructions: {rule["fix_instruction"]}
Example: {rule.get("example_fix", "N/A")}
---
"""

    prompt += f"""

=== CURRENT HTML ===
{html}

=== CURRENT CSS ===
{css}

=== INSTRUCTIONS ===
1. Analyze each violation carefully
2. Apply fixes according to the rule fix_instruction
3. Maintain element structure and IDs
4. Preserve image placeholders ({{{{ IMG_N }}}}) exactly as-is
5. Return ONLY valid, well-formed HTML/CSS
6. Ensure all opening tags have matching closing tags
7. Do not remove or modify placeholder syntax

=== OUTPUT FORMAT (JSON) ===
Return a JSON object with this exact structure:
{{
  "html": "corrected HTML with all fixes applied",
  "css": "corrected CSS with all style fixes",
  "fixes": [
    {{
      "rule": "RULE_ID",
      "elementId": "element-id or null",
      "element_selector": ".element-class or tag",
      "property": "property name (fontSize, y, color, etc.)",
      "old_value": "previous value",
      "new_value": "corrected value",
      "description": "brief description of what was fixed"
    }}
  ]
}}

Begin correction now.
"""

    return prompt


async def _call_gemini_for_fixes(prompt: str) -> dict:
    """Call Gemini API for structured auto-fix response"""

    try:
        # Use API key if available, otherwise fall back to Vertex AI (ADC)
        if GOOGLE_API_KEY:
            logger.info("🔑 [AUTO-FIX] Using Google API Key authentication")
            client = genai.Client(api_key=GOOGLE_API_KEY)
            model_name = "gemini-2.5-flash"  # Consumer API model
        else:
            logger.info("☁️ [AUTO-FIX] Using Vertex AI authentication (ADC)")
            client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
            model_name = MODEL_ID  # Use configured model for Vertex AI

        # Log the input prompt
        logger.info("=" * 80)
        logger.info("📝 [AUTO-FIX] INPUT PROMPT TO GEMINI:")
        logger.info("=" * 80)
        logger.info(f"\n{prompt}\n")
        logger.info("=" * 80)
        logger.info(f"🤖 [AUTO-FIX] Calling Gemini model: {model_name}")

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,  # Low temperature for deterministic fixes
                response_mime_type="application/json",  # Force JSON output
                max_output_tokens=8192,  # Allow large HTML responses
            ),
        )

        # Log the raw response
        logger.info("=" * 80)
        logger.info("📤 [AUTO-FIX] RAW OUTPUT FROM GEMINI:")
        logger.info("=" * 80)
        logger.info(f"\n{response.text}\n")
        logger.info("=" * 80)

        # Parse JSON response
        result = json.loads(response.text)

        logger.info(
            f"✨ [AUTO-FIX] Gemini returned {len(result.get('fixes', []))} fixes"
        )

        # Log structured output summary
        logger.info("📊 [AUTO-FIX] Parsed fixes summary:")
        for i, fix in enumerate(result.get("fixes", []), 1):
            logger.info(
                f"  {i}. {fix.get('rule', 'UNKNOWN')}: {fix.get('description', 'No description')}"
            )

        return result

    except json.JSONDecodeError as e:
        logger.error(f"❌ [AUTO-FIX] Invalid JSON from Gemini: {e}")
        logger.error(f"Raw response text: {response.text[:500]}...")
        # Try to extract JSON from response
        try:
            import re

            json_match = re.search(r"\{.*\}", response.text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")

    except Exception as e:
        logger.error(f"❌ [AUTO-FIX] Gemini API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


# ==================== GENERATE CONTENT FOR AUTO-FIX ====================
from pydantic import BaseModel
from typing import Optional, List

class GenerateContentRequest(BaseModel):
    """Request to generate content for auto-fix"""
    rule: str  # The rule that failed (e.g., "SUBHEAD", "HEADLINE", "TESCO_TAG")
    context: Optional[str] = None  # Context from the canvas (e.g., headline text)
    product_name: Optional[str] = None  # Product name if available
    canvas_objects: Optional[List[dict]] = None  # Canvas objects for context

class GenerateContentResponse(BaseModel):
    """Response with generated content"""
    content: str
    rule: str
    suggestion: Optional[str] = None


@router.post("/generate-content")
async def generate_content_for_fix(req: GenerateContentRequest) -> GenerateContentResponse:
    """
    Generate proper content for auto-fix based on the rule that failed.
    Uses AI to generate contextual content instead of placeholder text.
    """
    logger.info(f"✨ [GENERATE] ========== GENERATE CONTENT REQUEST ==========")
    logger.info(f"✨ [GENERATE] Rule: {req.rule}")
    logger.info(f"✨ [GENERATE] Context: {req.context}")
    logger.info(f"✨ [GENERATE] Product: {req.product_name}")
    
    try:
        # Extract context from canvas objects if provided
        headline_text = ""
        product_info = req.product_name or ""
        
        if req.canvas_objects:
            for obj in req.canvas_objects:
                if obj.get('type') in ['text', 'textbox', 'i-text']:
                    text = obj.get('text', '')
                    font_size = obj.get('fontSize', 16)
                    # Likely headline if large font
                    if font_size >= 24 and len(text) > 5:
                        headline_text = text
                        break
        
        if req.context:
            headline_text = req.context
        
        # Build prompt based on rule
        prompt = _build_content_generation_prompt(req.rule, headline_text, product_info)
        
        # Call Gemini to generate content
        client = genai.Client(api_key=GOOGLE_API_KEY)
        model_name = "gemini-2.5-flash"
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=256,
            ),
        )
        
        generated_text = response.text.strip()
        
        # Clean up the response (remove quotes if present)
        if generated_text.startswith('"') and generated_text.endswith('"'):
            generated_text = generated_text[1:-1]
        if generated_text.startswith("'") and generated_text.endswith("'"):
            generated_text = generated_text[1:-1]
        
        logger.info(f"✨ [GENERATE] Generated: {generated_text}")
        logger.info(f"✨ [GENERATE] ==========================================")
        
        return GenerateContentResponse(
            content=generated_text,
            rule=req.rule,
            suggestion=f"Added {req.rule.lower().replace('_', ' ')} based on your design"
        )
        
    except Exception as e:
        logger.error(f"❌ [GENERATE] Error: {e}")
        # Return fallback content
        fallback = _get_fallback_content(req.rule, headline_text)
        return GenerateContentResponse(
            content=fallback,
            rule=req.rule,
            suggestion="Added default content (AI generation failed)"
        )


def _build_content_generation_prompt(rule: str, headline: str, product: str) -> str:
    """Build prompt for content generation based on rule type"""
    
    if rule == "SUBHEAD" or rule == "MISSING_SUBHEAD":
        return f"""Generate a short, compelling subhead/tagline for a Tesco retail advertisement.

Context:
- Headline: "{headline or 'Product Advertisement'}"
- Product: "{product or 'Consumer goods'}"
- Brand: Tesco retail media

Requirements:
- Maximum 8 words
- Complementary to the headline
- Professional retail tone
- Do NOT include prices or promotions
- Do NOT include CTAs like "Shop now"

Return ONLY the subhead text, no quotes or explanation."""

    elif rule == "HEADLINE" or rule == "MISSING_HEADLINE":
        return f"""Generate a short, impactful headline for a Tesco retail advertisement.

Context:
- Product: "{product or 'Consumer product'}"
- Style: Tesco retail media creative

Requirements:
- Maximum 6 words
- Bold, attention-grabbing
- Do NOT include prices
- Do NOT include CTAs

Return ONLY the headline text, no quotes or explanation."""

    elif rule == "TESCO_TAG" or rule == "MISSING_TAG":
        # Tesco tags are specific - return the correct one
        return "Available at Tesco"
    
    elif rule == "CLUBCARD_DATE":
        from datetime import datetime, timedelta
        end_date = datetime.now() + timedelta(days=30)
        return f"Clubcard/app required. Ends {end_date.strftime('%d/%m')}"
    
    elif rule == "DRINKAWARE":
        return "drinkaware.co.uk"
    
    else:
        return f"""Generate appropriate text content for a Tesco retail advertisement.

Rule to address: {rule}
Context: {headline or 'Retail advertisement'}

Requirements:
- Professional retail tone
- Tesco brand appropriate
- Maximum 10 words

Return ONLY the text, no quotes or explanation."""


def _get_fallback_content(rule: str, headline: str = "") -> str:
    """Return fallback content if AI generation fails"""
    fallbacks = {
        "SUBHEAD": "Quality you can trust" if not headline else f"Discover more",
        "HEADLINE": "Quality Guaranteed",
        "TESCO_TAG": "Available at Tesco",
        "MISSING_TAG": "Available at Tesco",
        "CLUBCARD_DATE": "Clubcard/app required. Ends 31/01",
        "DRINKAWARE": "drinkaware.co.uk",
        "LEP_TAG": "Selected stores. While stocks last",
    }
    return fallbacks.get(rule, "")

