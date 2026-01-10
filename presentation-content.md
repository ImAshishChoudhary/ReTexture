# ReTexture - Presentation Content & Speaker Notes

> **Purpose:** This document contains verbose, articulate content for building a PowerPoint presentation on the ReTexture project. Each section represents a slide with its title, visual suggestions, bullet points, and detailed speaker notes.

---

## SLIDE 1: Title Slide

### Visual Suggestion
- Large "ReTexture" headline with gradient effect (blue to yellow)
- Tesco brand colors prominently featured
- Subtle tech/AI iconography in background

### On-Slide Text
```
ReTexture
AI-Powered Retail Media Compliance Platform

Tesco Retail Media InnovAItion Jam 2025-26

Team: Ashish K. Choudhary | Himanshu Gupta | Pratham Gupta | Arpan Taneja
```

### Speaker Notes
> "Good [morning/afternoon]. Today we're presenting ReTexture — a platform we built from first principles to solve what we believe is one of the most overlooked bottlenecks in Tesco's retail media business. The name 'ReTexture' represents our core mission: we're re-texturing how creative compliance works. Instead of compliance being a gate that blocks creativity, we've made it an invisible guardrail that guides creativity in real-time. Let me take you through the problem, our solution, and how it works under the hood."

---

## SLIDE 2: The Problem Statement

### Visual Suggestion
- Split screen: chaotic "before" on left, streamlined "after" on right
- Red warning icons, clock icons showing time delays
- Pain point callout boxes

### On-Slide Text
```
THE PROBLEM

Every creative submission to Tesco's retail media requires 
MANUAL VALIDATION against 40+ brand guidelines

Current Pain Points:
• Compliance team becomes bottleneck as supplier volume grows
• 3-5 day delay per review cycle
• Suppliers use tools with ZERO Tesco awareness
• High abandonment rate due to complexity
• Legal/brand risks from missed requirements
```

### Speaker Notes
> "Let me paint a picture of what's happening today. Every single creative submission — whether it's a banner ad, a social post, or a promotional image — goes through a manual review process. A human being has to check it against over 40 different brand guidelines.

> Now, here's the fundamental math problem: as supplier interest grows, the number of submissions grows exponentially. But the compliance team grows linearly — you can only hire so many reviewers. This creates a classic O(n²) submissions vs. O(n) reviewers bottleneck.

> What does this mean in practice? Suppliers submit a design, wait 3 to 5 business days for feedback, often receive a rejection with a list of violations, fix them, resubmit, and repeat. Each cycle is a week of lost time.

> But here's the really insidious part: suppliers are using tools like Photoshop, Canva, Figma — tools that have absolutely zero awareness of Tesco-specific rules. So when a supplier forgets to add a Drinkaware disclaimer on an alcohol ad, or uses a font that's too small to meet accessibility requirements, or positions text in a social media safe zone — these aren't mistakes made out of malice. They're mistakes made because the tools don't tell them they're making mistakes.

> And the result? Many small and medium businesses simply give up. They abandon projects mid-way because the back-and-forth becomes too exhausting. That's lost ad revenue for Tesco. That's wasted platform investment."

---

## SLIDE 3: The Problem - Quantified Impact

### Visual Suggestion
- Large numbers in Tesco brand colors
- Bar chart or infographic showing before/after timeline
- Cost/revenue impact visualization

### On-Slide Text
```
THE PROBLEM: BY THE NUMBERS

┌─────────────────┬──────────────────┬──────────────────┐
│     40+         │     3-5 DAYS     │     ~60%         │
│  Guidelines     │  Per Review      │  First-Submission│
│  to Check       │  Cycle           │  Rejection Rate  │
└─────────────────┴──────────────────┴──────────────────┘

Root Cause: Compliance is treated as a POST-HOC GATE 
instead of an INTEGRATED GUARDRAIL
```

### Speaker Notes
> "Let me put some numbers to this problem.

> Forty-plus guidelines. That's not just 'make sure the logo is visible.' That's contrast ratios for accessibility, safe zone requirements for different social media formats, blocked keyword lists, specific tag text requirements, Clubcard date formats, Drinkaware requirements for alcohol, packshot limits, value tile specifications — the list goes on.

> Three to five days per review cycle. And remember, most submissions get rejected on the first pass. So that's two to three cycles minimum for most creatives.

> Approximately sixty percent first-submission rejection rate — I want you to think about that number. Six out of ten creatives submitted are non-compliant. That's not because suppliers are careless. It's because they have no way to know they're non-compliant until after they submit.

> And here's our diagnosis of the root cause: compliance is treated as a post-hoc gate. You build your creative, you submit it, and only THEN do you find out if it's compliant. That's like writing code for a week and only running tests at the end. What we need is continuous integration — compliance checks as you design, not after you design."

---

## SLIDE 4: Introducing the Solution

### Visual Suggestion
- ReTexture logo/interface mockup
- Before/after workflow diagram
- Key benefit highlights with icons

### On-Slide Text
```
THE SOLUTION: ReTexture

A generative AI-powered creative builder with 
REAL-TIME COMPLIANCE ENFORCEMENT

┌─────────────────────────────────────────────────────────┐
│  OLD: Design → Submit → Wait 3-5 Days → Rejection → Fix → Repeat  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  NEW: Design in Browser → Real-time Validation → One-click Auto-fix → Export │
└─────────────────────────────────────────────────────────┘

Concept to Compliant Creative: UNDER 5 MINUTES
```

### Speaker Notes
> "So what is ReTexture?

> ReTexture is a generative AI-powered creative builder with real-time compliance enforcement. Let me break down what each of those words means.

> 'Creative builder' — it's an in-browser design tool. Suppliers design their retail media directly in their web browser. No downloads, no installations, no file format hassles.

> 'Real-time compliance enforcement' — as you design, we validate. You add a text element, we immediately check if it meets minimum font size requirements. You upload an image, we check if you're exceeding the packshot limit. There's no submit-and-wait. The feedback is instant.

> 'Generative AI-powered' — this isn't just a rule checker. It actually helps you create. Need a headline? AI generates three compliant options. Want to remove a product's background? AI does it in one click. Need to figure out where to place text? AI analyzes the image and suggests optimal positions.

> 'One-click auto-fix' — this is the key differentiator. When we find a violation, we don't just tell you 'your contrast ratio is too low.' We offer a button that says 'fix it' — and it's fixed. Missing a Tesco tag? Auto-fix adds one in the correct position with the correct size.

> The result: suppliers go from concept to compliant creative in under five minutes instead of multiple days."

---

## SLIDE 5: The Core Principle

### Visual Suggestion
- Quote in large, prominent styling
- Visual metaphor: AI brain + geometric ruler/calculator
- Diagram showing AI proposes → math validates flow

### On-Slide Text
```
THE CORE DESIGN PRINCIPLE

"Agent Proposes, Geometry Decides"

┌─────────────────────────────────────────────────────────┐
│  AI suggests creative options (headlines, placements)   │
│                         ↓                               │
│  Deterministic math VALIDATES every suggestion          │
│                         ↓                               │
│  Only mathematically-valid options reach the user       │
└─────────────────────────────────────────────────────────┘

WHY? Because a hallucinated "4.5:1 contrast ratio" 
could cause a LEGAL VIOLATION. 

Compliance requires MATHEMATICAL CERTAINTY, 
not probabilistic confidence.
```

### Speaker Notes
> "Before I dive into the architecture, I need to explain the single most important design principle in ReTexture. This principle guided every technical decision we made.

> 'Agent proposes, geometry decides.'

> What does this mean? Let me give you a concrete example. Let's say you ask the system: 'where should I place this headline on my banner?' A naive implementation would send the image to an AI and ask 'give me X, Y coordinates.' The AI might respond: 'place it at X=100, Y=200.'

> But here's the problem: what if X=100, Y=200 is inside a social media safe zone? What if it overlaps with an existing element? What if the AI hallucinated those coordinates?

> Our approach is fundamentally different. We don't ask the AI to give us coordinates. We use spatial analysis to generate one hundred-plus valid placement candidates using deterministic algorithms. Then we score each candidate against constraints: does it avoid collisions? Does it respect hierarchy? Does it stay out of safe zones? Only THEN do we optionally use AI to pick the most aesthetically pleasing option from the pre-validated set.

> The same applies to contrast ratios. We don't ask the AI 'does this text have sufficient contrast?' We calculate the contrast ratio mathematically using the WCAG luminance formula. The number we get is precise, not probabilistic.

> Why is this so important? Because compliance isn't about 'probably good enough.' A hallucinated '4.5:1 contrast ratio' when the actual ratio is 3.2:1 could cause a legal accessibility violation. Compliance requires mathematical certainty."

---

## SLIDE 6: System Architecture Overview

### Visual Suggestion
- Two-column layout: Frontend vs Backend
- Technology logos/icons
- Connection arrows showing data flow

### On-Slide Text
```
SYSTEM ARCHITECTURE

┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Client)                            │
│    "Lightning-fast, offline-first browser editor"               │
│                                                                 │
│    • Next.js — React framework                                  │
│    • Fabric.js — Canvas as object model, not pixels             │
│    • Zustand — Lightweight global state                         │
│    • TanStack Query — Server state caching                      │
│    • TypeScript — Full type safety                              │
└─────────────────────────────────────────────────────────────────┘
                              ↕ API calls
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Agents)                             │
│    "Stateless intelligence engine"                              │
│                                                                 │
│    • FastAPI — Python async web framework                       │
│    • Google Gemini 2.5 — AI generation & validation             │
│    • rembg + ONNX — Background removal                          │
│    • Spatial Grid — 3x3 canvas partitioning                     │
│    • 20+ Validation Rules — Deterministic compliance            │
└─────────────────────────────────────────────────────────────────┘

KEY INSIGHT: Frontend handles ALL interactive editing with ZERO latency.
Backend exists ONLY for authority (validation) and intelligence (AI).
```

### Speaker Notes
> "Now let's talk architecture. ReTexture has a clear two-part design, and understanding this separation is crucial.

> The frontend — what runs in the user's browser — is designed to be lightning-fast and offline-first. Every drag, every resize, every color change happens client-side with zero network latency. We achieve this using Fabric.js, which represents the canvas not as pixels but as a structured document of objects. This is critical because it allows us to serialize the entire design to JSON with semantic metadata — which the backend can then reason about.

> The backend — what we call 'Agents' — is a stateless Python service built on FastAPI. It has no session management, no persistent state. This means it can scale horizontally without complexity. The backend exists for exactly two purposes: authority and intelligence. Authority means validation — when you click 'validate', the backend runs 20-plus deterministic rules and returns a definitive compliance verdict. Intelligence means AI features — headline generation, smart placement, image variations.

> This separation is deliberate. We don't want the frontend to depend on network connectivity for basic editing. If your wifi drops, you can still design. You only need connectivity when you want to validate or use AI features."

---

## SLIDE 7: The Canvas as a Semantic Document

### Visual Suggestion
- Code snippet showing Fabric.js object with metadata
- Diagram showing raw pixels vs structured objects
- Callout boxes explaining custom properties

### On-Slide Text
```
FRONTEND: SEMANTIC CANVAS MODEL

Traditional image editors work with PIXELS.
ReTexture works with SEMANTIC OBJECTS.

Every canvas object carries metadata for compliance reasoning:

{
  type: "image",
  left: 540, top: 100,
  width: 300, height: 300,
  
  // SEMANTIC PROPERTIES (custom)
  customId: "product-packshot-1",
  isTescoTag: false,
  isLogo: false,
  stickerType: null
}

This enables the backend to reason about DESIGN INTENT, not just visual appearance.

• isTescoTag: true → Satisfies "Tesco branding required" rule
• customId: "headline" → Must be ≥24px font size
• isLogo: true → Must be in approved positions
```

### Speaker Notes
> "Let me explain something fundamental about how ReTexture represents designs.

> Traditional image editors like Photoshop work with pixels. When you export a Photoshop file, you get a grid of colored dots. There's no semantic meaning attached to those dots. You can't ask 'which pixels are the headline?' or 'is there a Tesco tag in this image?' — at least not without computer vision.

> Fabric.js gives us something different. It represents the canvas as a structured document of objects. Every rectangle, every text box, every image is a JavaScript object with properties like position, size, color, and font.

> But here's where ReTexture goes further: we extend these objects with custom semantic properties. When you add a Tesco sticker from our library, it comes with `isTescoTag: true` pre-set. When you add a headline, it's tagged with `customId: 'headline'`. When the user uploads a logo, they can mark it as `isLogo: true`.

> Why does this matter? Because when this canvas JSON is sent to the backend for validation, we don't have to guess what an element represents. We know. We can run a rule that says 'does this canvas contain an element where isTescoTag equals true?' — that's a simple property lookup, not computer vision.

> This is what I mean by reasoning about design intent, not just visual appearance."

---

## SLIDE 8: The Validation Engine

### Visual Suggestion
- Flowchart of validation process
- Performance metrics (< 500ms)
- Rule count highlight (20+)

### On-Slide Text
```
BACKEND: THE VALIDATION ENGINE

When the user clicks "Validate", here's what happens:

1. Receive base64-encoded Fabric.js JSON
2. Parse into Python objects → extract canvas elements
3. Build SPATIAL GRID (3x3) for region-based queries
4. Execute 20+ DETERMINISTIC RULES sequentially
5. Calculate compliance score from violations
6. Generate HTML preview for visual confirmation
7. Return structured violations with autoFixable flags

┌─────────────────────────────────────────────────────────┐
│  CRITICAL: All validation runs in < 500ms              │
│  NO AI is used in core validation                      │
│  Purely deterministic geometry and regex               │
└─────────────────────────────────────────────────────────┘
```

### Speaker Notes
> "Let me walk you through exactly what happens when you click the 'Validate' button.

> Step one: The frontend serializes the canvas to JSON, base64-encodes it, and sends it to the /validate endpoint.

> Step two: The backend parses this JSON and extracts all canvas objects into Python data structures.

> Step three — and this is important — we build what we call a 'spatial grid.' It's a 3x3 partitioning of the canvas. Think of it like a tic-tac-toe grid overlay. Each object gets placed into the cells it overlaps. This allows us to answer questions like 'what's in the bottom-left corner?' or 'how crowded is the top row?' in O(1) time instead of scanning all objects.

> Step four: We run 20-plus deterministic validation rules. Each rule checks for a specific compliance requirement. Missing Tesco tag? There's a rule for that. Font too small? There's a rule for that. Text in safe zone? There's a rule for that.

> Step five: We aggregate the violations and calculate an overall compliance score. Hard violations fail the submission. Warnings suggest improvements.

> Step six: We generate an HTML preview that the frontend can render to show the user exactly what we analyzed.

> Step seven: We return structured violations. Each violation includes the rule that was violated, the severity, the message, and crucially — whether it's autoFixable. If it is, we include the fix parameters.

> And here's the critical point: all of this — all 20-plus rules — runs in under 500 milliseconds. There's no AI in the core validation loop. It's purely deterministic geometry and regex pattern matching. AI is only involved in auto-fixing, not validating."

---

## SLIDE 9: The Compliance Rules (Sample)

### Visual Suggestion
- Table format with rule details
- Color coding for severity (red = hard fail)
- Icons for each category

### On-Slide Text
```
THE 20+ COMPLIANCE RULES

| Rule ID       | Name              | Severity | What It Checks                              |
|---------------|-------------------|----------|---------------------------------------------|
| TESCO_TAG     | Tesco Branding    | HARD     | Must have "Available at Tesco" or logo      |
| HEADLINE      | Headline Required | HARD     | Must have text ≥ 24px font size             |
| MIN_FONT_SIZE | Accessibility     | HARD     | All text ≥ 20px (social) / 10px (checkout)  |
| CONTRAST      | WCAG AA           | HARD     | Text vs background ≥ 4.5:1 ratio            |
| SAFE_ZONE     | Social Safe Zone  | HARD     | 9:16: top 200px, bottom 250px clear         |
| BLOCKED_COPY  | Prohibited Text   | HARD     | No T&Cs, competitions, sustainability       |
| NO_CTA        | No CTAs           | HARD     | "Shop Now", "Buy Now" not allowed           |
| PACKSHOT      | Max Products      | HARD     | Maximum 3 product images                    |
| CLUBCARD_DATE | Date Format       | HARD     | Must include "Ends DD/MM"                   |
| DRINKAWARE    | Alcohol Campaigns | HARD     | Drinkaware text required                    |

+ 10 more rules covering value tiles, logo positioning, subheadings, etc.
```

### Speaker Notes
> "Let me give you a taste of what these rules actually check.

> TESCO_TAG — Every creative must have Tesco branding. This could be text that says 'Available at Tesco' or 'Only at Tesco', or it could be a Tesco logo image, or it could be one of our pre-validated stickers. We check for text content, image sources, and custom properties.

> HEADLINE — Every banner needs a headline. We define a headline as text with font size 24 pixels or larger. If you have no text at that size, we flag it.

> MIN_FONT_SIZE — Accessibility requirement. On social and brand formats, all text must be at least 20 pixels. On checkout formats, the minimum is 10 pixels. We iterate through all text objects and check their fontSize property.

> CONTRAST — WCAG AA compliance. We calculate the luminance of the text color and the background color using the official formula, then compute the contrast ratio. If it's below 4.5:1, we flag it.

> SAFE_ZONE — Social media platforms like Instagram and TikTok overlay UI elements on certain parts of the screen. For 9:16 vertical formats, the top 200 pixels and bottom 250 pixels should be kept clear. We check the bounding box of every element against these zones.

> BLOCKED_COPY — Tesco has a list of words and phrases that cannot appear in retail media. Things like 'terms and conditions', 'win', 'competition', 'sustainable', 'eco-friendly' — these all require legal review and are blocked at the creative level. We use regex pattern matching against all text content.

> NO_CTA — Call-to-action buttons are not allowed in Tesco retail media. 'Shop Now', 'Buy Now', 'Click Here' — all blocked.

> And there are ten more rules covering packshot limits, Clubcard date formatting, Drinkaware requirements for alcohol, value tile overlap prevention, and so on."

---

## SLIDE 10: The Spatial Grid System

### Visual Suggestion
- Visual 3x3 grid overlay on a sample banner
- Color-coded density indicators
- Code snippet showing key methods

### On-Slide Text
```
SPATIAL GRID: O(1) REGION QUERIES

The canvas is divided into a 3x3 grid for efficient spatial analysis:

┌─────────┬─────────┬─────────┐
│  0,0    │  0,1    │  0,2    │
│ HEADLINE│         │  LOGO   │
├─────────┼─────────┼─────────┤
│  1,0    │  1,1    │  1,2    │
│         │ PRODUCT │         │
├─────────┼─────────┼─────────┤
│  2,0    │  2,1    │  2,2    │
│ TESCO   │         │  VALUE  │
│ TAG     │         │  TILE   │
└─────────┴─────────┴─────────┘

Key Methods:
• get_density_map() → % occupied per cell
• get_empty_regions() → Cells with <20% density
• get_elements_in_region(x, y, w, h) → O(1) lookup

WHY 3x3? Matches retail layout conventions:
Top row = headlines | Middle = products | Bottom = tags, logos, tiles
```

### Speaker Notes
> "I mentioned the spatial grid earlier. Let me explain why this exists and how it works.

> Imagine you're running a validation rule that asks: 'Is there anything in the top-left corner of the canvas?' The naive approach would be: loop through every single object, calculate its bounding box, check if it intersects with the top-left region. If you have 50 objects, that's 50 calculations.

> Now imagine you have to answer that question for nine different regions, for twenty different rules. The naive approach becomes expensive quickly.

> Our solution: precompute a spatial index. When the canvas JSON comes in, we overlay a 3x3 grid on it. For each object, we determine which cells it overlaps and add a reference to those cells. Now when a rule asks 'what's in cell 0,0?', we just return the pre-indexed list. It's O(1) instead of O(n).

> The grid also gives us a density map — for each cell, we calculate what percentage of its area is covered by objects. This is incredibly useful for placement. If you want to add a headline, you want to put it in an empty region. The density map tells you which cells are empty.

> Why did we choose a 3x3 grid specifically? It maps naturally to retail design conventions. The top row is typically for headlines and logos. The middle row is for the product image. The bottom row is for Tesco tags, value tiles, and legal text. This isn't arbitrary — it's based on how retail creatives are actually composed."

---

## SLIDE 11: Intelligent Placement System

### Visual Suggestion
- Visualization of 100+ candidate positions as dots
- Scoring criteria displayed
- Best candidate highlighted

### On-Slide Text
```
INTELLIGENT PLACEMENT: 100+ CANDIDATES

When adding an element, where should it go?
DON'T ask the LLM to guess coordinates.

OUR APPROACH:
1. SPACE ANALYSIS — Find free regions first
2. GRID SAMPLING — Uniform 80px step coverage
3. ANCHOR-BASED — Relative to existing elements (subhead below headline)
4. EMPTY-REGION CENTERS — Target low-density cells

↓ Generate 100+ candidate positions ↓

SCORE each candidate against:
• Collision avoidance (overlap with existing elements)
• Hierarchy compliance (headlines top, badges bottom)
• Alignment quality (left-edge, center alignment)
• Safe zone compliance (not in protected regions)

↓ Rank by score ↓

Return TOP candidates → Optionally let AI pick most aesthetic
```

### Speaker Notes
> "Placement is one of the most challenging problems in automated design. Where should a headline go? Where should a Tesco tag go?

> The naive — and dangerous — approach would be to send the canvas to an AI and ask 'give me coordinates for this headline.' But as I explained earlier, AI coordinates can be hallucinated. They might overlap existing elements. They might be in safe zones. They might look terrible aesthetically.

> Our approach flips the problem around. We don't ask AI for coordinates at all — at least not initially. We generate coordinates ourselves using four different strategies.

> Strategy one: Space analysis. We use the spatial grid to find regions with low density. If the top-left cell is empty, that's a candidate region for a headline.

> Strategy two: Grid sampling. We overlay an invisible grid with 80-pixel spacing and generate a candidate at every grid intersection. This gives us uniform coverage.

> Strategy three: Anchor-based positioning. This exploits compositional relationships. If there's already a headline on the canvas, a subheading should probably go below it. So we generate candidates at 'headline bottom edge plus 20 pixels.'

> Strategy four: Empty-region centers. We find the geometric center of each empty grid cell and create candidates there.

> From these four strategies, we typically generate over one hundred candidate positions. Then we score every single one against our constraints. Does it overlap an existing element? Score penalty. Is it hierarchically appropriate? Score boost. Does it align nicely with other elements? Score boost. Is it in a safe zone? Disqualify entirely.

> After scoring, we rank the candidates and return the top ones to the frontend. If AI is involved at all, it's only to pick the most aesthetically pleasing option from this pre-validated set. The AI cannot pick an invalid position because invalid positions were never in the set."

---

## SLIDE 12: The Auto-Fix Pipeline

### Visual Suggestion
- Flowchart showing the retry loop
- Gemini logo
- Before/after code snippets

### On-Slide Text
```
AI AUTO-FIX: THE RETRY LOOP

When violations are detected, user clicks "Auto-Fix":

┌─────────────────────────────────────────────────────────┐
│  STEP 1: Extract base64 images → {{ IMG_1 }} placeholders │
│  STEP 2: Build prompt with violations + HARDCODED positions │
│  STEP 3: Call Gemini (temperature=0.1, max_tokens=8192) │
│  STEP 4: Validate returned HTML structure              │
│  STEP 5: IF invalid → append feedback → RETRY (max 3x) │
│  STEP 6: Restore images from placeholders              │
│  STEP 7: Return corrected HTML + fixes applied list    │
└─────────────────────────────────────────────────────────┘

WHY HARDCODE POSITIONS?
We tell Gemini EXACTLY where to place elements:
  headline: left=20, top=20, fontSize=36
  tesco_tag: left=20, top=canvas_height-120, size=200x80

This prevents hallucinated coordinates that would violate safe zones.
```

### Speaker Notes
> "Now let's talk about auto-fix. This is where AI actually comes into play, but in a very controlled way.

> When we return violations to the frontend, each violation has an 'autoFixable' flag. If the user clicks 'Auto-Fix' on a violation, here's what happens behind the scenes.

> Step one: We take the current canvas HTML and extract all the base64-encoded images. Why? Because base64 images are enormous strings — tens of thousands of characters. Sending them to the AI would waste tokens and often cause the AI to corrupt them. So we replace them with placeholders like double-curly-brace IMG_1.

> Step two: We build a structured prompt. This prompt includes: the current HTML, the current CSS, the list of violations with their details, and critically — hardcoded positions for where elements should go. We literally tell the AI: 'If you need to add a headline, put it at left equals 20 pixels, top equals 20 pixels, with font size 36.' No guessing allowed.

> Step three: We call Gemini with very specific parameters. Temperature 0.1 — that's almost deterministic. Response format set to JSON. Max tokens set high because HTML can get large.

> Step four: When Gemini returns, we validate the HTML structure. Are all tags properly closed? Is it well-formed? This is crucial because malformed HTML would break the frontend.

> Step five: If the HTML is invalid, we don't give up. We append feedback to the prompt — 'Your previous HTML had unclosed tags, please fix' — and retry. We do this up to three times.

> Step six: Once we have valid HTML, we restore the images. We replace those IMG_1 placeholders back with the original base64 strings.

> Step seven: We return the corrected HTML along with a structured list of what fixes were applied.

> The key insight here is that we don't trust the AI to figure out where elements should go. We tell it exactly where. The AI's job is to generate the correct HTML syntax with the exact positions we specified."

---

## SLIDE 13: AI Features - Gemini Integration

### Visual Suggestion
- Feature cards with icons
- Screenshots or mockups of each feature
- Gemini/Google Cloud logos

### On-Slide Text
```
AI FEATURES: GEMINI INTEGRATION

┌────────────────────────────────────────────────────────┐
│ 🎨 BACKGROUND REMOVAL                                  │
│ Dual-path: client-side browser ML + server-side ONNX  │
│ One-click transparent PNG                             │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ 📸 IMAGE VARIATIONS                                    │
│ Upload packshot → Select style (Studio/Lifestyle/Creative) │
│ Get 3 background variations with safe zones preserved │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ ✍️ HEADLINE GENERATION                                 │
│ Analyze product image → Generate 3 compliant headlines │
│ Auto-validated against blocked keyword list           │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ 📍 SMART PLACEMENT                                     │
│ Gemini Vision detects subject → Recommends text position │
│ Only suggests positions that pass geometric validation │
└────────────────────────────────────────────────────────┘
```

### Speaker Notes
> "Beyond validation and auto-fix, we offer several AI-powered creative features.

> Background removal: Suppliers often have product photos with cluttered backgrounds. We offer one-click background removal through two paths. If they want speed, we use a client-side browser ML model that runs entirely in their browser — no server call needed. If they want quality, we use server-side rembg with ONNX runtime, which is more accurate but requires a network round-trip.

> Image variations: This is one of the most powerful features. A supplier uploads a product packshot. They select a style — Studio for clean e-commerce white backgrounds, Lifestyle for contextual real-world settings, Creative for bold advertising aesthetics. We send the product image to Gemini with carefully crafted prompts that include our Tesco compliance rules. Gemini generates three background variations while keeping the product intact and respecting safe zones for text overlay.

> Headline generation: Given a product image, we can generate three compliant headline options. We use Gemini Vision to analyze what's in the image — is it food? is it cosmetics? is it electronics? — and then generate headlines appropriate to that product category. These headlines are automatically checked against our blocked keyword list before being returned.

> Smart placement: When someone needs to add text to a design, we can analyze the image to find the best location. Gemini Vision identifies where the main subject is — say, a product bottle on the right side of a lifestyle photo — and recommends placing text on the left side where there's empty space. But crucially, we don't just return what Gemini suggests. We validate its suggestions against our safe zone and overlap constraints before showing them to the user."

---

## SLIDE 14: Compliance Prompts in AI Generation

### Visual Suggestion
- Code block showing the compliance suffix
- Warning icons for restrictions
- Before/after generated images

### On-Slide Text
```
COMPLIANCE BAKED INTO EVERY AI PROMPT

Every image generation request includes a COMPLIANCE SUFFIX:

TESCO_COMPLIANCE_SUFFIX = """
=== TESCO RETAIL MEDIA COMPLIANCE (MANDATORY) ===

Layout Rules:
- Leave top 100px clear for headline text overlay
- Leave bottom 150px clear for Tesco tag, logo, value tile
- Center the product with breathing room

Hard Restrictions - Absolutely NO:
- Text, words, letters, numbers
- Logos, watermarks, symbols
- People, faces, hands, body parts
- Offensive or non-brand-safe imagery
- Distortions to the original product
- Cluttered backgrounds

Brand Safety:
- Professional, family-friendly aesthetic
- Background complements, never overpowers product
"""

This ensures AI-generated content is PRE-COMPLIANT before validation.
```

### Speaker Notes
> "Here's something that might seem like a small detail but is actually crucial: every single AI generation request we make includes what we call a compliance suffix.

> This suffix is a block of text that gets appended to every prompt we send to Gemini. It contains layout rules — leave the top 100 pixels clear for headlines, leave the bottom 150 pixels clear for Tesco tags. It contains hard restrictions — absolutely no text in generated images, no logos, no people, no faces. It contains brand safety requirements — keep it professional, family-friendly, premium.

> Why do we do this? It's defense in depth. Even though we validate the output afterwards, we want the AI to generate compliant content from the start. If we ask for an image variation and don't specify 'no text', Gemini might add decorative text to the background. Then our validator would catch it, but we'd have wasted time and tokens generating something we can't use.

> By baking compliance rules into the prompt, we're shifting compliance left — from post-hoc detection to proactive prevention. The generated content is much more likely to be compliant on the first pass."

---

## SLIDE 15: Technical Highlights

### Visual Suggestion
- Statistics in large numbers
- Code metrics visualization
- Architecture complexity diagram

### On-Slide Text
```
TECHNICAL HIGHLIGHTS

By The Numbers:
• 1,305 lines of validation logic (runner.py)
• 882 lines in useEditor hook — 40+ methods
• 20+ deterministic compliance rules
• 3x3 spatial grid for O(1) queries
• 100+ placement candidates generated and scored
• 3-retry auto-fix loop with LLM feedback
• Dual-path background removal (client + server)
• SSE streaming for progressive image generation

Architecture Decisions:
• Semantic canvas metadata (isTescoTag, isLogo, customId)
• Format-aware safe zones (9:16 vs 1:1 vs 4:5)
• Hardcoded positions prevent AI coordinate hallucination
• Temperature 0.1 for deterministic AI responses
• Base64 image extraction/restoration for token efficiency
```

### Speaker Notes
> "Let me give you some numbers that illustrate the depth of engineering in ReTexture.

> The validation runner alone is over 1,300 lines of Python. This isn't boilerplate — it's dense business logic implementing 20-plus specific Tesco compliance rules.

> The useEditor hook on the frontend is 882 lines. It exposes over 40 methods for canvas manipulation — add text, add image, change color, undo, redo, zoom, export. It composes seven sub-hooks for history management, clipboard operations, auto-resizing, event handling, and more.

> We generate over 100 placement candidates for smart positioning. Each one is scored against multiple constraints. We keep a 3x3 spatial grid updated so that region queries are constant-time.

> For auto-fix, we retry up to three times with corrective feedback if the AI returns malformed HTML.

> We support multiple export formats with format-aware safe zones — 9:16 vertical has different safe zones than 1:1 square.

> And behind all of this is a deliberate architectural decision: we don't trust AI with anything safety-critical. AI proposes, geometry decides. Hardcoded positions, deterministic validation, mathematical contrast ratios."

---

## SLIDE 16: Impact and Business Value

### Visual Suggestion
- Before/after comparison with time metrics
- Value proposition bullet points
- ROI visualization

### On-Slide Text
```
IMPACT: FROM DAYS TO MINUTES

┌─────────────────────┐        ┌─────────────────────┐
│     3-5 DAYS        │   →    │    UNDER 5 MIN      │
│  (OLD Review Cycle) │        │ (Concept to Export) │
└─────────────────────┘        └─────────────────────┘

BUSINESS VALUE:

✓ SMB Democratization
  Suppliers without design teams create compliant retail media

✓ Legal Risk Reduction  
  Missing Drinkaware, wrong contrast — caught INSTANTLY

✓ Revenue Recapture
  Abandoned projects now complete successfully

✓ Compliance Team Scaling
  Human reviewers focus on edge cases, not routine checks

✓ Campaign Launch Acceleration
  Faster creative approval → faster time to revenue
```

### Speaker Notes
> "Let me talk about the impact of ReTexture in business terms.

> The most dramatic change is time-to-compliance. A process that used to take 3 to 5 days — often multiple cycles of submit-reject-fix-resubmit — now takes under 5 minutes. That's not an exaggeration. A supplier can open our editor, upload a product, generate a compliant design with AI assistance, validate it, auto-fix any issues, and export — all in a single session.

> What does this enable?

> SMB democratization. Small and medium businesses that don't have professional design teams can now create retail media that meets Tesco's exacting standards. The tool guides them, catches their mistakes, and fixes issues for them.

> Legal risk reduction. Those scary compliance violations — missing alcohol disclaimers, insufficient contrast ratios, blocked content — are caught instantly. Not after legal review, not after publication, but during creation.

> Revenue recapture. Remember those abandoned projects I mentioned? Suppliers who gave up because the process was too hard? They can now complete successfully. Every completed project is potential ad revenue that Tesco was previously losing.

> Compliance team scaling. Instead of manually checking every creative against every rule, human reviewers can focus on edge cases that actually require human judgment. Routine compliance is handled by the system.

> Campaign launch acceleration. Faster creative approval means faster time from campaign planning to live ads. Faster time to revenue."

---

## SLIDE 17: The Philosophy - Invisible Guardrails

### Visual Suggestion
- Metaphor visualization (guardrails on a road)
- Transformation diagram (blocker → guardrail)
- Quote styling

### On-Slide Text
```
THE PHILOSOPHY

"Compliance should be an INVISIBLE GUARDRAIL,
not a VISIBLE BLOCKER."

┌─────────────────────┐        ┌─────────────────────┐
│        BEFORE       │        │        AFTER        │
│                     │        │                     │
│   "Sorry, your      │   →    │   "This text needs  │
│   design violates   │        │   higher contrast.  │
│   7 rules.          │        │                     │
│   Start over."      │        │   [Fix it] [Ignore] │
└─────────────────────┘        └─────────────────────┘

The goal: Creativity flows freely within brand-safe boundaries.

Users barely notice the compliance system is there —
they just notice that their designs work.
```

### Speaker Notes
> "I want to end with the philosophy that drove every decision in ReTexture.

> Compliance should be an invisible guardrail, not a visible blocker.

> Think about guardrails on a highway. When you're driving normally, you don't even notice they're there. You don't think about them, you don't interact with them, you just... drive. But if you start to veer off the road, the guardrail is there to nudge you back.

> That's what we've built. When suppliers are designing within the rules, they don't see warnings, they don't see errors, they don't even notice the compliance system is running. Their creativity flows freely.

> But the moment they start to go off-track — a font that's too small, a color with insufficient contrast, a blocked keyword in their headline — the system gently alerts them. Not with a rejection. Not with 'start over.' But with a specific message and a one-click fix.

> The transformation is from 'your design violates 7 rules, start over' to 'this text needs higher contrast — click here to fix it.'

> The goal is that users barely notice the compliance system exists. They just notice that their designs work. That's the invisible guardrail."

---

## SLIDE 18: Demo Flow

### Visual Suggestion
- Numbered step-by-step flow
- Screenshots at each step
- Time estimates

### On-Slide Text
```
DEMO FLOW

1. OPEN EDITOR → Navigate to /editor (0:00)

2. CHOOSE TEMPLATE → Pre-validated layout (0:15)

3. UPLOAD PRODUCT → Add packshot image (0:30)

4. REMOVE BACKGROUND → One-click transparent PNG (0:45)

5. GENERATE HEADLINE → AI suggests 3 options (1:00)

6. ADD TESCO STICKER → Drag from library (1:30)

7. VALIDATE → Click "Compliance" tab (2:00)

8. AUTO-FIX → One-click fix any violations (2:30)

9. EXPORT → Download compliant PNG/JPG (3:00)

Total Time: UNDER 5 MINUTES from blank canvas to compliant export
```

### Speaker Notes
> "If we have time for a demo, here's the flow I'd walk through.

> Start by opening the editor. It's a clean, modern interface with the canvas in the center and tool panels around the edges.

> Choose a template. We have pre-validated templates for common use cases — car sales, flash sales, travel promotions. These templates are already compliant, so they're safe starting points.

> Upload a product image. Drag and drop or click to upload.

> Remove the background. This is one of the most satisfying moments — click the remove-background button, wait two seconds, and the product is now on a transparent background.

> Generate a headline. Click the headline generator, it analyzes the product, and offers three AI-generated options. Pick one, click to add it to the canvas.

> Add a Tesco sticker from the library. These are pre-validated, so they come with the 'isTescoTag' property already set.

> Validate. Click the Compliance tab, run validation. You'll either see a green '100% compliant' or a list of violations.

> Auto-fix. For any violations marked as autoFixable, click the fix button. Watch the element update on the canvas.

> Export. Download as PNG, JPG, or JSON for later editing.

> Total time: well under five minutes. Compare that to multiple days of back-and-forth review cycles."

---

## SLIDE 19: Team

### Visual Suggestion
- Team member photos or avatars
- GitHub handles
- Role/contribution indicators

### On-Slide Text
```
THE TEAM

Tesco Retail Media InnovAItion Jam 2025-26

┌───────────────┬───────────────┬───────────────┬───────────────┐
│    Ashish K.  │   Himanshu    │    Pratham    │    Arpan      │
│   Choudhary   │     Gupta     │     Gupta     │    Taneja     │
│               │               │               │               │
│ @ImAshish     │  @himax12     │ @PrathamGupta │  @arpan-lol   │
│  Choudhary    │               │      06       │               │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

### Speaker Notes
> "ReTexture was built by a team of four for the Tesco Retail Media InnovAItion Jam 2025-26. We're all passionate about the intersection of AI and software engineering, and we saw this challenge as a perfect opportunity to solve a real problem using modern AI capabilities paired with solid engineering fundamentals.

> We'd like to thank Tesco for organizing this hackathon and giving us the opportunity to work on such an impactful problem."

---

## SLIDE 20: Thank You / Q&A

### Visual Suggestion
- Large "Thank You" with ReTexture branding
- Contact information / links
- Q&A prompt

### On-Slide Text
```
THANK YOU

ReTexture - AI-Powered Retail Media Compliance Platform

Questions?

─────────────────────────

Running the Demo:
• Frontend: localhost:3000/editor
• Backend: localhost:8000

GitHub: [repository link]
```

### Speaker Notes
> "Thank you for your attention. We're happy to take any questions about the technology, the business impact, or to dive deeper into any specific aspect of the system.

> If you'd like to see a live demo, we can run through the full flow — from blank canvas to compliant export — in just a few minutes."

---

# APPENDIX: Additional Talking Points

## If Asked About Scalability
> "The frontend is entirely client-side, so it scales infinitely — each user's browser is doing the work. The backend is stateless, so it can be horizontally scaled behind a load balancer. Each API call is independent. We could put this behind Kubernetes and scale to thousands of concurrent users."

## If Asked About Security
> "All image data is processed in-memory. We don't store user designs on our servers unless they explicitly save to our system. AI calls go through authenticated Vertex AI endpoints. Base64 images are extracted and restored to prevent AI from modifying them."

## If Asked About Accuracy of AI-Generated Content
> "This is exactly why we have the 'agent proposes, geometry decides' principle. AI-generated content is never trusted blindly. Headlines go through blocked keyword validation. Placements are constrained to pre-validated coordinates. Image variations are generated with compliance prompts. And after everything, the user still runs explicit validation."

## If Asked About Extending to Other Brands
> "The architecture is designed for extensibility. The validation rules are defined in a JSON configuration file. The spatial grid and placement system are brand-agnostic. To support a new brand, you'd primarily need to: update the rule configuration, add new blocked keywords, update the compliance prompt suffix, and add brand-specific stickers and templates."

## If Asked About Offline Capability
> "The editor itself works offline for basic design operations. You can add elements, move things around, change colors — all without network connectivity. You only need to be online for AI features (headline generation, image variations) and validation. We cache validated designs locally so you can continue editing even if connection drops mid-session."
