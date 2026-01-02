/**
 * Content rules: Keywords, required elements, Clubcard dates
 */

import CONSTANTS from "../constants.json";

export function checkBlockedKeywords(elements) {
  console.log("🔍 [CONTENT RULES] checkBlockedKeywords called");
  console.log("  ↳ Elements count:", elements.length);
  console.log("  ↳ Blocked keywords:", CONSTANTS.BLOCKED_KEYWORDS);

  const violations = [];
  const textElements = elements.filter((el) => el.type === "text");
  console.log(`  ↳ Text elements: ${textElements.length}`);

  // Keyword replacement suggestions
  const keywordSuggestions = {
    win: 'Try "enjoy" or "discover"',
    prize: 'Try "reward" or "benefit"',
    competition: 'Try "collection" or "range"',
    "free delivery": 'Try "convenient delivery"',
    "50% off": 'Try "great value" or "special offer"',
    "% off": 'Try "reduced price" or "savings"',
  };

  textElements.forEach((el, index) => {
    const text = (el.text || "").toLowerCase();
    console.log(
      `  🔍 Checking text ${index + 1}/${textElements.length}: ${el.id}`
    );
    console.log(`    ↳ Content: "${text}"`);

    CONSTANTS.BLOCKED_KEYWORDS.forEach((keyword) => {
      if (text.includes(keyword.toLowerCase())) {
        console.log(`    ⚠️ BLOCKED KEYWORD FOUND: "${keyword}"`);
        const suggestion =
          keywordSuggestions[keyword.toLowerCase()] ||
          "Remove or rephrase this text";

        violations.push({
          elementId: el.id,
          rule: "BLOCKED_KEYWORD",
          severity: "hard",
          message: `Text contains blocked keyword: "${keyword}"`,
          autoFixable: false,
          autoFix: null,
          suggestion: suggestion,
        });
      }
    });
  });

  console.log(
    `✅ checkBlockedKeywords complete: ${violations.length} violations`
  );
  return violations;
}

export function checkRequiredElements(elements) {
  console.log("🔍 [CONTENT RULES] checkRequiredElements called");
  console.log("  ↳ Elements count:", elements.length);
  console.log("  ↳ Allowed tags:", CONSTANTS.ALLOWED_TAGS);

  const violations = [];

  // Check for Tesco tag
  const textElements = elements.filter((el) => el.type === "text");
  console.log(`  ↳ Text elements: ${textElements.length}`);

  const hasValidTag = textElements.some((el) => {
    const text = (el.text || "").toLowerCase().trim();
    const hasTag = CONSTANTS.ALLOWED_TAGS.some((tag) => text.includes(tag));
    if (hasTag) {
      console.log(`  ✅ Found valid Tesco tag in: ${el.id} - "${text}"`);
    }
    return hasTag;
  });

  console.log(`  ↳ Has valid Tesco tag? ${hasValidTag}`);

  if (!hasValidTag) {
    console.log("  ⚠️ MISSING TESCO TAG!");
    violations.push({
      elementId: null,
      rule: "MISSING_TAG",
      severity: "hard",
      message: 'Missing required Tesco tag (e.g., "Only at Tesco")',
      autoFixable: true,
      autoFix: {
        action: "add_element",
        element: {
          type: "text",
          text: "Available at Tesco",
          fontSize: 20,
        },
      },
    });
  }

  // Check for headline (text with large font size)
  console.log("  🔍 Checking for headline...");
  const headlineMinSize = CONSTANTS.HEADLINE?.MIN_FONT_SIZE || 24;
  console.log(`  ↳ Headline min font size: ${headlineMinSize}px`);

  const hasHeadline = textElements.some((el) => {
    const fontSize = el.fontSize || 16;
    const text = (el.text || "").trim();
    const isHeadline = fontSize >= headlineMinSize && text.length > 0;

    // Exclude Tesco tags from being counted as headline
    const isTag = CONSTANTS.ALLOWED_TAGS.some((tag) =>
      text.toLowerCase().includes(tag)
    );

    if (isHeadline && !isTag) {
      console.log(
        `  ✅ Found headline: "${text.substring(0, 30)}..." (${fontSize}px)`
      );
      return true;
    }
    return false;
  });

  console.log(`  ↳ Has headline? ${hasHeadline}`);

  if (!hasHeadline && CONSTANTS.HEADLINE?.REQUIRED !== false) {
    console.log("  ⚠️ MISSING HEADLINE!");
    violations.push({
      elementId: null,
      rule: "MISSING_HEADLINE",
      severity: "hard",
      message: `Design must have a headline (text with font size >= ${headlineMinSize}px)`,
      autoFixable: true,
      autoFix: {
        action: "add_element",
        element: {
          type: "text",
          text: "Your Headline Here",
          fontSize: headlineMinSize,
        },
      },
    });
  }

  console.log(
    `✅ checkRequiredElements complete: ${violations.length} violations`
  );
  return violations;
}

export function checkClubcardDate(elements) {
  console.log("🔍 [CONTENT RULES] checkClubcardDate called");
  console.log("  ↳ Elements count:", elements.length);

  const violations = [];

  // Look for Clubcard tiles
  const clubcardElements = elements.filter((el) =>
    (el.text || "").toLowerCase().includes("clubcard")
  );

  console.log(`  ↳ Clubcard elements found: ${clubcardElements.length}`);

  clubcardElements.forEach((el, index) => {
    const text = el.text || "";
    console.log(
      `  🔍 Checking Clubcard ${index + 1}/${clubcardElements.length}: ${el.id}`
    );
    console.log(`    ↳ Content: "${text}"`);

    const hasDateFormat = /ends\s+\d{1,2}\/\d{1,2}/i.test(text);
    console.log(`    ↳ Has date format (Ends DD/MM)? ${hasDateFormat}`);

    if (!hasDateFormat) {
      console.log(`    ⚠️ MISSING CLUBCARD DATE FORMAT!`);
      violations.push({
        elementId: el.id,
        rule: "CLUBCARD_DATE",
        severity: "hard",
        message: 'Clubcard promotion must include "Ends DD/MM" date',
        autoFixable: false,
        autoFix: null,
      });
    }
  });

  console.log(`✅ checkClubcardDate complete: ${violations.length} violations`);
  return violations;
}
