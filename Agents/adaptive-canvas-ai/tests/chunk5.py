# tests/test_chunk5.py
import os
from adaptive_canvas_ai.schemas import CreativeSpec, Layer, BoundingBox
from adaptive_canvas_ai.tools.renderer import generate_html

def test_renderer():
    """
    Creates a fake ad and saves it as 'test_ad.html'.
    """
    # 1. Create a Fake Spec (The Blueprint)
    spec = CreativeSpec(
        request_id="demo-1",
        creative_size=(1080, 1080),
        layers=[
            # Background
            Layer(
                id="bg", type="background", content="", 
                color="#00539F", # Tesco Blue
                bbox=BoundingBox(x=0, y=0, width=1080, height=1080), 
                z_index=0
            ),
            # Headline
            Layer(
                id="headline", type="text", content="Angry Potato: The Snack that Bites Back", 
                color="#FFFFFF", font_size=60,
                bbox=BoundingBox(x=50, y=100, width=900, height=200), 
                z_index=10
            ),
            # Disclaimer
            Layer(
                id="legal", type="text", content="Selected stores only.", 
                color="#CCCCCC", font_size=24,
                bbox=BoundingBox(x=50, y=1000, width=500, height=50), 
                z_index=10
            )
        ]
    )

    # 2. Render
    print("\n🎨 Rendering HTML...")
    html_content = generate_html(spec)

    # 3. Save
    output_path = "test_ad.html"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ Saved to {output_path}")
    
    # 4. Check if file exists
    assert os.path.exists(output_path)
    assert "Angry Potato" in html_content

if __name__ == "__main__":
    test_renderer()