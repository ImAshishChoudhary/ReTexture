"""
Spatial Grid System for Canvas Layout Analysis

Divides canvas into NxN grid for efficient spatial queries and density analysis.
Enables O(1) lookup of "what's in this region?" vs O(n) linear scans.

Core principle: Spatial partitioning reduces search space and enables
region-based reasoning (top-third, bottom-left quadrant, etc.)
"""

from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass


@dataclass
class Rectangle:
    """Immutable rectangle representation"""
    x: float
    y: float
    width: float
    height: float
    
    @property
    def x2(self) -> float:
        return self.x + self.width
    
    @property
    def y2(self) -> float:
        return self.y + self.height
    
    @property
    def center_x(self) -> float:
        return self.x + self.width / 2
    
    @property
    def center_y(self) -> float:
        return self.y + self.height / 2
    
    @property
    def area(self) -> float:
        return self.width * self.height
    
    def overlaps(self, other: 'Rectangle') -> bool:
        """Check if this rectangle overlaps with another"""
        return (self.x < other.x2 and self.x2 > other.x and
                self.y < other.y2 and self.y2 > other.y)
    
    def overlap_area(self, other: 'Rectangle') -> float:
        """Calculate area of overlap with another rectangle"""
        if not self.overlaps(other):
            return 0.0
        
        overlap_x = max(0, min(self.x2, other.x2) - max(self.x, other.x))
        overlap_y = max(0, min(self.y2, other.y2) - max(self.y, other.y))
        return overlap_x * overlap_y
    
    def contains_point(self, px: float, py: float) -> bool:
        """Check if point is inside rectangle"""
        return self.x <= px <= self.x2 and self.y <= py <= self.y2


@dataclass
class Element:
    """Canvas element with metadata"""
    rect: Rectangle
    element_type: str
    element_id: str
    text: Optional[str] = None


class SpatialGrid:
    """
    Spatial partitioning system for canvas layout analysis.
    
    Divides canvas into NxN grid (default 3x3) to enable:
    - Fast density queries per region
    - Region-based constraint checking ("top third must be empty")
    - Systematic exploration of canvas space
    
    Design decisions:
    - 3x3 grid matches retail layout conventions (top/mid/bottom × left/center/right)
    - Grid size is configurable for different canvas sizes
    - Uses immutable data structures for thread safety
    """
    
    def __init__(self, canvas_width: float, canvas_height: float, grid_size: int = 3):
        """
        Initialize spatial grid
        
        Args:
            canvas_width: Canvas width in pixels
            canvas_height: Canvas height in pixels  
            grid_size: Number of divisions per axis (default 3x3 = 9 cells)
        """
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.grid_size = grid_size
        
        self.cell_width = canvas_width / grid_size
        self.cell_height = canvas_height / grid_size
        
        # Grid storage: grid[row][col] = [elements in that cell]
        self.grid: List[List[List[Element]]] = [
            [[] for _ in range(grid_size)] 
            for _ in range(grid_size)
        ]
        
        # All elements (for global queries)
        self.all_elements: List[Element] = []
    
    def add_element(self, x: float, y: float, width: float, height: float, 
                    element_type: str, element_id: str, text: Optional[str] = None) -> None:
        """
        Add element to spatial grid
        
        Element may span multiple cells - added to all cells it overlaps.
        This enables accurate density calculations.
        
        Args:
            x, y: Top-left position
            width, height: Element dimensions
            element_type: Type (headline, badge, logo, etc.)
            element_id: Unique identifier
            text: Optional text content
        """
        rect = Rectangle(x, y, width, height)
        element = Element(rect, element_type, element_id, text)
        self.all_elements.append(element)
        
        # Determine which cells this element overlaps
        start_col = max(0, int(x / self.cell_width))
        end_col = min(self.grid_size - 1, int((x + width) / self.cell_width))
        start_row = max(0, int(y / self.cell_height))
        end_row = min(self.grid_size - 1, int((y + height) / self.cell_height))
        
        # Add to all overlapping cells
        for row in range(start_row, end_row + 1):
            for col in range(start_col, end_col + 1):
                self.grid[row][col].append(element)
    
    def get_density_map(self) -> List[List[float]]:
        """
        Calculate density (% occupied) for each grid cell
        
        Returns:
            2D array where density[row][col] = occupied percentage (0.0 to 1.0+)
            Values > 1.0 indicate overlapping elements
        """
        density = [[0.0 for _ in range(self.grid_size)] for _ in range(self.grid_size)]
        cell_area = self.cell_width * self.cell_height
        
        for i in range(self.grid_size):
            for j in range(self.grid_size):
                # Cell bounds
                cell = Rectangle(
                    j * self.cell_width, 
                    i * self.cell_height,
                    self.cell_width, 
                    self.cell_height
                )
                
                # Calculate total overlap area from all elements
                occupied_area = sum(
                    elem.rect.overlap_area(cell) 
                    for elem in self.grid[i][j]
                )
                
                density[i][j] = occupied_area / cell_area
        
        return density
    
    def get_elements_in_region(self, x: float, y: float, width: float, height: float) -> List[Element]:
        """
        Get all elements that overlap with specified region
        
        More efficient than checking all elements - only checks relevant cells.
        
        Args:
            x, y, width, height: Region bounds
            
        Returns:
            List of elements overlapping the region (may contain duplicates)
        """
        region = Rectangle(x, y, width, height)
        
        # Determine relevant cells
        start_col = max(0, int(x / self.cell_width))
        end_col = min(self.grid_size - 1, int((x + width) / self.cell_width))
        start_row = max(0, int(y / self.cell_height))
        end_row = min(self.grid_size - 1, int((y + height) / self.cell_height))
        
        # Collect elements (use set to avoid duplicates)
        elements_set = set()
        for row in range(start_row, end_row + 1):
            for col in range(start_col, end_col + 1):
                for elem in self.grid[row][col]:
                    if elem.rect.overlaps(region):
                        elements_set.add(elem.element_id)
        
        # Return actual element objects
        return [e for e in self.all_elements if e.element_id in elements_set]
    
    def get_empty_regions(self, threshold: float = 0.2) -> List[Tuple[int, int]]:
        """
        Find grid cells with low density (good placement candidates)
        
        Args:
            threshold: Maximum density to consider "empty" (default 20%)
            
        Returns:
            List of (row, col) tuples for empty cells
        """
        density = self.get_density_map()
        empty_cells = []
        
        for i in range(self.grid_size):
            for j in range(self.grid_size):
                if density[i][j] < threshold:
                    empty_cells.append((i, j))
        
        return empty_cells
    
    def get_cell_center(self, row: int, col: int) -> Tuple[float, float]:
        """Get center coordinates of specified grid cell"""
        center_x = col * self.cell_width + self.cell_width / 2
        center_y = row * self.cell_height + self.cell_height / 2
        return (center_x, center_y)
    
    def calculate_total_overlap(self, x: float, y: float, width: float, height: float) -> float:
        """
        Calculate total overlap area with all existing elements
        
        Returns:
            Total area of overlap in square pixels
        """
        test_rect = Rectangle(x, y, width, height)
        return sum(elem.rect.overlap_area(test_rect) for elem in self.all_elements)
    
    def get_visual_summary(self) -> str:
        """Generate ASCII visualization of grid density for debugging"""
        density = self.get_density_map()
        summary = f"Spatial Grid ({self.grid_size}x{self.grid_size}) - Canvas: {int(self.canvas_width)}x{int(self.canvas_height)}px\n"
        summary += "=" * 40 + "\n"
        
        for i, row in enumerate(density):
            row_str = f"Row {i}: "
            for j, d in enumerate(row):
                # Visual density indicator
                if d < 0.1:
                    marker = "□"  # Empty
                elif d < 0.4:
                    marker = "▤"  # Low
                elif d < 0.7:
                    marker = "▥"  # Medium
                else:
                    marker = "▣"  # High
                row_str += f"{marker} {d:5.1%}  "
            summary += row_str + "\n"
        
        summary += "=" * 40 + "\n"
        summary += f"Total elements: {len(self.all_elements)}\n"
        return summary
