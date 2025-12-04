import base64
import os
from adaptive_canvas_ai.schemas import CreativeSpec

def get_image_src(content: str) -> str:
    """
    Encodes local images to Base64 so they appear in the browser sandbox.
    """
    # 1. If it's a Web URL (like the Tesco Logo), just return it.
    if content.startswith("http") or content.startswith("https") or content.startswith("data:"):
        return content
    
    # 2. If it's a Local File, convert to Base64.
    if os.path.exists(content):
        try:
            with open(content, "rb") as img_file:
                # Read bytes and encode to base64 string
                b64_data = base64.b64encode(img_file.read()).decode('utf-8')
            
            # Detect file type
            mime = "image/png"
            if content.lower().endswith(".jpg") or content.lower().endswith(".jpeg"):
                mime = "image/jpeg"
                
            return f"data:{mime};base64,{b64_data}"
        except Exception as e:
            print(f"⚠️ Error encoding image {content}: {e}")
            return content
    
    # 3. Fallback
    return content

def generate_html(spec: CreativeSpec) -> str:
    """
    Renders with TESCO SOCIAL STYLES (Badges, Blur, Shadows).
    """
    css = """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;800&family=Playfair+Display:ital,wght@1,700&display=swap');
        body { margin: 0; padding: 0; background: #222; }
        .canvas { position: relative; background: #fff; overflow: hidden; }
        .layer { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; }
        
        /* SHADOWS & BLUR */
        .bg-layer { width: 100%; height: 100%; object-fit: cover; filter: blur(4px); transform: scale(1.1); }
        .packshot { filter: drop-shadow(0 20px 30px rgba(0,0,0,0.5)); }
        
        /* TEXT */
        .headline { 
            font-family: 'Inter', sans-serif; 
            text-shadow: 0 2px 10px rgba(0,0,0,0.8);
            text-transform: uppercase;
            letter-spacing: -1px;
            line-height: 1.1;
        }

        /* --- TESCO BADGE SYSTEM --- */
        
        /* 1. CLUBCARD TILE (Yellow Box + Blue Footer) */
        .badge-clubcard {
            background: #FFD700; /* Tesco Yellow */
            color: black;
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            flex-direction: column;
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid white;
        }
        .badge-clubcard::after {
            content: 'Clubcard Price';
            background: #00539F; /* Tesco Blue */
            color: white;
            width: 100%;
            font-size: 18px;
            padding: 8px 0;
            position: absolute;
            bottom: 0;
        }

        /* 2. EXCLUSIVE/NEW LOZENGE (Pill Shape) */
        .badge-lozenge {
            background: #00539F;
            color: white;
            border-radius: 50px;
            font-family: 'Playfair Display', serif; /* Elegant font */
            font-style: italic;
            box-shadow: 5px 5px 15px rgba(0,0,0,0.3);
            transform: rotate(-5deg); /* Jaunty angle */
            border: 3px solid white;
        }
        
        /* 3. GOLD TILE (Wine) */
        .badge-gold_tile {
            background: linear-gradient(135deg, #cfc09f 0%, #ffecb3 50%, #b3a076 100%);
            color: #333;
            font-family: 'Playfair Display', serif;
            border-radius: 4px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.4);
            font-size: 32px !important;
        }

    </style>
    """

    layers_html = ""
    for layer in spec.layers:
        style = (
            f"left: {layer.bbox.x}px; top: {layer.bbox.y}px; "
            f"width: {layer.bbox.width}px; height: {layer.bbox.height}px; "
            f"z-index: {layer.z_index};"
        )
        
        div = ""
        
        # --- BADGE RENDERING ---
        if layer.id.startswith("badge_"):
            badge_class = layer.id.replace("badge_", "badge-")  # Fix class name consistency (e.g., badge_clubcard -> badge-clubcard)
            
            # Dynamic Font Sizing for Badges
            font_size = "60px" 
            if "clubcard" in layer.id:
                font_size = "60px"
            elif "lozenge" in layer.id:
                font_size = "40px"
            
            div = f'<div class="layer {badge_class}" style="{style} font-size:{font_size};">{layer.content}</div>'
            
        elif layer.type == "image":
            src = get_image_src(layer.content)
            css_class = "bg-layer" if layer.id == "bg" else "layer packshot"
            # Background logic
            if layer.id == "bg":
                div = f'<img class="{css_class}" src="{src}" style="z-index:{layer.z_index}">'
            else:
                div = f'<img class="{css_class}" src="{src}" style="{style} object-fit: contain;">'
        
        elif layer.type == "text":
            div = f'<div class="layer headline" style="{style} font-size:{layer.font_size}px; color:{layer.color};">{layer.content}</div>'
            
        elif layer.type == "background": # Solid colors (Drinkaware bar)
            div = f'<div class="layer" style="{style} background:{layer.color};"></div>'
            
        elif layer.type == "shape": # Fallback for shapes treated as badges
             # If a shape falls through here without matching badge_ logic, render as colored box
             div = f'<div class="layer" style="{style} background:{layer.color}; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:24px;">{layer.content}</div>'

        layers_html += div + "\n"

    w, h = spec.creative_size
    return f"<!DOCTYPE html><html><head>{css}</head><body><div class='canvas' style='width:{w}px; height:{h}px; margin:auto;'>{layers_html}</div></body></html>"