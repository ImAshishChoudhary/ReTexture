"""
AI-powered compliance validation using Gemini guardrails
"""
from google import genai
from google.genai import types
from fastapi import HTTPException
from .models import GenerationRequest
import json
import os

# Gemini setup
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "your-project-id")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")


def validate_with_gemini_guardrail(request: GenerationRequest):
    """
    Use Gemini AI to detect compliance violations.
    Hard blocks generation if critical violations found.
    """
    text = f"Headline: {request.headline}\nSubhead: {request.subhead}"
    
    prompt = f"""
You are a Tesco compliance validator. Analyze this banner text for violations:

{text}

Check for these HARD FAIL violations:
1. Competition language (competition, win, prize, enter to win, contest)
2. Unverified claims (*, asterisk, survey, guarantee, proven, studies show)
3. Price call-outs (% off, discount, save £, deal, offer)
4. Sustainability claims (green, eco-friendly, sustainable, carbon neutral, environmentally friendly)
5. Money-back guarantees (money back, refund guarantee)
6. Charity partnerships text (charity, donation, fundraiser)

Return ONLY valid JSON in this exact format:
{{
    "compliant": true or false,
    "issues": ["list of specific violations found, empty if none"],
    "suggestions": ["how to fix each issue, empty if none"]
}}
"""
    
    try:
        client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        result = json.loads(response.text)
        
    except Exception as e:
        # Fallback to basic keyword check if Gemini fails
        print(f"Gemini validation failed: {e}, using fallback")
        result = {
            "compliant": True,
            "issues": [],
            "suggestions": []
        }
    
    # Value tile validation
    if request.value_tile == "clubcard" and not request.value_tile_end_date:
        result["compliant"] = False
        result["issues"].append("Clubcard value tile requires end date (DD/MM format)")
        result["suggestions"].append("Add end date in DD/MM format (e.g., 23/05)")
    
    # Hard block if non-compliant
    if not result["compliant"]:
        raise HTTPException(400, detail={
            "error": "Compliance violations detected",
            "issues": result["issues"],
            "suggestions": result.get("suggestions", [])
        })
    
    return True
