# tests/test_chunk6.py
import os
from adaptive_canvas_ai.schemas import CreativeSpec
from adaptive_canvas_ai.graph import build_graph

def test_full_pipeline():
    """
    Runs the entire chain: Image -> Rembg -> Gemini -> Layout -> HTML
    """
    input_path = "test_image.jpg"
    
    # 1. Validation
    if not os.path.exists(input_path):
        print(f"⚠️ MISSING: Please put '{input_path}' in the root folder.")
        return

    # 2. Setup State
    with open(input_path, "rb") as f:
        image_bytes = f.read()
        
    initial_spec = CreativeSpec(request_id="full-run-001")
    initial_state = {
        "spec": initial_spec,
        "raw_image_bytes": image_bytes
    }
    
    # 3. Run Graph
    print("\n🚀 STARTING FULL PIPELINE...")
    app = build_graph()
    app.invoke(initial_state)
    
    # 4. Assertions
    assert os.path.exists("final_ad.html")
    assert os.path.exists("temp_packshot.png")
    print("\n🎉 SUCCESS: The pipeline ran end-to-end!")

if __name__ == "__main__":
    test_full_pipeline()