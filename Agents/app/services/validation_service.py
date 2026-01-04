"""
Validation Service - HTML/CSS Compliance Validation with Image Placeholder Management
Handles base64 image extraction/restoration for LLM processing
"""

import re
import json
import logging
from typing import Dict, List, Tuple
from html.parser import HTMLParser

logger = logging.getLogger(__name__)


class ImagePlaceholderManager:
    """Manages base64 image extraction and restoration"""

    def __init__(self):
        self.image_map: Dict[str, str] = {}
        self.placeholder_counter = 0

    def replace_base64_with_placeholders(
        self, html: str, css: str
    ) -> Tuple[str, str, Dict[str, str]]:
        """
        Extract base64 images from HTML/CSS and replace with placeholders.

        Args:
            html: HTML string containing base64 image data URLs
            css: CSS string potentially containing background-image base64

        Returns:
            (cleaned_html, cleaned_css, image_map)
            image_map: {placeholder_id: base64_string}
        """
        self.image_map = {}
        self.placeholder_counter = 0

        # Process HTML - extract <img src="data:image/...">
        cleaned_html = self._extract_from_html_img_tags(html)

        # Process CSS - extract background-image: url(data:image/...)
        cleaned_css = self._extract_from_css_backgrounds(css)

        logger.info(
            f"🖼️ [VALIDATION] Extracted {len(self.image_map)} base64 images → placeholders"
        )
        return cleaned_html, cleaned_css, self.image_map

    def _extract_from_html_img_tags(self, html: str) -> str:
        """Extract base64 from <img src="data:image/..."> tags"""

        # Regex pattern: <img ... src="data:image/(png|jpeg|jpg|gif|webp);base64,..." ... >
        pattern = r'(<img[^>]+src=")data:image/(png|jpeg|jpg|gif|webp|avif);base64,([A-Za-z0-9+/=]+)("[^>]*>)'

        def replace_match(match):
            prefix = match.group(1)  # <img ... src="
            image_type = match.group(2)  # png, jpeg, etc.
            base64_data = match.group(3)  # actual base64 string
            suffix = match.group(4)  # " ... >

            placeholder_id = self._generate_placeholder()
            full_data_url = f"data:image/{image_type};base64,{base64_data}"

            self.image_map[placeholder_id] = full_data_url

            return f"{prefix}{{{{ {placeholder_id} }}}}{suffix}"

        cleaned_html = re.sub(pattern, replace_match, html, flags=re.IGNORECASE)
        return cleaned_html

    def _extract_from_css_backgrounds(self, css: str) -> str:
        """Extract base64 from background-image: url(data:image/...)"""

        # Pattern: background-image: url(data:image/...;base64,...)
        pattern = r"(background-image:\s*url\()data:image/(png|jpeg|jpg|gif|webp|avif);base64,([A-Za-z0-9+/=]+)(\))"

        def replace_match(match):
            prefix = match.group(1)  # background-image: url(
            image_type = match.group(2)
            base64_data = match.group(3)
            suffix = match.group(4)  # )

            placeholder_id = self._generate_placeholder()
            full_data_url = f"data:image/{image_type};base64,{base64_data}"

            self.image_map[placeholder_id] = full_data_url

            return f"{prefix}{{{{ {placeholder_id} }}}}{suffix}"

        cleaned_css = re.sub(pattern, replace_match, css, flags=re.IGNORECASE)
        return cleaned_css

    def _generate_placeholder(self) -> str:
        """Generate unique placeholder ID"""
        self.placeholder_counter += 1
        return f"IMG_{self.placeholder_counter}"

    def restore_base64_images(
        self, html: str, css: str, image_map: Dict[str, str]
    ) -> Tuple[str, str]:
        """
        Restore base64 images by replacing placeholders.

        Args:
            html: HTML with placeholders like {{ IMG_1 }}
            css: CSS with placeholders
            image_map: {placeholder_id: base64_data_url}

        Returns:
            (restored_html, restored_css)
        """
        restored_html = html
        restored_css = css

        for placeholder_id, base64_url in image_map.items():
            # Replace {{ IMG_N }} with actual base64 data URL
            placeholder_pattern = r"\{\{\s*" + re.escape(placeholder_id) + r"\s*\}\}"

            restored_html = re.sub(placeholder_pattern, base64_url, restored_html)
            restored_css = re.sub(placeholder_pattern, base64_url, restored_css)

        logger.info(
            f"🖼️ [VALIDATION] Restored {len(image_map)} base64 images from placeholders"
        )
        return restored_html, restored_css


class HTMLValidator:
    """Validates HTML structure"""

    @staticmethod
    def is_valid_html(html: str) -> bool:
        """
        Check if HTML is well-formed.
        Returns True if parseable, False otherwise.
        """

        class ValidatingParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.errors = []

            def error(self, message):
                self.errors.append(message)

        parser = ValidatingParser()
        try:
            parser.feed(html)
            parser.close()

            # Check for unclosed tags (basic validation)
            if parser.errors:
                logger.warning(f"⚠️ [VALIDATION] HTML parsing errors: {parser.errors}")
                return False

            # Basic structural checks
            if not html.strip():
                return False

            # Check for balanced tags (simplified check)
            open_tags = re.findall(r"<([a-zA-Z][a-zA-Z0-9]*)[^>]*>", html)
            close_tags = re.findall(r"</([a-zA-Z][a-zA-Z0-9]*)>", html)

            # Self-closing tags
            self_closing = ["img", "br", "hr", "input", "meta", "link"]
            open_tags = [tag for tag in open_tags if tag not in self_closing]

            # Very basic balance check
            if abs(len(open_tags) - len(close_tags)) > 5:  # Allow some tolerance
                logger.warning(
                    f"⚠️ [VALIDATION] Unbalanced tags: {len(open_tags)} open, {len(close_tags)} close"
                )
                return False

            return True

        except Exception as e:
            logger.error(f"❌ [VALIDATION] HTML validation failed: {e}")
            return False

    @staticmethod
    def extract_validation_metadata(html: str) -> Dict:
        """Extract metadata about HTML structure for debugging"""
        return {
            "element_count": len(re.findall(r"<[a-zA-Z]", html)),
            "has_container": "canvas-container" in html,
            "image_tags": len(re.findall(r"<img", html)),
            "text_elements": len(re.findall(r"<div[^>]*>.*?</div>", html)),
            "length": len(html),
        }


async def prepare_html_for_llm(html: str, css: str) -> Tuple[str, str, Dict[str, str]]:
    """
    Prepare HTML/CSS for LLM processing by extracting images.

    Args:
        html: Original HTML with base64 images
        css: Original CSS with potential base64 backgrounds

    Returns:
        (cleaned_html, cleaned_css, image_map)
    """
    manager = ImagePlaceholderManager()
    return manager.replace_base64_with_placeholders(html, css)


async def restore_html_from_llm(
    html: str, css: str, image_map: Dict[str, str] = None
) -> Tuple[str, str]:
    """
    Restore base64 images after LLM processing.

    Args:
        html: LLM-corrected HTML with placeholders
        css: LLM-corrected CSS with placeholders
        image_map: Original image mapping (can be None)

    Returns:
        (restored_html, restored_css)
    """
    if not image_map:
        return html, css
    manager = ImagePlaceholderManager()
    return manager.restore_base64_images(html, css, image_map)


async def validate_html_structure(html: str) -> bool:
    """
    Validate HTML structure.

    Args:
        html: HTML string to validate

    Returns:
        True if valid, False otherwise
    """
    return HTMLValidator.is_valid_html(html)
