"""
Value tile overlay system for New, White, and Clubcard promotions
"""
from PIL import Image, ImageDraw, ImageFont
import io
from typing import Optional


def add_value_tile(img: Image.Image, tile_type: str, 
                   price: Optional[str] = None, 
                   end_date: Optional[str] = None) -> Image.Image:
    """
    Add value tile overlays (New/White/Clubcard) at compliance-safe position.
    Position: Top-right area, avoiding safe zones.
    """
    draw = ImageDraw.Draw(img)
    
    # Fixed position (top-right, compliance safe)
    tile_x = img.width - 250
    tile_y = 80
    
    # Load font
    try:
        tile_font = ImageFont.truetype("arial.ttf", 28)
        small_font = ImageFont.truetype("arial.ttf", 18)
    except:
        tile_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    if tile_type == "new":
        # NEW badge (predefined design)
        draw.rectangle([tile_x, tile_y, tile_x + 100, tile_y + 40], 
                      fill="#FF0000", outline="#000000", width=2)
        draw.text((tile_x + 20, tile_y + 10), "NEW", fill="#FFFFFF", font=tile_font)
        
    elif tile_type == "white":
        # White price tile (user editable price)
        draw.rectangle([tile_x, tile_y, tile_x + 120, tile_y + 60], 
                      fill="#FFFFFF", outline="#000000", width=2)
        if price:
            draw.text((tile_x + 10, tile_y + 15), f"£{price}", 
                     fill="#000000", font=tile_font)
        
    elif tile_type == "clubcard":
        # Clubcard tile (flat design per PDF compliance)
        draw.rectangle([tile_x, tile_y, tile_x + 150, tile_y + 80], 
                      fill="#7C2F8A", outline="#000000", width=2)
        if price:
            draw.text((tile_x + 10, tile_y + 10), f"Clubcard", 
                     fill="#FFFFFF", font=small_font)
            draw.text((tile_x + 10, tile_y + 35), f"£{price}", 
                     fill="#FFFFFF", font=tile_font)
        if end_date:
            draw.text((tile_x + 10, tile_y + 60), f"Ends {end_date}", 
                     fill="#FFFFFF", font=small_font)
    
    return img
