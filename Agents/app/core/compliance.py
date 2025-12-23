from PIL import Image
from pathlib import Path

def add_compliance_overlay(image_path: str, overlay_path: str, position: str = "bottom-right", size_percent: float = 0.1, padding: int = 20) -> str:
    """
    Adds a compliance overlay (logo) to the image at image_path.
    Returns the path to the new image with overlay.
    """
    base = Image.open(image_path).convert("RGBA")
    overlay = Image.open(overlay_path).convert("RGBA")

    # Resize overlay
    overlay_width = int(base.width * size_percent)
    aspect = overlay.height / overlay.width
    overlay = overlay.resize((overlay_width, int(overlay_width * aspect)))

    # Position overlay
    if position == "bottom-right":
        x = base.width - overlay.width - padding
        y = base.height - overlay.height - padding
    elif position == "bottom-left":
        x = padding
        y = base.height - overlay.height - padding
    elif position == "top-right":
        x = base.width - overlay.width - padding
        y = padding
    elif position == "top-left":
        x = padding
        y = padding
    else:
        x = base.width - overlay.width - padding
        y = base.height - overlay.height - padding

    # Composite
    base.paste(overlay, (x, y), overlay)

    # Save new image
    out_path = str(Path(image_path).with_name(f"compliant_{Path(image_path).name}"))
    base = base.convert("RGB")
    base.save(out_path)
    return out_path
