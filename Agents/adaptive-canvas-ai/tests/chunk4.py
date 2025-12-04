# tests/test_chunk4.py
import os
from adaptive_canvas_ai.tools.gemini_vision import analyze_image

def test_gemini_vision():
    # Use the output from the previous step
    input_path = "test_output.png"
    
    if not os.path.exists(input_path):
        print("⚠️ SKIPPING: Run Chunk 3 test first to generate 'test_output.png'")
        return

    with open(input_path, "rb") as f:
        image_bytes = f.read()

    print("\n🚀 Sending Image to Gemini...")
    metadata = analyze_image(image_bytes)
    
    print("\n✅ GEMINI RESULTS:")
    print(f"   Brand: {metadata.brand_name}")
    print(f"   Category: {metadata.category}")
    print(f"   Is Alcohol?: {metadata.is_alcohol}")
    
    assert metadata.brand_name is not None

if __name__ == "__main__":
    test_gemini_vision()