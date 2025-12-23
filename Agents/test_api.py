import requests
import json

# Test the Agent API directly
print("[Test] Testing Agent API at http://localhost:8000/generate/variations")

# Simple test with a data URL
test_request = {
    "product_filename": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "concept": "product photography"
}

try:
    response = requests.post(
        "http://localhost:8000/generate/variations",
        json=test_request,
        timeout=150  # 150 second timeout for the 50-65 second generation
    )
    
    print(f"[Test] Response status: {response.status_code}")
    print(f"[Test] Response headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[Test] SUCCESS - Got {len(data.get('variations', []))} variations")
        print(f"[Test] Response structure: {list(data.keys())}")
        if data.get('variations'):
            print(f"[Test] First variation starts with: {data['variations'][0][:100]}...")
    else:
        print(f"[Test] FAILED - Error: {response.text}")
        
except Exception as e:
    print(f"[Test] EXCEPTION: {type(e).__name__}: {str(e)}")
