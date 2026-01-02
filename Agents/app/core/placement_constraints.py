"""
Constraint-Based Scoring System for Layout Placement

Implements graduated constraint evaluation (not binary pass/fail).
Each constraint contributes to a 0-100 score, enabling ranking of candidates.

Design principle: Hard constraints (must-haves) apply heavy penalties.
Soft constraints (nice-to-haves) apply bonuses. This creates a loss function
that can be optimized.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from app.core.spatial_grid import SpatialGrid, Rectangle, Element


@dataclass
class PlacementCandidate:
    """A candidate placement with its score breakdown"""
    x: float
    y: float
    score: float
    reasoning: List[str]  # Human-readable explanations
    method: str  # How it was generated (grid, anchor, empty-region)
    
    def __lt__(self, other):
        """Enable sorting by score (highest first)"""
        return self.score > other.score


class ConstraintScorer:
    """
    Evaluates placement candidates against design constraints
    
    Scoring philosophy:
    - Start at 100 points (perfect placement)
    - Apply penalties for constraint violations
    - Apply bonuses for desirable properties
    - Final score indicates placement quality (higher = better)
    
    Hard constraints (heavy penalties):
    - Headlines must be in top 30%: -50 pts if violated
    - Cannot exceed canvas bounds: -100 pts (invalid)
    
    Soft constraints (moderate penalties):
    - Collision with existing elements: -1 to -40 pts (proportional)
    - Poor visual hierarchy: -10 to -20 pts
    
    Bonuses:
    - Grid alignment: +10 pts
    - Empty quadrant: +15 pts
    - Good spacing: +5 pts
    """
    
    def __init__(self, canvas_width: float, canvas_height: float, 
                 spatial_grid: SpatialGrid, subject_bounds: Optional[Rectangle] = None):
        """
        Initialize scorer with canvas context
        
        Args:
            canvas_width, canvas_height: Canvas dimensions
            spatial_grid: Pre-populated spatial grid with existing elements
            subject_bounds: Optional product/subject region to avoid
        """
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.grid = spatial_grid
        self.subject_bounds = subject_bounds
        
        # Constraint weights (tunable parameters)
        self.WEIGHT_HIERARCHY = 50.0  # Headlines at top
        self.WEIGHT_COLLISION = 40.0  # Avoid overlap
        self.WEIGHT_SUBJECT = 35.0    # Avoid product/subject
        self.BONUS_ALIGNMENT = 10.0   # Grid alignment
        self.BONUS_EMPTY_REGION = 15.0  # Empty quadrant
        self.BONUS_SPACING = 5.0      # Good margins
    
    def score_placement(self, x: float, y: float, width: float, height: float,
                       element_type: str) -> PlacementCandidate:
        """
        Score a candidate placement position
        
        Args:
            x, y: Top-left position
            width, height: Element dimensions
            element_type: Type (headline, subheading, badge, logo)
            
        Returns:
            PlacementCandidate with score and reasoning
        """
        score = 100.0
        reasoning = []
        test_rect = Rectangle(x, y, width, height)
        
        # === HARD CONSTRAINTS (Heavy Penalties) ===
        
        # 1. Canvas bounds check (MUST pass)
        if x < 0 or y < 0 or x + width > self.canvas_width or y + height > self.canvas_height:
            return PlacementCandidate(x, y, -100, ["OUT OF BOUNDS - Invalid"], "invalid")
        
        # 2. Visual hierarchy constraints (element-type specific)
        hierarchy_penalty, hierarchy_msg = self._check_hierarchy(y, height, element_type)
        score -= hierarchy_penalty
        if hierarchy_msg:
            reasoning.append(hierarchy_msg)
        
        # === SOFT CONSTRAINTS (Graduated Penalties) ===
        
        # 3. Collision with existing elements
        collision_penalty, collision_msg = self._check_collision(test_rect)
        score -= collision_penalty
        if collision_msg:
            reasoning.append(collision_msg)
        
        # 4. Subject bounds containment (must be inside canvas area)
        containment_penalty, containment_msg = self._check_subject_bounds_containment(test_rect, element_type)
        score -= containment_penalty  # Note: negative penalty = bonus
        if containment_msg:
            reasoning.append(containment_msg)
        
        # === BONUSES (Positive Contributions) ===
        
        # 5. Grid alignment bonus
        if self._is_grid_aligned(x, y, grid_size=40):
            score += self.BONUS_ALIGNMENT
            reasoning.append(f"+{self.BONUS_ALIGNMENT:.0f}pts: Grid aligned")
        
        # 6. Empty region bonus
        if self._is_in_empty_region(test_rect):
            score += self.BONUS_EMPTY_REGION
            reasoning.append(f"+{self.BONUS_EMPTY_REGION:.0f}pts: Empty region")
        
        # 7. Good spacing bonus
        if self._has_good_margins(x, y, width, height):
            score += self.BONUS_SPACING
            reasoning.append(f"+{self.BONUS_SPACING:.0f}pts: Good margins")
        
        # Clamp score to valid range
        final_score = max(0, min(100, score))
        
        return PlacementCandidate(
            x=x, 
            y=y, 
            score=final_score,
            reasoning=reasoning,
            method="scored"
        )
    
    def _check_hierarchy(self, y: float, height: float, element_type: str) -> Tuple[float, str]:
        """
        Check visual hierarchy constraints
        
        Retail design rules:
        - Headlines: MUST be in top 30% (critical for brand visibility)
        - Subheadings: Should be in top 50%
        - Badges: Prefer corners (top/bottom 25%)
        - Logos: Prefer bottom-right (bottom 30%, right 30%)
        """
        penalty = 0.0
        msg = ""
        
        y_percent = y / self.canvas_height
        
        if element_type == "headline":
            if y_percent > 0.3:  # Below top 30%
                penalty = self.WEIGHT_HIERARCHY
                msg = f"-{penalty:.0f}pts: Headline too low (at {y_percent:.0%}, should be <30%)"
            elif y_percent <= 0.15:  # In top 15% (ideal)
                msg = "Headline in optimal position (top 15%)"
        
        elif element_type == "subheading":
            if y_percent > 0.5:  # Below midpoint
                penalty = 15.0
                msg = f"-{penalty:.0f}pts: Subheading too low (at {y_percent:.0%})"
        
        elif element_type == "badge":
            # Badges work in corners - penalize middle placement
            if 0.3 < y_percent < 0.7:
                penalty = 10.0
                msg = f"-{penalty:.0f}pts: Badge in middle (prefer corners)"
        
        return penalty, msg
    
    def _check_collision(self, test_rect: Rectangle) -> Tuple[float, str]:
        """
        Calculate collision penalty based on overlap area
        
        Binary collision = unusable (can't rank options)
        Graduated collision = penalty proportional to overlap percentage
        
        Returns:
            (penalty, message) where penalty is 0-40 points
        """
        overlapping_elements = self.grid.get_elements_in_region(
            test_rect.x, test_rect.y, test_rect.width, test_rect.height
        )
        
        if not overlapping_elements:
            return 0.0, "No collisions"
        
        total_overlap = sum(
            elem.rect.overlap_area(test_rect) 
            for elem in overlapping_elements
        )
        
        overlap_percent = total_overlap / test_rect.area
        penalty = overlap_percent * self.WEIGHT_COLLISION
        
        msg = f"-{penalty:.1f}pts: {overlap_percent:.1%} collision with {len(overlapping_elements)} element(s)"
        return penalty, msg
    
    def _check_subject_bounds_containment(self, test_rect: Rectangle, element_type: str) -> Tuple[float, str]:
        """
        Check if element is INSIDE the subject bounds (canvas area)
        
        CRITICAL RETAIL LOGIC: subject_bounds = the canvas/design area where elements SHOULD be placed.
        Elements OUTSIDE this boundary are off-canvas and invisible.
        
        Returns BONUS for being inside, PENALTY for being outside.
        """
        if not self.subject_bounds:
            return 0.0, ""
        
        # Calculate what % of element is INSIDE the subject bounds
        if test_rect.overlaps(self.subject_bounds):
            overlap_area = test_rect.overlap_area(self.subject_bounds)
            inside_percent = overlap_area / test_rect.area
        else:
            inside_percent = 0.0
        
        # INVERTED LOGIC: Being INSIDE is good, being OUTSIDE is bad
        if inside_percent >= 0.95:  # Fully contained (>95%)
            bonus = 30.0
            msg = f"+{bonus:.0f}pts: Fully inside canvas"
            return -bonus, msg  # Negative penalty = bonus
        elif inside_percent >= 0.7:  # Mostly inside
            bonus = 15.0
            msg = f"+{bonus:.0f}pts: Mostly inside canvas ({inside_percent:.0%})"
            return -bonus, msg
        elif inside_percent > 0.1:  # Partially inside
            penalty = (1.0 - inside_percent) * 40.0  # Penalty for being outside
            msg = f"-{penalty:.1f}pts: Partially outside canvas ({inside_percent:.0%} inside)"
            return penalty, msg
        else:  # Completely outside
            penalty = 100.0  # Disqualifying
            msg = f"-{penalty:.0f}pts: OUTSIDE canvas boundary"
            return penalty, msg
    
    def _is_grid_aligned(self, x: float, y: float, grid_size: int = 40) -> bool:
        """Check if position aligns to grid (improves visual consistency)"""
        return (x % grid_size < 5 or x % grid_size > grid_size - 5) and \
               (y % grid_size < 5 or y % grid_size > grid_size - 5)
    
    def _is_in_empty_region(self, test_rect: Rectangle) -> bool:
        """Check if placement is in a low-density grid cell"""
        density_map = self.grid.get_density_map()
        
        # Find which grid cell the center of element is in
        center_col = int((test_rect.center_x / self.canvas_width) * self.grid.grid_size)
        center_row = int((test_rect.center_y / self.canvas_height) * self.grid.grid_size)
        
        center_col = min(center_col, self.grid.grid_size - 1)
        center_row = min(center_row, self.grid.grid_size - 1)
        
        return density_map[center_row][center_col] < 0.3  # Less than 30% occupied
    
    def _has_good_margins(self, x: float, y: float, width: float, height: float, margin: float = 30) -> bool:
        """Check if element has good spacing from canvas edges"""
        return (x >= margin and 
                y >= margin and 
                x + width <= self.canvas_width - margin and
                y + height <= self.canvas_height - margin)
