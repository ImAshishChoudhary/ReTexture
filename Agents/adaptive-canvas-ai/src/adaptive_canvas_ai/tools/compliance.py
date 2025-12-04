# src/adaptive_canvas_ai/tools/compliance.py
import re
from adaptive_canvas_ai.schemas import CreativeSpec, ComplianceStatus

def check_compliance(spec: CreativeSpec) -> CreativeSpec:
    print("   ... 👮 Checking Tesco Compliance Rules...")
    violations = []
    
    # 1. Alcohol Rules 
    if spec.product_metadata and spec.product_metadata.is_alcohol:
        # Check if any layer has "Drinkaware"
        has_drinkaware = any("drinkaware" in l.content.lower() for l in spec.layers if l.type == "text")
        if not has_drinkaware:
            violations.append("HARD FAIL: Alcohol product missing mandatory 'Drinkaware' text.")

    # 2. Safe Zones (9:16 Ratio) 
    # "Leave 200px off top and 250px off bottom free from text"
    for layer in spec.layers:
        if layer.type == "text":
            y_top = layer.bbox.y
            y_bottom = layer.bbox.y + layer.bbox.height
            
            if y_top < 200:
                violations.append(f"HARD FAIL: Text '{layer.id}' is in the Top Safe Zone (<200px).")
            if y_bottom > (1920 - 250): # Assuming 1920 height
                 violations.append(f"HARD FAIL: Text '{layer.id}' is in the Bottom Safe Zone (>1670px).")

    # 3. Forbidden Claims 
    # "Detect any 'green' claim... money-back guarantees"
    forbidden_patterns = [
        r"sustainable", r"eco-friendly", r"green", # Sustainability 
        r"money back", r"guarantee", # Money-back [cite: 6]
        r"\d+%", r"£\d+", r"save" # Price/Promos (Self-serve rule) [cite: 6]
    ]
    
    for layer in spec.layers:
        if layer.type == "text":
            for pattern in forbidden_patterns:
                if re.search(pattern, layer.content, re.IGNORECASE):
                    violations.append(f"HARD FAIL: Forbidden claim detected in '{layer.id}': {pattern}")

    # Update Status
    status = "fail" if violations else "pass"
    spec.compliance = ComplianceStatus(status=status, violations=violations)
    
    if violations:
        print(f"   ⚠️ VIOLATIONS FOUND: {violations}")
    else:
        print("   ✅ COMPLIANCE PASSED")

    return spec