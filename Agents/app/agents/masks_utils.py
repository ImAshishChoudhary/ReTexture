# app/agents/mask_utils.py

from PIL import Image, ImageOps
import io

def create_mask_from_transparent_image(image_bytes: bytes) -> tuple[bytes, bytes]:
    original = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    alpha = original.split()[-1]

    mask = ImageOps.invert(alpha)

    white_bg = Image.new("RGB", original.size, (255, 255, 255))
    white_bg.paste(original, mask=alpha)

    img_buffer = io.BytesIO()
    white_bg.save(img_buffer, "PNG")

    mask_buffer = io.BytesIO()
    mask.save(mask_buffer, "PNG")

    return img_buffer.getvalue(), mask_buffer.getvalue()
