"""
Logo overlay system with 4-corner positioning and drinkaware auto-apply
"""
from PIL import Image
import io
from pathlib import Path
from typing import Tuple


# Logo position calculators
def get_logo_position(img_width: int, img_height: int, 
                     logo_width: int, logo_height: int,
                     position: str, padding: int = 20) -> Tuple[int, int]:
    """Calculate logo position coordinates for 4 corners."""
    positions = {
        "top-left": (padding, padding),
        "top-right": (img_width - logo_width - padding, padding),
        "bottom-left": (padding, img_height - logo_height - padding),
        "bottom-right": (img_width - logo_width - padding, img_height - logo_height - padding),
    }
    return positions.get(position, positions["bottom-right"])


def get_opposite_corner(position: str) -> str:
    """Get opposite corner for drinkaware placement."""
    mapping = {
        "top-left": "bottom-right",
        "top-right": "bottom-left",
        "bottom-left": "top-right",
        "bottom-right": "top-left"
    }
    return mapping.get(position, "bottom-left")


def add_logos(img: Image.Image, is_alcohol: bool, logo_position: str) -> Image.Image:
    """
    Add Tesco logo and drinkaware (if alcohol) with 4-corner positioning.
    """
    # Check if logo files exist
    tesco_logo_path = Path("images/tesco-logo.png")
    drinkaware_logo_path = Path("images/drinkaware-logo.png")
    
    # Add Tesco logo
    if tesco_logo_path.exists():
        try:
            tesco_logo = Image.open(tesco_logo_path).convert("RGBA")
            # Resize to ~100px wide
            aspect = tesco_logo.height / tesco_logo.width
            tesco_logo = tesco_logo.resize((100, int(100 * aspect)), Image.LANCZOS)
            
            pos = get_logo_position(
                img.width, img.height,
                tesco_logo.width, tesco_logo.height,
                logo_position
            )
            
            # Paste with alpha channel
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            img.paste(tesco_logo, pos, tesco_logo)
            
        except Exception as e:
            print(f"Failed to add Tesco logo: {e}")
    
    # Add drinkaware logo if alcohol
    if is_alcohol and drinkaware_logo_path.exists():
        try:
            drinkaware = Image.open(drinkaware_logo_path).convert("RGBA")
            # Resize to ~80px wide (min 20px height per compliance)
            aspect = drinkaware.height / drinkaware.width
            new_width = 80
            new_height = max(int(new_width * aspect), 20)  # Ensure min 20px height
            drinkaware = drinkaware.resize((new_width, new_height), Image.LANCZOS)
            
            # Place at opposite corner
            opposite_pos = get_opposite_corner(logo_position)
            pos = get_logo_position(
                img.width, img.height,
                drinkaware.width, drinkaware.height,
                opposite_pos
            )
            
            img.paste(drinkaware, pos, drinkaware)
            
        except Exception as e:
            print(f"Failed to add drinkaware logo: {e}")
    
    # Convert back to RGB
    if img.mode == 'RGBA':
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        rgb_img.paste(img, mask=img.split()[3])
        return rgb_img
    
    return img
