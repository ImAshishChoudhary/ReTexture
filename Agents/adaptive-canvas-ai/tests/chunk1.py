# tests/test_chunk1.py
from adaptive_canvas_ai.schemas import CreativeSpec, Layer, BoundingBox

def test_valid_creative_spec():
    """Test that a valid spec is accepted."""
    spec = CreativeSpec(
        request_id="123",
        creative_size=(1080, 1920),
        layers=[
            Layer(
                id="headline",
                type="text",
                content="Delicious & Fresh",
                bbox=BoundingBox(x=50, y=50, width=500, height=100),
                z_index=2
            )
        ]
    )
    assert spec.request_id == "123"
    assert len(spec.layers) == 1
    print("\n✅ VALID SPEC TEST PASSED")

if __name__ == "__main__":
    test_valid_creative_spec()