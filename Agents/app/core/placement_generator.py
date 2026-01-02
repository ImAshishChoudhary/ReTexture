"""
Candidate Generation System for Placement

Generates multiple placement candidates using different strategies:
1. **Space analysis** (find free regions first) - PRIMARY
2. Grid-based sampling (systematic coverage)
3. Anchor-based positioning (relative to existing elements)
4. Empty-region centers (density-based)

Design principle: ANALYZE SPACE FIRST, then generate candidates in viable areas.
"""

from typing import List, Tuple
from app.core.spatial_grid import SpatialGrid, Element, Rectangle
from app.core.placement_constraints import ConstraintScorer, PlacementCandidate
from app.core.space_analyzer import SpaceAnalyzer


class CandidateGenerator:
    """
    Systematic generation of placement candidates
    
    Philosophy: Don't rely on LLM to generate coordinates from scratch.
    Instead, deterministically generate many candidates using spatial rules,
    then score and rank them. LLM can optionally refine the top choices.
    
    Strategies:
    - Grid sampling: Uniform coverage of canvas space
    - Anchoring: Position relative to existing elements (compositional layouts)
    - Empty regions: Target low-density areas
    """
    
    def __init__(self, canvas_width: float, canvas_height: float,
                 spatial_grid: SpatialGrid, scorer: ConstraintScorer):
        """
        Initialize candidate generator
        
        Args:
            canvas_width, canvas_height: Canvas dimensions
            spatial_grid: Pre-populated spatial grid
            scorer: Constraint scorer for evaluating candidates
        """
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.grid = spatial_grid
        self.scorer = scorer
    
    def generate_candidates(self, width: float, height: float, 
                          element_type: str, max_candidates: int = 100) -> List[PlacementCandidate]:
        """
        Generate and rank placement candidates using intelligent space analysis
        
        NEW APPROACH: Analyze free space FIRST, generate candidates in viable regions
        
        Args:
            width, height: Element dimensions to place
            element_type: Type (headline, subheading, badge, logo)
            max_candidates: Maximum candidates to generate
            
        Returns:
            Sorted list of candidates (best first)
        """
        candidates: List[PlacementCandidate] = []
        
        # STEP 1: Analyze free space and get smart positions
        space_analyzer = SpaceAnalyzer(
            canvas_width=self.canvas_width,
            canvas_height=self.canvas_height,
            spatial_grid=self.grid,
            subject_bounds=self.scorer.subject_bounds if hasattr(self.scorer, 'subject_bounds') else None
        )
        
        # Get space analysis summary
        print(space_analyzer.get_space_summary())
        
        # Get best positions based on actual free space
        smart_positions = space_analyzer.get_best_position_for_element(width, height, element_type)
        
        for x, y, reasoning in smart_positions:
            candidates.append(PlacementCandidate(
                x=x, 
                y=y, 
                score=0,
                reasoning=[reasoning],
                method="space-analysis"
            ))
        
        # STEP 2: Add grid-based samples in free regions (backup)
        grid_candidates = self._generate_grid_based(width, height, element_type)
        candidates.extend(grid_candidates)
        
        # STEP 3: Add anchor-based positions (compositional)
        anchor_candidates = self._generate_anchor_based(width, height, element_type)
        candidates.extend(anchor_candidates)
        
        # Remove duplicates
        candidates = self._deduplicate_candidates(candidates)
        
        # Score all candidates
        scored_candidates = []
        for candidate in candidates:
            scored = self.scorer.score_placement(
                candidate.x, candidate.y, width, height, element_type
            )
            scored.method = candidate.method  # Preserve generation method
            scored_candidates.append(scored)
        
        # Sort by score (highest first) and limit
        scored_candidates.sort(reverse=True, key=lambda c: c.score)
        return scored_candidates[:max_candidates]
    
    def _generate_grid_based(self, width: float, height: float, 
                            element_type: str, grid_step: int = 80) -> List[PlacementCandidate]:
        """
        Generate candidates on a uniform grid
        
        If subject bounds exist, focus grid on EMPTY REGIONS within that area.
        Avoid dense regions where the product image likely is.
        
        For headlines/text: Focus on top and bottom bands (avoid middle where product usually is)
        """
        candidates = []
        margin = 50
        
        # If subject bounds exist, use smarter grid within it
        if hasattr(self.scorer, 'subject_bounds') and self.scorer.subject_bounds:
            sb = self.scorer.subject_bounds
            
            # Get density map to find empty regions
            density = self.grid.get_density_map()
            
            # For headlines/subheadings: Sample top and bottom bands only
            if element_type in ["headline", "subheading"]:
                # Top band (first row of grid cells)
                for j in range(self.grid.grid_size):
                    if density[0][j] < 0.6:  # Not too dense
                        x = sb.x + j * self.grid.cell_width + margin
                        y = sb.y + margin
                        if x + width <= sb.x + sb.width - margin:
                            candidates.append(PlacementCandidate(x, y, 0, [], "grid-top"))
                
                # Bottom band (last row of grid cells)
                for j in range(self.grid.grid_size):
                    if density[self.grid.grid_size - 1][j] < 0.4:  # Prefer empty
                        x = sb.x + j * self.grid.cell_width + margin
                        y = sb.y + sb.height - height - margin
                        if x + width <= sb.x + sb.width - margin:
                            candidates.append(PlacementCandidate(x, y, 0, [], "grid-bottom"))
            
            # For badges: Only bottom corners
            elif element_type == "badge":
                corners = [
                    (sb.x + margin, sb.y + sb.height - height - margin),
                    (sb.x + sb.width - width - margin, sb.y + sb.height - height - margin),
                ]
                for x, y in corners:
                    candidates.append(PlacementCandidate(x, y, 0, [], "grid-corner"))
            
            return candidates
        
        # Fallback: Simple grid
        x = margin
        while x + width <= self.canvas_width - margin:
            y = margin
            while y + height <= self.canvas_height - margin:
                candidates.append(PlacementCandidate(x, y, 0, [], "grid"))
                y += grid_step
            x += grid_step
        
        return candidates
    
    def _generate_anchor_based(self, width: float, height: float,
                              element_type: str) -> List[PlacementCandidate]:
        """
        Generate candidates anchored to existing elements
        
        Layouts are compositional - elements relate to each other spatially.
        This strategy exploits that by trying positions relative to existing elements.
        
        Anchoring rules:
        - Subheadings: Below headlines (hierarchical stacking)
        - Badges: Near corners but not overlapping logos
        - General: Above, below, left, right of existing elements
        """
        candidates = []
        gap = 20  # Spacing between elements
        
        for elem in self.grid.all_elements:
            # Type-specific anchoring logic
            if element_type == "subheading" and elem.element_type in ["headline", "text"]:
                # Place subheading below headline
                x = elem.rect.x  # Align left edges
                y = elem.rect.y + elem.rect.height + gap
                candidates.append(PlacementCandidate(x, y, 0, [], "anchor-below-headline"))
                
                # Also try center-aligned
                x_centered = elem.rect.center_x - width / 2
                candidates.append(PlacementCandidate(x_centered, y, 0, [], "anchor-centered"))
            
            elif element_type == "badge":
                # Badges work well in corners, away from other badges
                if elem.element_type != "badge":
                    # Try corners relative to this element
                    positions = [
                        (elem.rect.x - width - gap, elem.rect.y),  # Left
                        (elem.rect.x2 + gap, elem.rect.y),  # Right
                        (elem.rect.x, elem.rect.y - height - gap),  # Above
                        (elem.rect.x, elem.rect.y2 + gap),  # Below
                    ]
                    for x, y in positions:
                        candidates.append(PlacementCandidate(x, y, 0, [], "anchor-badge"))
            
            else:
                # General positioning: try cardinal directions
                positions = [
                    (elem.rect.x, elem.rect.y2 + gap, "below"),
                    (elem.rect.x, elem.rect.y - height - gap, "above"),
                    (elem.rect.x2 + gap, elem.rect.y, "right"),
                    (elem.rect.x - width - gap, elem.rect.y, "left"),
                ]
                for x, y, direction in positions:
                    candidates.append(PlacementCandidate(x, y, 0, [], f"anchor-{direction}"))
        
        return candidates
    
    def _generate_empty_region_based(self, width: float, height: float,
                                    element_type: str) -> List[PlacementCandidate]:
        """
        Generate candidates in low-density grid cells
        
        Target areas of canvas with fewest existing elements.
        This maximizes whitespace and reduces collision probability.
        """
        candidates = []
        empty_cells = self.grid.get_empty_regions(threshold=0.3)  # <30% density
        
        for row, col in empty_cells:
            # Get center of empty cell
            center_x, center_y = self.grid.get_cell_center(row, col)
            
            # Center the element in the cell
            x = center_x - width / 2
            y = center_y - height / 2
            
            candidates.append(PlacementCandidate(x, y, 0, [], "empty-region"))
            
            # Also try corners of empty cell
            cell_x = col * self.grid.cell_width
            cell_y = row * self.grid.cell_height
            
            corners = [
                (cell_x + 20, cell_y + 20),  # Top-left
                (cell_x + self.grid.cell_width - width - 20, cell_y + 20),  # Top-right
                (cell_x + 20, cell_y + self.grid.cell_height - height - 20),  # Bottom-left
            ]
            
            for x, y in corners:
                if 0 <= x <= self.canvas_width - width and 0 <= y <= self.canvas_height - height:
                    candidates.append(PlacementCandidate(x, y, 0, [], "empty-corner"))
        
        return candidates
    
    def _generate_type_specific(self, width: float, height: float,
                                element_type: str) -> List[PlacementCandidate]:
        """
        Generate candidates based on element-type conventions AND subject bounds
        
        Retail design: Elements go INSIDE the product canvas BUT avoid the product image itself
        - Headlines: BOTTOM of canvas (most common in retail)
        - Subheadings: Below headline
        - Badges: Bottom-left corner
        - Logos: Bottom-right corner
        """
        candidates = []
        margin = 60  # Increased margin for safety
        
        # If subject bounds exist, generate positions WITHIN that region
        if self.grid.all_elements and hasattr(self.scorer, 'subject_bounds') and self.scorer.subject_bounds:
            sb = self.scorer.subject_bounds
            
            # Find the product/image element (usually the largest element)
            product_elem = None
            max_area = 0
            for elem in self.grid.all_elements:
                if elem.element_type == "image":
                    area = elem.rect.area
                    if area > max_area:
                        max_area = area
                        product_elem = elem
            
            if element_type == "headline":
                # Headlines go at BOTTOM of canvas (like your reference image)
                # Position BELOW the product image
                y_bottom = sb.y + sb.height - height - margin
                
                positions = [
                    # Bottom center (most common retail position)
                    (sb.x + (sb.width - width) / 2, y_bottom, "bottom-center"),
                    # Bottom left
                    (sb.x + margin, y_bottom, "bottom-left"),
                    # Also try top if product is at bottom
                    (sb.x + (sb.width - width) / 2, sb.y + margin, "top-center"),
                ]
                for x, y, pos in positions:
                    candidates.append(PlacementCandidate(x, y, 0, [], f"strategic-headline-{pos}"))
            
            elif element_type == "subheading":
                # Subheading goes ABOVE headline (mid-bottom area)
                y_mid = sb.y + sb.height - height - margin - 100  # 100px above headline
                
                positions = [
                    (sb.x + (sb.width - width) / 2, y_mid, "mid-bottom-center"),
                ]
                for x, y, pos in positions:
                    candidates.append(PlacementCandidate(x, y, 0, [], f"strategic-subheading-{pos}"))
            
            elif element_type == "badge":
                # Badge at bottom-left corner
                positions = [
                    (sb.x + margin, sb.y + sb.height - height - margin, "bottom-left"),
                ]
                for x, y, corner in positions:
                    candidates.append(PlacementCandidate(x, y, 0, [], f"strategic-badge-{corner}"))
            
            return candidates
        
        # Fallback: No subject bounds
        if element_type == "headline":
            y_bottom = self.canvas_height - height - margin
            candidates.append(PlacementCandidate(
                (self.canvas_width - width) / 2, y_bottom, 0, [], "strategic-headline-bottom"
            ))
        
        elif element_type == "subheading":
            # Subheadings in upper-mid region
            y_positions = [
                self.canvas_height * 0.15,
                self.canvas_height * 0.20,
                self.canvas_height * 0.25,
            ]
            
            for y in y_positions:
                candidates.append(PlacementCandidate(
                    (self.canvas_width - width) / 2, y, 0, [], "strategic-subheading"
                ))
        
        elif element_type == "badge":
            # Badges in all four corners
            corners = [
                (margin, self.canvas_height - height - margin, "bottom-left"),
                (self.canvas_width - width - margin, self.canvas_height - height - margin, "bottom-right"),
                (margin, margin, "top-left"),
                (self.canvas_width - width - margin, margin, "top-right"),
            ]
            
            for x, y, corner in corners:
                candidates.append(PlacementCandidate(x, y, 0, [], f"strategic-badge-{corner}"))
        
        elif element_type == "logo":
            # Logo in bottom-right (industry standard)
            x = self.canvas_width - width - margin
            y = self.canvas_height - height - margin
            candidates.append(PlacementCandidate(x, y, 0, [], "strategic-logo"))
        
        return candidates
    
    def _deduplicate_candidates(self, candidates: List[PlacementCandidate], 
                               tolerance: float = 10.0) -> List[PlacementCandidate]:
        """
        Remove duplicate candidates (positions within tolerance distance)
        
        Multiple strategies may generate similar positions - keep only unique ones.
        """
        unique = []
        
        for candidate in candidates:
            is_duplicate = False
            for existing in unique:
                distance = ((candidate.x - existing.x)**2 + (candidate.y - existing.y)**2)**0.5
                if distance < tolerance:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique.append(candidate)
        
        return unique
