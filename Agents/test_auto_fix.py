"""
Test script for auto-fix validation endpoint
Run this to test the /validate/auto-fix endpoint with sample violations
"""

import asyncio
import json
from app.routers.validate import auto_fix_compliance
from app.core.models import AutoFixRequest, ViolationInput
from dotenv import load_dotenv

load_dotenv(override=True)


async def test_auto_fix():
    """Test auto-fix with sample compliance violations"""

    # Sample HTML with violations
    sample_html = """
    <div class="canvas-container">
        <div class="element-text-headline-1">Product Name</div>
        <div class="element-text-body-2">Description text</div>
        <img class="element-image-img-1" src="{{ IMG_1 }}" alt="Product" />
    </div>
    """

    sample_css = """
    .canvas-container {
        position: relative;
        width: 1080px;
        height: 1920px;
        background-color: #ffffff;
    }
    
    .element-text-headline-1 {
        position: absolute;
        left: 40px;
        top: 150px;
        font-size: 18px;
        font-family: Inter;
        color: #333333;
    }
    
    .element-text-body-2 {
        position: absolute;
        left: 40px;
        top: 1750px;
        font-size: 14px;
        color: #666666;
    }
    
    .element-image-img-1 {
        position: absolute;
        left: 200px;
        top: 500px;
        width: 680px;
        height: 680px;
        object-fit: cover;
    }
    """

    # Sample violations
    violations = [
        ViolationInput(
            elementId="headline-1",
            rule="MIN_FONT_SIZE_HEADLINE",
            severity="hard",
            message="Headline font size is 18px, minimum required is 24px",
            autoFixable=True,
        ),
        ViolationInput(
            elementId="headline-1",
            rule="SAFE_ZONE_TOP",
            severity="hard",
            message="Element is in top safe zone (y=150, min=200)",
            autoFixable=True,
        ),
        ViolationInput(
            elementId="body-2",
            rule="SAFE_ZONE_BOTTOM",
            severity="hard",
            message="Element extends into bottom safe zone",
            autoFixable=True,
        ),
        ViolationInput(
            elementId=None,
            rule="TESCO_BRANDING_REQUIRED",
            severity="hard",
            message="No Tesco branding text found",
            autoFixable=True,
        ),
    ]

    # Create request
    request = AutoFixRequest(
        html=sample_html,
        css=sample_css,
        images={
            "IMG_1": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        violations=violations,
        canvas_width=1080,
        canvas_height=1920,
    )

    print("🧪 Testing /validate/auto-fix endpoint...")
    print(f"Input: {len(violations)} violations")
    print("-" * 60)

    # Call endpoint
    response = await auto_fix_compliance(request)

    print("\n📊 Results:")
    print(f"Success: {response.success}")
    print(f"Fixes Applied: {len(response.fixes_applied)}")
    print(f"LLM Iterations: {response.llm_iterations}")

    if response.success:
        print("\n✅ Applied Fixes:")
        for fix in response.fixes_applied:
            print(f"  - {fix.rule}: {fix.description}")
            print(f"    {fix.property}: {fix.old_value} → {fix.new_value}")

        print("\n📄 Corrected HTML (first 500 chars):")
        print(response.corrected_html[:500])

        if response.remaining_violations:
            print(f"\n⚠️ Remaining Violations: {len(response.remaining_violations)}")
    else:
        print(f"\n❌ Error: {response.error}")


if __name__ == "__main__":
    asyncio.run(test_auto_fix())
