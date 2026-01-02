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
    print(req.canvas)
    decoded_canvas = base64.b64decode(req.canvas).decode("utf-8")

    start = time.perf_counter()
    result = await run_validation(decoded_canvas)
    end = time.perf_counter()
    print(f"Validation took {end - start} seconds")

    return result


@router.post("/auto-fix")
async def auto_fix_compliance(req: AutoFixRequest) -> AutoFixResponse:
    """
    AI-powered compliance auto-fix endpoint.
    Receives HTML/CSS with violations, uses Gemini to fix compliance issues.
    Retries up to 3 times if invalid HTML is returned.
    """
    logger.info(f"🤖 [AUTO-FIX] Starting auto-fix for {len(req.violations)} violations")

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
            req.canvas_width,
            req.canvas_height,
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
