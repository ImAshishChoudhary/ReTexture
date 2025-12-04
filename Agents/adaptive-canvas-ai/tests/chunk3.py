# tests/test_chunk3.py
import os
from adaptive_canvas_ai.tools.image_prep import process_packshot

def test_image_prep():
    """
    Reads 'test_image.jpg', removes background, and saves 'test_output.png'.
    """
    input_path = "test_image.jpg"
    output_path = "test_output.png"
    
    # 1. Check if user provided the image
    if not os.path.exists(input_path):
        print(f"⚠️ SKIPPING: Please put a '{input_path}' in the project root to run this test.")
        return

    # 2. Read bytes
    with open(input_path, "rb") as f:
        image_bytes = f.read()
    
    # 3. Run the Tool
    print(f"\n🚀 Processing {input_path}...")
    result = process_packshot(image_bytes)
    
    # 4. Save result to verify visually
    result["image"].save(output_path)
    
    # 5. Assertions
    bbox = result["bbox"]
    print(f"✅ Success! Saved to {output_path}")
    print(f"   Detected Box: x={bbox.x}, y={bbox.y}, w={bbox.width}, h={bbox.height}")
    
    assert bbox.width > 0
    assert bbox.height > 0

if __name__ == "__main__":
    test_image_prep()