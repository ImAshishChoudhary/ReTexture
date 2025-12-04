# src/adaptive_canvas_ai/tools/layout_engine.py
from adaptive_canvas_ai.schemas import CreativeSpec, Layer, BoundingBox

def apply_dynamic_layout(
    spec: CreativeSpec, 
    headline_text: str, 
    subhead_text: str,
    bg_image_path: str = None
) -> CreativeSpec:
    print(f"   ... 📐 Layout Engine: Applying 'Tesco Social' Style...")
    
    # 1. Canvas Dimensions
    w, h = (1080, 1080) if spec.format == "1:1" else (1080, 1920)
    spec.creative_size = (w, h)
    
    # 2. Background (The Aisle)
    if bg_image_path:
        bg_layer = Layer(
            id="bg", type="image", content=bg_image_path,
            bbox=BoundingBox(x=0, y=0, width=w, height=h), z_index=0
        )
    else:
        bg_layer = Layer(
            id="bg", type="background", content="", color="#f4f4f4", 
            bbox=BoundingBox(x=0, y=0, width=w, height=h), z_index=0
        )
    
    layers = [bg_layer]

    # 3. BADGE LOGIC (The "Stickers")
    # We analyze the headline to pick a badge style
    badge_type = None
    badge_text = ""
    
    lower_head = headline_text.lower()
    if "clubcard" in lower_head or "price" in lower_head:
        badge_type = "clubcard"
        badge_text = "£1.50" # Mock price for hackathon
    elif "new" in lower_head or "exclusive" in lower_head:
        badge_type = "lozenge"
        badge_text = "New" if "new" in lower_head else "Exclusive"
    elif "wine" in lower_head:
        badge_type = "gold_tile"
        badge_text = "Wine of\nthe Week"

    # 4. PACKSHOT (Floating "In-Hand" Position)
    # In their posts, the product is HUGE and centered.
    pack_w = 800
    pack_h = 800
    pack_x = (w - pack_w) // 2
    pack_y = (h - pack_h) // 2
    
    packshot_layer = Layer(
        id="packshot", type="image", content="temp_packshot.png",
        bbox=BoundingBox(x=pack_x, y=pack_y, width=pack_w, height=pack_h), 
        z_index=10
    )
    layers.append(packshot_layer)

    # 5. RENDER BADGE (If applicable)
    if badge_type:
        # Badges usually float Top-Right or Top-Left
        badge_layer = Layer(
            id=f"badge_{badge_type}", 
            type="shape", # New type we will handle in renderer
            content=badge_text,
            color="yellow" if badge_type == "clubcard" else "blue",
            bbox=BoundingBox(x=w-350, y=100, width=300, height=300), # Top Right
            z_index=50
        )
        layers.append(badge_layer)

    # 6. TEXT (Minimalist - Social style usually has less text on image)
    # We put the headline nicely at the bottom or top depending on badge
    text_y = h - 250
    layers.append(Layer(
        id="headline", type="text", content=headline_text, 
        color="#FFFFFF", font_size=48,
        bbox=BoundingBox(x=50, y=text_y, width=w-100, height=150), 
        z_index=20
    ))

    # 7. LOGO (Subtle branding)
    layers.append(Layer(
        id="logo", type="image", 
        content="https://upload.wikimedia.org/wikipedia/en/thumb/b/b0/Tesco_Logo.svg/1200px-Tesco_Logo.svg.png",
        bbox=BoundingBox(x=50, y=50, width=150, height=90), 
        z_index=100
    ))
    
    # 8. DRINKAWARE (Compliance)
    if spec.product_metadata and spec.product_metadata.is_alcohol:
        layers.append(Layer(
            id="drinkaware_bar", type="background", content="", color="#000",
            bbox=BoundingBox(x=0, y=h-100, width=w, height=100), z_index=90
        ))
        layers.append(Layer(
            id="drinkaware_text", type="text", content="Drinkaware.co.uk", color="#FFF", font_size=24,
            bbox=BoundingBox(x=0, y=h-70, width=w, height=50), z_index=95
        ))

    spec.layers = layers
    
    # Patch packshot content path
    p_layer = next((l for l in spec.layers if l.id == "packshot"), None)
    if p_layer: p_layer.content = "temp_packshot.png"

    return spec