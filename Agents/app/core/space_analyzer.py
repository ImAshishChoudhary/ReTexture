"""
Intelligent Space Analysis for Layout Placement

Analyzes canvas to find free space regions where text can fit aesthetically.
Uses product/element positions to identify available placement zones.

Key principle: Don't generate candidates blindly - analyze where space EXISTS first,
then generate candidates only in viable regions.
"""

from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass
from app.core.spatial_grid import SpatialGrid, Element, Rectangle


@dataclass
class FreeSpaceRegion:
    """A contiguous free space region on the canvas"""
    rect: Rectangle
    region_type: str  # "top", "bottom", "left", "right", "center"
    area: float
    density: float  # How empty it is (0.0 = completely empty, 1.0 = full)
    
    def can_fit(self, width: float, height: float, margin: float = 40) -> bool:
        """Check if element of given size can fit with margins"""
        return (self.rect.width >= width + 2 * margin and 
                self.rect.height >= height + 2 * margin)


class SpaceAnalyzer:
    """
    Analyzes canvas layout to find optimal placement zones
    
    Strategy:
    1. Identify product/main element position
    2. Calculate free space regions (top, bottom, left, right)
    3. Rank regions by size and emptiness
    4. Generate placement candidates in best regions
    """
    
    def __init__(self, canvas_width: float, canvas_height: float,
                 spatial_grid: SpatialGrid, subject_bounds: Optional[Rectangle] = None):
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.grid = spatial_grid
        self.subject_bounds = subject_bounds
        
    def find_product_bounds(self) -> Optional[Rectangle]:
        """
        Find the main product/image element
        
        Strategy: Largest image element is usually the product
        """
        product = None
        max_area = 0
        
        for elem in self.grid.all_elements:
            if elem.element_type == "image" and elem.rect.area > max_area:
                max_area = elem.rect.area
                product = elem
        
        return product.rect if product else None
    
    def analyze_free_space(self) -> List[FreeSpaceRegion]:
        """
        Analyze canvas and identify free space regions
        
        Strategy:
        1. Find main product/obstacle bounds
        2. Divide canvas into regions around it (top, bottom, left, right)
        3. Calculate density for each region
        4. Rank by usable space (area × emptiness)
        
        Returns regions sorted by desirability (best first)
        """
        regions = []
        margin = 40  # Minimum spacing from obstacles
        
        # Canvas boundary
        canvas = self.subject_bounds or Rectangle(0, 0, self.canvas_width, self.canvas_height)
        
        # Find main product/obstacle
        product = self.find_product_bounds()
        
        if not product:
            # No obstacles - entire canvas available
            regions.append(FreeSpaceRegion(
                rect=canvas,
                region_type="full",
                area=canvas.area,
                density=0.0
            ))
            return regions
        
        print(f"[SPACE] Product found: {product.x:.0f},{product.y:.0f} size {product.width:.0f}x{product.height:.0f}")
        
        # Helper to create and validate region
        def add_region(region_type: str, x: float, y: float, width: float, height: float):
            # Clamp to canvas bounds
            x = max(canvas.x, x)
            y = max(canvas.y, y)
            width = min(width, canvas.x + canvas.width - x)
            height = min(height, canvas.y + canvas.height - y)
            
            if width > 80 and height > 80:  # Minimum usable size
                rect = Rectangle(x, y, width, height)
                density = self._calculate_region_density(rect)
                regions.append(FreeSpaceRegion(
                    rect=rect,
                    region_type=region_type,
                    area=rect.area,
                    density=density
                ))
                print(f"[SPACE] {region_type.upper()}: {width:.0f}×{height:.0f}px, {(1-density)*100:.0f}% empty")
        
        # Calculate regions around product
        add_region("top", canvas.x, canvas.y, canvas.width, product.y - canvas.y - margin)
        add_region("bottom", canvas.x, product.y + product.height + margin, canvas.width, 
                   canvas.y + canvas.height - (product.y + product.height + margin))
        add_region("left", canvas.x, canvas.y, product.x - canvas.x - margin, canvas.height)
        add_region("right", product.x + product.width + margin, canvas.y,
                   canvas.x + canvas.width - (product.x + product.width + margin), canvas.height)
        
        # Sort by usable space (area × emptiness)
        regions.sort(key=lambda r: r.area * (1 - r.density), reverse=True)
        
        if regions:
            print(f"[SPACE] BEST region: {regions[0].region_type}")
        
        return regions
    
    def _calculate_region_density(self, region: Rectangle) -> float:
        """Calculate what % of region is occupied by elements"""
        overlapping_elements = self.grid.get_elements_in_region(
            region.x, region.y, region.width, region.height
        )
        
        if not overlapping_elements:
            return 0.0
        
        total_overlap = sum(
            elem.rect.overlap_area(region) 
            for elem in overlapping_elements
        )
        
        return min(1.0, total_overlap / region.area)
    
    def get_best_position_for_element(self, width: float, height: float, 
                                     element_type: str) -> List[Tuple[float, float, str]]:
        """
        Generate optimal positions for element based on free space analysis
        
        Returns: List of (x, y, reasoning) tuples, sorted by desirability
        """
        free_regions = self.analyze_free_space()
        positions = []
        
        # Filter regions that can fit the element
        viable_regions = [r for r in free_regions if r.can_fit(width, height, margin=60)]
        
        if not viable_regions:
            # Try smaller margin
            viable_regions = [r for r in free_regions if r.can_fit(width, height, margin=20)]
        
        if not viable_regions and free_regions:
            # Element too large - text must be resized
            if element_type in ["headline", "subheading"]:
                canvas = self.subject_bounds or Rectangle(0, 0, self.canvas_width, self.canvas_height)
                print(f"[SPACE] ERROR: {element_type} {width:.0f}x{height:.0f} too large for canvas {canvas.width:.0f}x{canvas.height:.0f}")
                return []
            viable_regions = [free_regions[0]]  # Fallback to largest
        
        # Prioritize bottom region for headlines/text (retail design standard)
        if element_type in ["headline", "subheading"] and viable_regions:
            bottom_regions = [r for r in viable_regions if r.region_type == "bottom"]
            if bottom_regions:
                viable_regions = bottom_regions + [r for r in viable_regions if r.region_type != "bottom"]
                print(f"[SPACE] Prioritizing BOTTOM for {element_type}")
        
        print(f"[SPACE] Viable regions: {len(viable_regions)}")
        
        # Generate positions in top 3 regions
        canvas = self.subject_bounds or Rectangle(0, 0, self.canvas_width, self.canvas_height)
        
        for region in viable_regions[:3]:
            x, y = self._calculate_position_in_region(region, width, height, element_type)
            
            # Validate bounds
            if (canvas.x <= x and x + width <= canvas.x + canvas.width and
                canvas.y <= y and y + height <= canvas.y + canvas.height):
                reasoning = f"{region.region_type} region ({(1-region.density)*100:.0f}% empty)"
                positions.append((x, y, reasoning))
                print(f"[SPACE] ✓ Position: ({x:.0f}, {y:.0f}) in {region.region_type}")
            else:
                print(f"[SPACE] ✗ Rejected: ({x:.0f}, {y:.0f}) exceeds bounds")
        
        print(f"[SPACE] Generated {len(positions)} valid positions")
        return positions
    
    def _calculate_position_in_region(self, region: FreeSpaceRegion, 
                                     width: float, height: float, 
                                     element_type: str) -> Tuple[float, float]:
        """Calculate optimal x,y within a region based on element type"""
        rect = region.rect
        
        if element_type in ["headline", "subheading"]:
            # Center horizontally
            x = rect.x + (rect.width - width) / 2
            
            # Vertical positioning by region type
            if region.region_type == "bottom":
                y = rect.y + rect.height - height - 30  # Near bottom
                y = max(rect.y + 20, y)
            elif region.region_type == "top":
                y = rect.y + 50  # Below top edge
            else:
                y = rect.y + (rect.height - height) / 2  # Centered
                
        elif element_type == "badge":
            # Corner positioning
            if region.region_type in ["bottom", "top"]:
                x = rect.x + 50  # Left corner
                y = rect.y + rect.height - height - 50
            else:
                x = rect.x + 50
                y = rect.y + 50
                
        elif element_type in ["product_image", "image"]:
            # Centered for prominence
            x = rect.x + (rect.width - width) / 2
            if region.region_type == "top":
                y = rect.y + 40
            else:
                y = rect.y + (rect.height - height) / 3  # Slightly above center
                
        else:
            # Default: centered
            x = rect.x + (rect.width - width) / 2
            y = rect.y + (rect.height - height) / 2
        
        return x, y
    
    def get_space_summary(self) -> str:
        """Generate human-readable summary of available space"""
        regions = self.analyze_free_space()
        
        summary = "Free Space Analysis:\n"
        summary += "=" * 50 + "\n"
        
        for i, region in enumerate(regions, 1):
            summary += f"{i}. {region.region_type.upper()}: "
            summary += f"{region.rect.width:.0f}×{region.rect.height:.0f}px "
            summary += f"({region.area/1000:.1f}k px²) "
            summary += f"- {(1-region.density)*100:.0f}% empty\n"
        
        summary += "=" * 50 + "\n"
        
        return summary
