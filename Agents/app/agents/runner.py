"""
Canvas Validation Runner - Complete Tesco Retail Media Compliance System
Parses Fabric.js JSON and validates against ALL Tesco compliance rules (20+ rules)
"""
from app.agents.builder import get_agent, is_agent_available
from app.core.models import ValidationResponse
from app.agents.config import RULESET
import json
import re
import logging
import math

logger = logging.getLogger(__name__)

# ==================== TESCO COMPLIANCE CONSTANTS ====================

SAFE_ZONES = {
    "9:16": {"topClear": 200, "bottomClear": 250}
}

MIN_FONT_SIZES = {
    "social": 20,
    "brand": 20,
    "checkout_double": 20,
    "checkout_single": 10,
    "says": 12,
    "default": 20
}

HEADLINE_MIN_FONT_SIZE = 24
WCAG_MIN_RATIO = 4.5
DRINKAWARE_MIN_HEIGHT = 20
DRINKAWARE_SAYS_MIN_HEIGHT = 12

# Packshot safe zones
PACKSHOT_GAP_DOUBLE_DENSITY = 24
PACKSHOT_GAP_SINGLE_DENSITY = 12

# Copy restrictions - ALL HARD FAIL
BLOCKED_KEYWORDS = [
    # T&Cs
    "t&c", "t&cs", "terms and conditions", "terms & conditions",
    # Competitions
    "win", "winner", "prize", "competition", "giveaway", "sweepstake",
    # Sustainability / Green claims
    "sustainability", "sustainable", "green", "eco-friendly", "eco friendly",
    "environmentally friendly", "carbon neutral", "carbon footprint",
    "recyclable", "recycled", "biodegradable", "organic",
    # Charity partnerships
    "charity", "charitable", "donation", "donate", "fundraising",
    # Price / Discount / Deal references (unless in value tile)
    "% off", "percent off", "half price", "buy one get one", "bogof",
    "2 for", "3 for", "deal", "offer", "save £", "was £", "now £",
    # Money-back guarantees
    "money-back", "money back", "guarantee", "guaranteed", "refund",
    # Claims with asterisks
    "claim*", "proven*", "tested*", "certified*",
    "clinically proven", "scientifically proven", "dermatologically tested",
    "survey says", "according to survey", "studies show"
]

# Allowed Tesco tag texts - ONLY these are permitted
ALLOWED_TESCO_TAGS = [
    "only at tesco",
    "available at tesco",
    "selected stores. while stocks last.",
    "selected stores. while stocks last",
    # Clubcard variant
    "available in selected stores. clubcard/app required. ends"
]

# LEP (Low Everyday Price) requirements
LEP_REQUIRED_TAG = "selected stores. while stocks last"

# Value tile types
VALUE_TILE_TYPES = ["new", "white", "clubcard"]

# CTA is NOT allowed
CTA_KEYWORDS = ["shop now", "buy now", "click here", "learn more", "find out more", "order now", "get it now"]


# ==================== HELPER FUNCTIONS ====================

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join([c*2 for c in hex_color])
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except:
        return (0, 0, 0)


def get_luminance(rgb: tuple) -> float:
    """Calculate relative luminance for WCAG contrast"""
    def adjust(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)


def get_contrast_ratio(color1: str, color2: str) -> float:
    """Calculate WCAG contrast ratio between two colors"""
    try:
        l1 = get_luminance(hex_to_rgb(color1))
        l2 = get_luminance(hex_to_rgb(color2))
        lighter = max(l1, l2)
        darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
    except:
        return 1.0


def get_bounding_box(element: dict) -> dict:
    """Get bounding box for an element"""
    x = element.get('left', element.get('x', 0))
    y = element.get('top', element.get('y', 0))
    width = element.get('width', 100) * element.get('scaleX', 1)
    height = element.get('height', 50) * element.get('scaleY', 1)
    
    if element.get('type') in ['text', 'textbox', 'i-text']:
        font_size = element.get('fontSize', 16)
        text = element.get('text', '')
        width = max(width, len(text) * font_size * 0.6)
        height = max(height, font_size * 1.2)
    
    return {
        'x1': x, 'y1': y,
        'x2': x + width, 'y2': y + height,
        'width': width, 'height': height
    }


def is_color_black_or_white(color: str) -> bool:
    """Check if color is pure black or white"""
    if not color:
        return False
    color = color.lower().strip()
    return color in ['#000000', '#000', 'black', '#ffffff', '#fff', 'white', 'rgb(0,0,0)', 'rgb(255,255,255)']


def check_overlap(box1: dict, box2: dict) -> bool:
    """Check if two bounding boxes overlap"""
    return not (box1['x2'] < box2['x1'] or box1['x1'] > box2['x2'] or
                box1['y2'] < box2['y1'] or box1['y1'] > box2['y2'])


def parse_fabric_canvas(canvas_json: str) -> dict:
    """Parse Fabric.js canvas JSON and extract elements"""
    try:
        data = json.loads(canvas_json)
    except json.JSONDecodeError:
        logger.error("Failed to parse canvas JSON")
        return {"objects": [], "background": "#ffffff", "width": 1080, "height": 1920}
    
    if isinstance(data, dict):
        objects = data.get('objects', [])
        background = data.get('background', data.get('backgroundColor', '#ffffff'))
        width = data.get('width', 1080)
        height = data.get('height', 1920)
    else:
        objects = []
        background = '#ffffff'
        width = 1080
        height = 1920
    
    return {
        "objects": objects,
        "background": background if isinstance(background, str) else '#ffffff',
        "width": width,
        "height": height
    }


# ==================== ALL 20 TESCO VALIDATION RULES ====================

def check_tesco_tag(objects: list) -> list:
    """
    Rule 1: TESCO_TAG - Mandatory Tesco branding
    If creative links to Tesco, a Tesco tag is mandatory
    Checks for: text tags, logo images, sticker images, or custom properties
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    image_elements = [o for o in objects if o.get('type') == 'image']
    
    has_text_tag = False
    for el in text_elements:
        text = (el.get('text') or '').lower().strip()
        if any(tag in text for tag in ALLOWED_TESCO_TAGS):
            has_text_tag = True
            break
    
    # Check for Tesco logo or sticker by src path
    has_logo = any('tesco' in (el.get('src') or '').lower() and 'logo' in (el.get('src') or '').lower() 
                   for el in image_elements)
    
    has_sticker = any('sticker' in (el.get('src') or '').lower() and 'tesco' in (el.get('src') or '').lower()
                      for el in image_elements)
    
    # Also check for custom properties set by frontend auto-fix
    has_custom_tag = any(
        el.get('isTescoTag') == True or 
        el.get('stickerType') == 'tesco-tag' or
        'tesco' in (el.get('customId') or '').lower() or
        'only-at' in (el.get('customId') or '').lower() or
        'available-at' in (el.get('customId') or '').lower()
        for el in objects
    )
    
    if not (has_text_tag or has_logo or has_sticker or has_custom_tag):
        violations.append({
            "elementId": None,
            "rule": "TESCO_TAG",
            "severity": "hard",
            "message": "Missing required Tesco tag ('Available at Tesco' or 'Only at Tesco') or Tesco logo",
            "autoFixable": True,
            "autoFix": {"action": "add_sticker", "sticker": "available_at_tesco"}
        })
    
    return violations


def check_headline(objects: list) -> list:
    """
    Rule 2: HEADLINE - Must have headline text
    Headline appears on all banners, minimum 24px
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    has_headline = False
    for el in text_elements:
        font_size = el.get('fontSize', 16)
        text = (el.get('text') or '').strip()
        is_tag = any(tag in text.lower() for tag in ALLOWED_TESCO_TAGS)
        
        if font_size >= HEADLINE_MIN_FONT_SIZE and len(text) > 0 and not is_tag:
            has_headline = True
            break
    
    if not has_headline:
        violations.append({
            "elementId": None,
            "rule": "HEADLINE",
            "severity": "hard",
            "message": f"Missing headline text (minimum {HEADLINE_MIN_FONT_SIZE}px font size required)",
            "autoFixable": True,
            "autoFix": {"action": "add_element", "type": "headline", "fontSize": HEADLINE_MIN_FONT_SIZE}
        })
    
    return violations


def check_subhead(objects: list) -> list:
    """
    Rule 3: SUBHEAD - Subhead appears on all banners
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    # Check for at least 2 text elements (headline + subhead)
    non_tag_texts = []
    for el in text_elements:
        text = (el.get('text') or '').strip().lower()
        if not any(tag in text for tag in ALLOWED_TESCO_TAGS):
            non_tag_texts.append(el)
    
    if len(non_tag_texts) < 2:
        violations.append({
            "elementId": None,
            "rule": "SUBHEAD",
            "severity": "warning",
            "message": "Consider adding a subhead text for better communication",
            "autoFixable": True,
            "autoFix": {"action": "add_element", "type": "subhead", "fontSize": 18}
        })
    
    return violations


def check_min_font_size(objects: list, format_type: str = "social") -> list:
    """
    Rule 4: MIN_FONT_SIZE - Accessibility requirement
    Brand / Checkout Double / Social: 20px | Checkout Single: 10px | SAYS: 12px
    """
    violations = []
    min_size = MIN_FONT_SIZES.get(format_type, MIN_FONT_SIZES["default"])
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    for el in text_elements:
        font_size = el.get('fontSize', 16)
        el_id = el.get('id', 'unknown')
        
        if font_size < min_size:
            violations.append({
                "elementId": el_id,
                "rule": "MIN_FONT_SIZE",
                "severity": "hard",
                "message": f"Font size {font_size}px is below minimum {min_size}px",
                "autoFixable": True,
                "autoFix": {"property": "fontSize", "value": min_size}
            })
    
    return violations


def check_safe_zones(objects: list, canvas_width: int, canvas_height: int) -> list:
    """
    Rule 5: SAFE_ZONE - Social safe zones (9:16 format)
    Top 200px and bottom 250px must be free of text/logos
    """
    violations = []
    
    aspect_ratio = canvas_width / canvas_height
    is_916 = abs(aspect_ratio - (9/16)) < 0.05
    
    if not is_916:
        return violations
    
    safe_zones = SAFE_ZONES["9:16"]
    
    # Check text elements and logos
    check_elements = [o for o in objects if o.get('type', '').lower() in ['text', 'textbox', 'i-text']]
    
    # Also check logo images
    logo_images = [o for o in objects if o.get('type') == 'image' and 'logo' in (o.get('src') or '').lower()]
    check_elements.extend(logo_images)
    
    for el in check_elements:
        box = get_bounding_box(el)
        el_id = el.get('id', 'unknown')
        el_type = el.get('type', 'element')
        text_preview = (el.get('text') or el_type)[:20]
        
        # Top safe zone
        if box['y1'] < safe_zones['topClear']:
            violations.append({
                "elementId": el_id,
                "rule": "SAFE_ZONE",
                "severity": "hard",
                "message": f"'{text_preview}' is in top safe zone (top 200px must be clear)",
                "autoFixable": True,
                "autoFix": {"property": "top", "value": safe_zones['topClear'] + 10}
            })
        
        # Bottom safe zone
        bottom_limit = canvas_height - safe_zones['bottomClear']
        if box['y2'] > bottom_limit:
            violations.append({
                "elementId": el_id,
                "rule": "SAFE_ZONE",
                "severity": "hard",
                "message": f"'{text_preview}' is in bottom safe zone (bottom 250px must be clear)",
                "autoFixable": True,
                "autoFix": {"property": "top", "value": bottom_limit - box['height'] - 10}
            })
    
    return violations


def check_contrast(objects: list, background: str) -> list:
    """
    Rule 6: CONTRAST - WCAG AA compliance
    Must meet 4.5:1 contrast ratio for text
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    for el in text_elements:
        fill = el.get('fill', '#000000')
        el_id = el.get('id', 'unknown')
        
        if not fill or not isinstance(fill, str) or not fill.startswith('#'):
            continue
        
        ratio = get_contrast_ratio(fill, background)
        
        if ratio < WCAG_MIN_RATIO:
            white_ratio = get_contrast_ratio('#ffffff', background)
            black_ratio = get_contrast_ratio('#000000', background)
            suggested = '#ffffff' if white_ratio > black_ratio else '#000000'
            
            violations.append({
                "elementId": el_id,
                "rule": "CONTRAST",
                "severity": "hard",
                "message": f"Contrast ratio {ratio:.1f}:1 is below WCAG minimum {WCAG_MIN_RATIO}:1",
                "autoFixable": True,
                "autoFix": {"property": "fill", "value": suggested}
            })
    
    return violations


def check_blocked_keywords(objects: list) -> list:
    """
    Rule 7: BLOCKED_COPY - Prohibited content
    T&Cs, competitions, sustainability claims, charity, price refs, money-back, claims
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    for el in text_elements:
        text = (el.get('text') or '').lower()
        el_id = el.get('id', 'unknown')
        
        for keyword in BLOCKED_KEYWORDS:
            if keyword in text:
                violations.append({
                    "elementId": el_id,
                    "rule": "BLOCKED_COPY",
                    "severity": "hard",
                    "message": f"Prohibited content: '{keyword}' - T&Cs, competitions, sustainability, charity, price refs not allowed",
                    "autoFixable": False,
                    "autoFix": None
                })
                break  # One violation per element
    
    return violations


def check_cta_not_allowed(objects: list) -> list:
    """
    Rule 8: NO_CTA - CTA buttons/text are NOT allowed
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    for el in text_elements:
        text = (el.get('text') or '').lower()
        el_id = el.get('id', 'unknown')
        
        for cta in CTA_KEYWORDS:
            if cta in text:
                violations.append({
                    "elementId": el_id,
                    "rule": "NO_CTA",
                    "severity": "hard",
                    "message": f"CTA text '{cta}' is not allowed in Tesco creatives",
                    "autoFixable": False,
                    "autoFix": None
                })
                break
    
    return violations


def check_packshot(objects: list) -> list:
    """
    Rule 9: PACKSHOT - Maximum 3 packshots, lead product mandatory
    """
    violations = []
    image_elements = [o for o in objects if o.get('type') == 'image']
    
    # Filter product images (not logos/stickers)
    product_images = []
    for el in image_elements:
        src = (el.get('src') or '').lower()
        if 'tesco' in src or 'logo' in src or 'sticker' in src:
            continue
        width = el.get('width', 0) * el.get('scaleX', 1)
        height = el.get('height', 0) * el.get('scaleY', 1)
        if width > 50 and height > 50:
            product_images.append(el)
    
    if len(product_images) > 3:
        violations.append({
            "elementId": None,
            "rule": "PACKSHOT",
            "severity": "hard",
            "message": f"Maximum 3 packshots allowed, found {len(product_images)}",
            "autoFixable": False,
            "autoFix": None
        })
    
    if len(product_images) == 0:
        violations.append({
            "elementId": None,
            "rule": "PACKSHOT",
            "severity": "warning",
            "message": "Lead product packshot is recommended",
            "autoFixable": False,
            "autoFix": None
        })
    
    return violations


def check_packshot_safe_zone(objects: list) -> list:
    """
    Rule 10: PACKSHOT_GAP - Packshot spacing requirements
    Double density: 24px minimum gap | Single density: 12px minimum gap
    """
    violations = []
    image_elements = [o for o in objects if o.get('type') == 'image']
    
    # Find packshots
    packshots = []
    for el in image_elements:
        src = (el.get('src') or '').lower()
        if 'tesco' not in src and 'logo' not in src and 'sticker' not in src:
            width = el.get('width', 0) * el.get('scaleX', 1)
            if width > 50:
                packshots.append(el)
    
    # Check gap between packshots
    for i, ps in enumerate(packshots):
        ps_box = get_bounding_box(ps)
        for j, other in enumerate(packshots):
            if i >= j:
                continue
            other_box = get_bounding_box(other)
            
            h_gap = max(0, max(ps_box['x1'] - other_box['x2'], other_box['x1'] - ps_box['x2']))
            v_gap = max(0, max(ps_box['y1'] - other_box['y2'], other_box['y1'] - ps_box['y2']))
            min_gap = min(h_gap, v_gap) if h_gap > 0 or v_gap > 0 else 0
            
            if check_overlap(ps_box, other_box) or min_gap < PACKSHOT_GAP_DOUBLE_DENSITY:
                violations.append({
                    "elementId": ps.get('id'),
                    "rule": "PACKSHOT_GAP",
                    "severity": "warning",
                    "message": f"Packshots need minimum {PACKSHOT_GAP_DOUBLE_DENSITY}px gap between them",
                    "autoFixable": True,
                    "autoFix": {"property": "spacing", "value": PACKSHOT_GAP_DOUBLE_DENSITY}
                })
                break
    
    return violations


def check_value_tile(objects: list) -> list:
    """
    Rule 11: VALUE_TILE - Value tile rules
    Types: New, White, Clubcard - Nothing may overlap the value tile
    """
    violations = []
    
    # Find value tiles by name or custom property
    value_tiles = []
    for el in objects:
        name = (el.get('name') or el.get('id') or '').lower()
        if any(vt in name for vt in ['value_tile', 'valuetile', 'price_tile', 'clubcard_tile', 'new_tile']):
            value_tiles.append(el)
    
    # Check for overlap with value tiles
    for tile in value_tiles:
        tile_box = get_bounding_box(tile)
        
        for el in objects:
            if el == tile:
                continue
            el_box = get_bounding_box(el)
            
            if check_overlap(tile_box, el_box):
                violations.append({
                    "elementId": el.get('id'),
                    "rule": "VALUE_TILE_OVERLAP",
                    "severity": "hard",
                    "message": "Element overlaps value tile - nothing may overlap the value tile",
                    "autoFixable": True,
                    "autoFix": {"action": "move_away", "from": tile.get('id')}
                })
    
    return violations


def check_clubcard_date(objects: list) -> list:
    """
    Rule 12: CLUBCARD_DATE - DD/MM format required
    If Clubcard Price tile is used, tag must include 'Clubcard/app required. Ends DD/MM'
    """
    violations = []
    
    # Check for Clubcard tile
    has_clubcard_tile = False
    for el in objects:
        name = (el.get('name') or el.get('id') or '').lower()
        src = (el.get('src') or '').lower()
        if 'clubcard' in name or 'clubcard' in src:
            has_clubcard_tile = True
            break
    
    if not has_clubcard_tile:
        return violations
    
    # Must have proper date format in tags
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    has_proper_tag = False
    
    for el in text_elements:
        text = (el.get('text') or '').lower()
        # Check for DD/MM pattern
        if 'clubcard' in text and 'ends' in text:
            date_pattern = re.search(r'\d{1,2}/\d{1,2}', text)
            if date_pattern:
                has_proper_tag = True
                break
    
    if not has_proper_tag:
        violations.append({
            "elementId": None,
            "rule": "CLUBCARD_DATE",
            "severity": "hard",
            "message": "Clubcard tile requires tag with 'Clubcard/app required. Ends DD/MM' format",
            "autoFixable": True,
            "autoFix": {"action": "add_text", "text": "Clubcard/app required. Ends DD/MM"}
        })
    
    return violations


def check_drinkaware(objects: list, background: str) -> list:
    """
    Rule 13: DRINKAWARE - Alcohol campaigns requirement
    Mandatory for alcohol, must be black or white, min 20px (12px for SAYS)
    """
    violations = []
    
    # Check if this is an alcohol campaign
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    alcohol_keywords = ['beer', 'wine', 'spirit', 'vodka', 'whisky', 'gin', 'rum', 'alcohol', 'lager', 'ale', 'cider']
    
    is_alcohol_campaign = False
    for el in text_elements:
        text = (el.get('text') or '').lower()
        if any(kw in text for kw in alcohol_keywords):
            is_alcohol_campaign = True
            break
    
    if not is_alcohol_campaign:
        return violations
    
    # Check for Drinkaware logo/text
    has_drinkaware = False
    drinkaware_element = None
    
    for el in objects:
        src = (el.get('src') or '').lower()
        text = (el.get('text') or '').lower()
        if 'drinkaware' in src or 'drinkaware' in text:
            has_drinkaware = True
            drinkaware_element = el
            break
    
    if not has_drinkaware:
        violations.append({
            "elementId": None,
            "rule": "DRINKAWARE",
            "severity": "hard",
            "message": "Alcohol campaigns require Drinkaware lock-up (all-black or all-white, min 20px height)",
            "autoFixable": True,
            "autoFix": {"action": "add_drinkaware"}
        })
    else:
        # Check Drinkaware element properties
        if drinkaware_element:
            fill = drinkaware_element.get('fill', '')
            height = drinkaware_element.get('height', 0) * drinkaware_element.get('scaleY', 1)
            
            if height < DRINKAWARE_MIN_HEIGHT:
                violations.append({
                    "elementId": drinkaware_element.get('id'),
                    "rule": "DRINKAWARE_SIZE",
                    "severity": "hard",
                    "message": f"Drinkaware must be minimum {DRINKAWARE_MIN_HEIGHT}px height",
                    "autoFixable": True,
                    "autoFix": {"property": "height", "value": DRINKAWARE_MIN_HEIGHT}
                })
            
            if fill and not is_color_black_or_white(fill):
                violations.append({
                    "elementId": drinkaware_element.get('id'),
                    "rule": "DRINKAWARE_COLOR",
                    "severity": "hard",
                    "message": "Drinkaware must be all-black or all-white only",
                    "autoFixable": True,
                    "autoFix": {"property": "fill", "value": "#000000"}
                })
    
    return violations


def check_logo_presence(objects: list) -> list:
    """
    Rule 14: LOGO - Logo appears on all banners
    Can be uploaded or from brand library
    """
    violations = []
    image_elements = [o for o in objects if o.get('type') == 'image']
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    # Check for logo in image src or name
    has_logo_image = any('logo' in (el.get('src') or el.get('name') or '').lower() for el in image_elements)
    
    # Check for custom property isLogo or customId containing "logo"
    has_custom_logo = any(
        el.get('isLogo') == True or 
        'brand-logo' in (el.get('customId') or '').lower() or
        ('logo' in (el.get('customId') or '').lower() and 'tesco' not in (el.get('customId') or '').lower())
        for el in objects
    )
    
    # Don't count Tesco tags as brand logos
    has_logo = has_logo_image or has_custom_logo
    
    if not has_logo:
        violations.append({
            "elementId": None,
            "rule": "LOGO",
            "severity": "warning",
            "message": "Brand logo should appear on all banners",
            "autoFixable": True,
            "autoFix": {"action": "add_logo"}
        })
    
    return violations


def check_text_alignment(objects: list) -> list:
    """
    Rule 15: TEXT_ALIGNMENT - LEP copy must be left-aligned
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    # Check if this is LEP format
    is_lep = False
    for el in text_elements:
        text = (el.get('text') or '').lower()
        if 'low everyday price' in text or 'lep' in text:
            is_lep = True
            break
    
    if is_lep:
        for el in text_elements:
            text_align = el.get('textAlign', 'left')
            if text_align != 'left':
                violations.append({
                    "elementId": el.get('id'),
                    "rule": "TEXT_ALIGNMENT",
                    "severity": "hard",
                    "message": "LEP copy must be left-aligned",
                    "autoFixable": True,
                    "autoFix": {"property": "textAlign", "value": "left"}
                })
    
    return violations


def check_photography_people(objects: list) -> list:
    """
    Rule 16: PEOPLE_PHOTO - Detect presence of people in images
    User must confirm people are integral to campaign (warning)
    """
    violations = []
    image_elements = [o for o in objects if o.get('type') == 'image']
    
    # Check for people-related keywords in image names/sources
    people_keywords = ['person', 'people', 'human', 'face', 'model', 'portrait']
    
    for el in image_elements:
        src = (el.get('src') or el.get('name') or '').lower()
        if any(kw in src for kw in people_keywords):
            violations.append({
                "elementId": el.get('id'),
                "rule": "PEOPLE_PHOTO",
                "severity": "warning",
                "message": "Photography with people detected - confirm people are integral to the campaign",
                "autoFixable": False,
                "autoFix": None
            })
            break
    
    return violations


def check_tag_text_validity(objects: list) -> list:
    """
    Rule 17: TAG_TEXT - Only allowed Tesco tag texts permitted
    Skip text elements marked as brand logos
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    for el in text_elements:
        # Skip if this is marked as a logo
        if el.get('isLogo') == True or 'logo' in (el.get('customId') or '').lower():
            continue
            
        text = (el.get('text') or '').lower().strip()
        
        # If it mentions Tesco, it must be an allowed tag format
        if 'tesco' in text:
            is_allowed = any(allowed in text for allowed in ALLOWED_TESCO_TAGS)
            if not is_allowed:
                violations.append({
                    "elementId": el.get('id'),
                    "rule": "TAG_TEXT",
                    "severity": "hard",
                    "message": "Tesco tag must use allowed format: 'Only at Tesco', 'Available at Tesco', or 'Selected stores. While stocks last.'",
                    "autoFixable": True,
                    "autoFix": {"property": "text", "value": "Available at Tesco"}
                })
    
    return violations


def check_tag_overlap(objects: list) -> list:
    """
    Rule 18: TAG_OVERLAP - Tesco tags must not be overlapped
    """
    violations = []
    
    # Find Tesco tags
    tesco_tags = []
    for el in objects:
        if el.get('type') in ['text', 'textbox', 'i-text']:
            text = (el.get('text') or '').lower()
            if any(tag in text for tag in ALLOWED_TESCO_TAGS):
                tesco_tags.append(el)
    
    # Check for overlap
    for tag in tesco_tags:
        tag_box = get_bounding_box(tag)
        
        for el in objects:
            if el == tag:
                continue
            el_box = get_bounding_box(el)
            
            if check_overlap(tag_box, el_box):
                violations.append({
                    "elementId": tag.get('id'),
                    "rule": "TAG_OVERLAP",
                    "severity": "hard",
                    "message": "Tesco tag must not be overlapped by other elements",
                    "autoFixable": True,
                    "autoFix": {"action": "bring_to_front"}
                })
                break
    
    return violations


def check_background(objects: list, background: str) -> list:
    """
    Rule 19: BACKGROUND - Flat color or single image allowed
    """
    violations = []
    
    # Check background images (should be max 1)
    bg_images = [o for o in objects if o.get('type') == 'image' and 
                 (o.get('name') or '').lower() in ['background', 'bg']]
    
    if len(bg_images) > 1:
        violations.append({
            "elementId": None,
            "rule": "BACKGROUND",
            "severity": "warning",
            "message": "Only single background image upload is allowed",
            "autoFixable": False,
            "autoFix": None
        })
    
    return violations


def check_lep_rules(objects: list, background: str) -> list:
    """
    Rule 20: LEP_RULES - Low Everyday Price specific rules
    White background, Tesco blue font, white value tile, left-aligned
    """
    violations = []
    text_elements = [o for o in objects if o.get('type') in ['text', 'textbox', 'i-text']]
    
    # Check if LEP design
    is_lep = False
    for el in text_elements:
        text = (el.get('text') or '').lower()
        if 'low everyday price' in text or 'lep' in text:
            is_lep = True
            break
    
    if not is_lep:
        return violations
    
    # LEP requires white background
    if background.lower() not in ['#ffffff', '#fff', 'white', 'rgb(255,255,255)']:
        violations.append({
            "elementId": None,
            "rule": "LEP_BACKGROUND",
            "severity": "hard",
            "message": "LEP design requires white background",
            "autoFixable": True,
            "autoFix": {"property": "background", "value": "#ffffff"}
        })
    
    # LEP requires mandatory tag
    has_lep_tag = False
    for el in text_elements:
        text = (el.get('text') or '').lower()
        if LEP_REQUIRED_TAG in text:
            has_lep_tag = True
            break
    
    if not has_lep_tag:
        violations.append({
            "elementId": None,
            "rule": "LEP_TAG",
            "severity": "hard",
            "message": "LEP design requires tag: 'Selected stores. While stocks last'",
            "autoFixable": True,
            "autoFix": {"action": "add_text", "text": "Selected stores. While stocks last"}
        })
    
    return violations


# ==================== HTML PREVIEW GENERATOR ====================

def generate_html_preview(canvas_data: dict, violations: list) -> str:
    """Generate HTML preview of canvas with violation highlights"""
    objects = canvas_data['objects']
    width = canvas_data['width']
    height = canvas_data['height']
    background = canvas_data['background']
    
    violation_ids = [v.get('elementId') for v in violations if v.get('elementId')]
    
    elements_html = []
    for obj in objects:
        obj_id = obj.get('id', '')
        has_violation = obj_id in violation_ids
        
        x = obj.get('left', obj.get('x', 0))
        y = obj.get('top', obj.get('y', 0))
        rotation = obj.get('angle', 0)
        opacity = obj.get('opacity', 1)
        scale_x = obj.get('scaleX', 1)
        scale_y = obj.get('scaleY', 1)
        actual_width = obj.get('width', 100) * scale_x
        actual_height = obj.get('height', 100) * scale_y
        
        violation_style = 'outline: 3px solid #ff4d4f; outline-offset: 2px;' if has_violation else ''
        
        obj_type = obj.get('type', '').lower()
        
        if obj_type in ['text', 'textbox', 'i-text']:
            font_size = obj.get('fontSize', 16)
            font_family = obj.get('fontFamily', 'Arial')
            fill = obj.get('fill', '#000000')
            font_weight = 'bold' if obj.get('fontWeight') == 'bold' else 'normal'
            text_align = obj.get('textAlign', 'left')
            text = obj.get('text', '')
            
            elements_html.append(f'''<div style="
                position: absolute;
                left: {x}px;
                top: {y}px;
                transform: rotate({rotation}deg);
                opacity: {opacity};
                font-size: {font_size}px;
                font-family: {font_family};
                color: {fill};
                font-weight: {font_weight};
                text-align: {text_align};
                white-space: pre-wrap;
                max-width: {actual_width}px;
                {violation_style}
            ">{text}</div>''')
        
        elif obj_type == 'image':
            src = obj.get('src', '')
            elements_html.append(f'''<img src="{src}" style="
                position: absolute;
                left: {x}px;
                top: {y}px;
                width: {actual_width}px;
                height: {actual_height}px;
                transform: rotate({rotation}deg);
                opacity: {opacity};
                object-fit: cover;
                {violation_style}
            " />''')
    
    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {{ box-sizing: border-box; }}
        body {{ margin: 0; padding: 20px; background: #1a1a1a; font-family: Arial; }}
        .canvas-container {{ 
            position: relative; 
            width: {width}px; 
            height: {height}px; 
            background: {background};
            margin: 0 auto;
            overflow: hidden;
        }}
    </style>
</head>
<body>
    <div class="canvas-container">
        {''.join(elements_html)}
    </div>
</body>
</html>'''
    
    return html


# ==================== MAIN VALIDATION ====================

def validate_canvas_locally(canvas: str) -> ValidationResponse:
    """Full local validation against ALL 20 Tesco compliance rules"""
    logger.info("🔍 [TESCO COMPLIANCE] Starting full validation (20 rules)...")
    
    canvas_data = parse_fabric_canvas(canvas)
    objects = canvas_data['objects']
    background = canvas_data['background']
    width = canvas_data['width']
    height = canvas_data['height']
    
    logger.info(f"📊 Canvas: {width}x{height}px, {len(objects)} objects")
    
    # Run ALL 20 validation rules
    all_violations = []
    
    # Essential rules (1-3)
    logger.info("📝 Checking essential elements...")
    all_violations.extend(check_tesco_tag(objects))           # Rule 1
    all_violations.extend(check_headline(objects))            # Rule 2
    all_violations.extend(check_subhead(objects))             # Rule 3
    
    # Font & text rules (4, 15, 17)
    logger.info("🔤 Checking font & text rules...")
    all_violations.extend(check_min_font_size(objects))       # Rule 4
    all_violations.extend(check_text_alignment(objects))      # Rule 15
    all_violations.extend(check_tag_text_validity(objects))   # Rule 17
    
    # Layout rules (5, 11, 18)
    logger.info("📐 Checking layout rules...")
    all_violations.extend(check_safe_zones(objects, width, height))  # Rule 5
    all_violations.extend(check_value_tile(objects))          # Rule 11
    all_violations.extend(check_tag_overlap(objects))         # Rule 18
    
    # Visual rules (6, 19)
    logger.info("🎨 Checking visual rules...")
    all_violations.extend(check_contrast(objects, background)) # Rule 6
    all_violations.extend(check_background(objects, background)) # Rule 19
    
    # Content rules (7, 8)
    logger.info("📄 Checking content rules...")
    all_violations.extend(check_blocked_keywords(objects))    # Rule 7
    all_violations.extend(check_cta_not_allowed(objects))     # Rule 8
    
    # Image/Packshot rules (9, 10, 14, 16)
    logger.info("🖼️ Checking packshot rules...")
    all_violations.extend(check_packshot(objects))            # Rule 9
    all_violations.extend(check_packshot_safe_zone(objects))  # Rule 10
    all_violations.extend(check_logo_presence(objects))       # Rule 14
    all_violations.extend(check_photography_people(objects))  # Rule 16
    
    # Special format rules (12, 13, 20)
    logger.info("⭐ Checking special format rules...")
    all_violations.extend(check_clubcard_date(objects))       # Rule 12
    all_violations.extend(check_drinkaware(objects, background)) # Rule 13
    all_violations.extend(check_lep_rules(objects, background))  # Rule 20
    
    # Calculate results
    hard_fails = [v for v in all_violations if v['severity'] == 'hard']
    warnings = [v for v in all_violations if v['severity'] == 'warning']
    
    total_rules = 20
    failed_rules = len(set(v['rule'] for v in hard_fails))
    score = max(0, 100 - (failed_rules * 5) - (len(warnings) * 2))
    compliant = len(hard_fails) == 0
    
    logger.info(f"{'✅' if compliant else '❌'} Result: {'COMPLIANT' if compliant else 'NON-COMPLIANT'}")
    logger.info(f"📈 Score: {score}/100 | Hard fails: {len(hard_fails)} | Warnings: {len(warnings)}")
    
    # Generate preview
    html_preview = generate_html_preview(canvas_data, all_violations)
    
    # Format issues for frontend
    issues = [{
        "rule": v["rule"],
        "type": v["rule"],
        "severity": "critical" if v["severity"] == "hard" else "warning",
        "message": v["message"],
        "elementId": v.get("elementId"),
        "autoFixable": v.get("autoFixable", False),
        "fix": v.get("autoFix")
    } for v in all_violations]
    
    suggestions = []
    if not compliant:
        for v in all_violations[:5]:  # Top 5 suggestions
            suggestions.append(v["message"])
    else:
        suggestions.append("Canvas meets all Tesco compliance requirements ✅")
    
    return ValidationResponse(
        canvas=html_preview,
        compliant=compliant,
        issues=issues,
        suggestions=list(set(suggestions))
    )


async def run_validation(canvas: str) -> ValidationResponse:
    """Run validation with full Tesco compliance checks"""
    return validate_canvas_locally(canvas)
