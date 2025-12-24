# This will contain the agent as well as the functions to run compliance validation on the canvas.

import base64
import json
import re
from pathlib import Path
from typing import Dict, Any
from .llms import get_llm
from .prompts import COMPLIANCE_CHECK_SYSTEM_PROMPT, get_compliance_check_prompt


def load_rules() -> str:
    """Load the Tesco compliance rules from the rules.md file."""
    rules_path = Path(__file__).parent.parent / "resources" / "rules.md"
    try:
        with open(rules_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"Rules file not found at {rules_path}")


def extract_json_from_response(response_text: str) -> Dict[str, Any]:
    """
    Extract JSON from LLM response text.
    Uses regex to find JSON object even if wrapped in markdown or other text.
    """
    # Try to parse the entire response as JSON first
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON within markdown code blocks
    code_block_pattern = r"```(?:json)?\s*(\{.*?\})\s*```"
    match = re.search(code_block_pattern, response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find any JSON object in the text
    json_pattern = r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}"
    matches = re.finditer(json_pattern, response_text, re.DOTALL)

    for match in matches:
        try:
            potential_json = match.group(0)
            parsed = json.loads(potential_json)
            # Verify it has the expected structure
            if "checks" in parsed and "summary" in parsed:
                return parsed
        except json.JSONDecodeError:
            continue

    # If all else fails, return an error response
    raise ValueError(
        f"Could not extract valid JSON from LLM response: {response_text[:200]}..."
    )


def check_compliance(canvas_html_b64: str, canvas_image_b64: str) -> Dict[str, Any]:
    """
    Check canvas compliance using LLM-based analysis.

    Args:
        canvas_html_b64: Base64 encoded HTML of the canvas
        canvas_image_b64: Base64 encoded image of the canvas

    Returns:
        Dictionary containing compliance check results
    """
    # Decode the HTML
    html_content = base64.b64decode(canvas_html_b64).decode("utf-8")

    # Load rules
    rules_content = load_rules()

    # Get LLM
    llm = get_llm("google_gemini")

    # Prepare the prompt
    user_prompt = get_compliance_check_prompt(rules_content, html_content)

    # Prepare the message with image
    messages = [
        {"role": "system", "content": COMPLIANCE_CHECK_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_prompt},
                {
                    "type": "image",
                    "base64": canvas_image_b64,
                    "mime_type": "image/png",  # Adjust based on actual image type
                },
            ],
        },
    ]

    # Call LLM
    try:
        response = llm.invoke(messages)

        # Extract response text
        if hasattr(response, "content"):
            response_text = response.content
        elif isinstance(response, dict):
            response_text = response.get("content", str(response))
        else:
            response_text = str(response)

        # Parse JSON from response
        result = extract_json_from_response(response_text)

        # Add status field
        result["status"] = "success"

        return result

    except Exception as e:
        # Return error response in expected format
        return {
            "status": "error",
            "error": str(e),
            "overall_compliant": False,
            "checks": [
                {
                    "check_id": "llm_error",
                    "check_name": "LLM Processing Error",
                    "passed": False,
                    "message": f"Error during compliance check: {str(e)}",
                }
            ],
            "summary": {"total_checks": 1, "passed": 0, "failed": 1},
        }


def validate_compliance_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and ensure the compliance result has the correct structure.

    Args:
        result: Raw result from LLM

    Returns:
        Validated and properly structured result
    """
    # Ensure required fields exist
    if "overall_compliant" not in result:
        result["overall_compliant"] = False

    if "checks" not in result or not isinstance(result["checks"], list):
        result["checks"] = []

    if "summary" not in result:
        result["summary"] = {
            "total_checks": len(result["checks"]),
            "passed": sum(
                1 for check in result["checks"] if check.get("passed", False)
            ),
            "failed": sum(
                1 for check in result["checks"] if not check.get("passed", True)
            ),
        }

    return result
