/**
 * Compliance Constants for Tesco Retail Media
 * Based on official Tesco brand guidelines
 */

export const COMPLIANCE_CONSTANTS = {
  // WCAG Accessibility
  WCAG: {
    MIN_RATIO: 4.5,           // AA standard for normal text
    LARGE_TEXT_RATIO: 3.0,    // AA standard for large text (18pt+)
    LARGE_TEXT_SIZE: 18,      // Font size threshold for large text
    AAA_RATIO: 7.0,           // AAA standard (enhanced)
  },

  // APCA (Advanced Perceptual Contrast Algorithm)
  APCA: {
    MIN_BODY: 60,             // Minimum Lc for body text
    MIN_HEADING: 45,          // Minimum Lc for headings
    MIN_LARGE: 30,            // Minimum Lc for large decorative text
    PREFERRED_BODY: 75,       // Preferred Lc for body text
    PREFERRED_HEADING: 60,    // Preferred Lc for headings
  },

  // Safe Zones (Tesco specific)
  SAFE_ZONES: {
    '9:16': {
      topClear: 200,          // Top 200px must be clear
      bottomClear: 250,       // Bottom 250px must be clear
    },
    '1:1': {
      topClear: 100,
      bottomClear: 100,
    },
    '16:9': {
      topClear: 80,
      bottomClear: 80,
    },
  },

  // Font Sizes
  MIN_FONT_SIZES: {
    HEADLINE: 24,
    SUBHEADING: 18,
    BODY: 14,
    LEGAL: 10,
  },

  // Element Sizes
  ELEMENT_SIZES: {
    DRINKAWARE_MIN_HEIGHT: 20,
    LOGO_MIN_SIZE: 50,
    LOGO_MAX_RATIO: 0.15,     // Max 15% of canvas width
  },

  // Blocked Keywords (Tesco compliance)
  BLOCKED_KEYWORDS: [
    'free',
    'guaranteed',
    'best',
    'cheapest',
    'lowest price',
    'unbeatable',
    '#1',
    'number one',
    'miracle',
    'cure',
    'weight loss',
  ],

  // Required Elements by Campaign Type
  REQUIRED_ELEMENTS: {
    alcohol: ['drinkaware', 'age-restriction'],
    food: ['tesco-tag'],
    promotion: ['tesco-tag', 'headline'],
    default: ['tesco-tag'],
  },

  // Tesco Brand Colors
  BRAND_COLORS: {
    tescoBlue: '#00539F',
    tescoRed: '#E4002B',
    tescoYellow: '#FFD100',
    white: '#FFFFFF',
    black: '#000000',
  },

  // Severity Weights for Scoring
  SEVERITY_WEIGHTS: {
    hard: 25,                 // Critical violations
    soft: 10,                 // Important but not blocking
    warning: 5,               // Suggestions
  },
} as const;

export type ComplianceRule = 
  | 'SAFE_ZONE'
  | 'MIN_FONT_SIZE'
  | 'CONTRAST_FAIL'
  | 'CONTRAST_APCA_WARNING'
  | 'MISSING_TAG'
  | 'MISSING_LOGO'
  | 'MISSING_HEADLINE'
  | 'MISSING_SUBHEADING'
  | 'MISSING_DRINKAWARE'
  | 'DRINKAWARE_SIZE'
  | 'BLOCKED_KEYWORD'
  | 'OVERLAP'
  | 'CTA_NOT_ALLOWED';

export type Severity = 'hard' | 'soft' | 'warning';

export interface ComplianceViolation {
  elementId: string;
  rule: ComplianceRule;
  severity: Severity;
  message: string;
  autoFixable: boolean;
  autoFix?: {
    property: string;
    value: string | number;
  };
  metadata?: Record<string, unknown>;
}

export interface ComplianceResult {
  compliant: boolean;
  score: number;
  violations: ComplianceViolation[];
  warnings: ComplianceViolation[];
  summary: {
    totalIssues: number;
    hardIssues: number;
    softIssues: number;
    warningIssues: number;
  };
}
