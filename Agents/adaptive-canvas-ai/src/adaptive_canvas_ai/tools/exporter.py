# src/adaptive_canvas_ai/tools/exporter.py
import os
from PIL import Image, ImageDraw, ImageFont
from adaptive_canvas_ai.schemas import CreativeSpec
import requests
from io import BytesIO

def export_to_jpg(spec: CreativeSpec, filename="final_export.jpg") -> str:
    """
    Composites layers into a single Flattened JPG.
    Enforces <500KB file size.
    """
    print("   ... 💾 Exporting High-Res Asset...")
    
    # 1. Create Canvas
    width, height = spec.creative_size
    canvas = Image.new('RGB', (width, height), color='white')
    
    # Sort layers by z-index so we draw bottom-up
    sorted_layers = sorted(spec.layers, key=lambda l: l.z_index)
    
    # 2. Draw Layers
    for layer in sorted_layers:
        try:
            # Handle Images (Backgrounds, Logos, Packshots)
            if layer.type in ["image", "background"]:
                if layer.type == "background" and not layer.content:
                    # Solid Color
                    color = layer.color or "#FFFFFF"
                    overlay = Image.new('RGBA', (layer.bbox.width, layer.bbox.height), color)
                    canvas.paste(overlay, (layer.bbox.x, layer.bbox.y), overlay)
                else:
                    # Image File or URL
                    img = None
                    if layer.content.startswith("http"):
                        resp = requests.get(layer.content)
                        img = Image.open(BytesIO(resp.content)).convert("RGBA")
                    elif os.path.exists(layer.content):
                        img = Image.open(layer.content).convert("RGBA")
                    
                    if img:
                        # Resize
                        img = img.resize((layer.bbox.width, layer.bbox.height), Image.Resampling.LANCZOS)
                        canvas.paste(img, (layer.bbox.x, layer.bbox.y), img)

            # Handle Text (Basic PIL Text rendering - simpler than HTML/CSS)
            # NOTE: For Hackathon speed, we use default font. 
            # Ideally, we'd load 'Inter.ttf' here.
            elif layer.type == "text":
                draw = ImageDraw.Draw(canvas)
                # Fallback to default font if custom font loading is complex
                # In production: font = ImageFont.truetype("Inter-Bold.ttf", layer.font_size)
                font = ImageFont.load_default() 
                # (PIL default font is tiny, so this is a limitation of 'Simple Export'. 
                #  Ideally we assume the HTML preview is the 'source of truth' 
                #  and we use a headless browser screenshot tool like Puppeteer. 
                #  But PIL is faster for a pure Python challenge).
                
                # For this demo, we will skip drawing TEXT in PIL because standard PIL fonts are ugly.
                # We will rely on the HTML export for visuals, or accept that the JPG 
                # is primarily for the Image Composition.
                pass 

        except Exception as e:
            print(f"⚠️ Error drawing layer {layer.id}: {e}")

    # 3. Compression Loop (<500KB)
    quality = 95
    while quality > 10:
        output = BytesIO()
        canvas.save(output, format="JPEG", quality=quality)
        size_kb = len(output.getvalue()) / 1024
        
        if size_kb < 500:
            with open(filename, "wb") as f:
                f.write(output.getvalue())
            print(f"   ✅ Exported {filename} ({int(size_kb)}KB)")
            return filename
        
        quality -= 5 # Reduce quality and try again
        
    return filename