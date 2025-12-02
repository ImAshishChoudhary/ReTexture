# app/agents/background_processors.py

import io
import numpy as np
import cv2
from rembg import remove, new_session
from PIL import Image

_session = None

def get_session():
    global _session
    if _session is None:
        _session = new_session("u2net")
    return _session

def remove_background_and_crop(image_bytes: bytes) -> bytes:
    try:
        input_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        session = get_session()

        # Remove background using rembg
        no_bg_image = remove(input_image, session=session, alpha_matting=False)

        img_np = np.array(no_bg_image)

        if img_np.shape[-1] != 4:
            raise RuntimeError("Processed image missing alpha channel")

        alpha = img_np[:, :, 3]
        coords = cv2.findNonZero(alpha)

        if coords is None:
            buffer = io.BytesIO()
            no_bg_image.save(buffer, "PNG")
            return buffer.getvalue()

        x, y, w, h = cv2.boundingRect(coords)
        padding = 10

        crop_box = (
            max(0, x - padding),
            max(0, y - padding),
            min(input_image.width, x + w + padding),
            min(input_image.height, y + h + padding),
        )

        cropped = no_bg_image.crop(crop_box)
        buffer = io.BytesIO()
        cropped.save(buffer, "PNG")
        return buffer.getvalue()

    except Exception as e:
        raise e
