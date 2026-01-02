"""
Test the exact payload that frontend sends to placement endpoint
"""
import requests
import json

AGENT_URL = 'http://localhost:8001'

# Simulate EXACT frontend payload
payload = {
    "canvas_size": {"w": 800, "h": 600},
    "elements": [
        {
            "id": "image-main",
            "type": "image",
            "x": 100,
            "y": 100,
            "width": 400,
            "height": 400,
            "text": None
        }
    ],
    "element_to_place": {
        "type": "headline",
        "width": 680,
        "height": 130
    },
    "subject_bounds": {
        "x": 200,
        "y": 150,
        "width": 350,
        "height": 450
    },
    "image_base64": None
}

print("📤 Sending request to /placement/smart")
print(json.dumps(payload, indent=2))
print("\n" + "="*60 + "\n")

try:
    response = requests.post(
        f"{AGENT_URL}/placement/smart",
        json=payload,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ SUCCESS!")
        print(json.dumps(response.json(), indent=2))
    else:
        print("❌ FAILED!")
        print("Response:")
        print(response.text)
        
except Exception as e:
    print(f"💥 Exception: {e}")
