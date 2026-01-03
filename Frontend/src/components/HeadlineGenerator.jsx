
import React, { useState, useCallback } from 'react';
import { Button, Input, Select, Card, Spin, Tag, message, Tooltip, Space, Divider } from 'antd';
import { 
  BulbOutlined, 
  ThunderboltOutlined, 
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined
} from '@ant-design/icons';
import { 
  suggestKeywords, 
  generateHeadlines, 
  generateSubheadings, 
  calculatePlacement 
} from '../api/headlineApi';
import { TextPlacementService } from '../services/textPlacementService';
import { validateHeadlineText, formatHeadlineCompliance } from '../utils/complianceChecker';
import { useEditorStore } from '../store/useEditorStore';

// Import compliance-aware layout engine for zone validation
import { getZones, isInNoGoZone, validatePlacement } from '../compliance/utils/layoutEngine';

const { Option } = Select;

// Campaign types
const CAMPAIGN_TYPES = [
  { value: 'promotion', label: '🏷️ Promotion' },
  { value: 'seasonal', label: '🍂 Seasonal' },
  { value: 'new_product', label: '✨ New Product' },
  { value: 'everyday', label: '🛒 Everyday Value' },
  { value: 'premium', label: '💎 Premium' },
];

const HeadlineGenerator = ({ 
  canvasImageBase64,  // Base64 of current canvas/product image
  canvasSize,         // { w: number, h: number }
  onAddHeadline,      // Callback to add headline to canvas
  onAddSubheading,    // Callback to add subheading to canvas
  designId = 'default',
  logoPosition = 'bottom-right',
  imageBounds = null  // { x, y, width, height } for TescoLogo-style placement
}) => {
  // State
  const [keywords, setKeywords] = useState([]);
  const [inputKeyword, setInputKeyword] = useState('');
  const [campaignType, setCampaignType] = useState(null);
  const [headlines, setHeadlines] = useState([]);
  const [subheadings, setSubheadings] = useState([]);
  
  // Editor Store - for finding existing headline when placing subheading
  const editorPages = useEditorStore((state) => state.editorPages);
  const activeIndex = useEditorStore((state) => state.activeIndex);
  
  // AntD Message Hook
  const [messageApi, contextHolder] = message.useMessage();
  
  // Loading states
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [loadingHeadlines, setLoadingHeadlines] = useState(false);
  const [loadingSubheadings, setLoadingSubheadings] = useState(false);
  
  console.log('📝 [HEADLINE GENERATOR] Render', { 
    hasImage: !!canvasImageBase64, 
    canvasSize,
    keywordsCount: keywords.length,
    headlinesCount: headlines.length,
    subheadingsCount: subheadings.length
  });

  // Handle keyword suggestion (like VS Code commit message)
  const handleSuggestKeywords = useCallback(async () => {
    if (!canvasImageBase64) {
      messageApi.warning('No image on canvas to analyze');
      return;
    }
    
    console.log('✨ [HEADLINE GENERATOR] Suggesting keywords...');
    setLoadingKeywords(true);
    
    try {
      const result = await suggestKeywords(canvasImageBase64);
      
      if (result.success && result.keywords?.length > 0) {
        setKeywords(result.keywords);
        messageApi.success(`Found ${result.keywords.length} keywords`);
      } else {
        messageApi.error(result.error || 'Failed to suggest keywords');
      }
    } catch (error) {
      console.error('❌ [HEADLINE GENERATOR] Keyword suggestion error:', error);
      messageApi.error('Failed to suggest keywords');
    } finally {
      setLoadingKeywords(false);
    }
  }, [canvasImageBase64]);
  
  // Add manual keyword
  const handleAddKeyword = useCallback(() => {
    if (inputKeyword.trim() && !keywords.includes(inputKeyword.trim())) {
      setKeywords([...keywords, inputKeyword.trim()]);
      setInputKeyword('');
    }
  }, [inputKeyword, keywords]);
  
  // Remove keyword
  const handleRemoveKeyword = useCallback((keyword) => {
    setKeywords(keywords.filter(k => k !== keyword));
  }, [keywords]);
  
  // Generate headlines
  const handleGenerateHeadlines = useCallback(async () => {
    console.log('=' .repeat(60));
    console.log('📝 [HEADLINE GENERATOR] handleGenerateHeadlines CALLED');
    console.log('=' .repeat(60));
    console.log('📝 [HEADLINE GENERATOR] canvasImageBase64 exists?', !!canvasImageBase64);
    console.log('📝 [HEADLINE GENERATOR] canvasImageBase64 length:', canvasImageBase64?.length || 0);
    
    if (!canvasImageBase64) {
      console.log('❌ [HEADLINE GENERATOR] No image - aborting');
      messageApi.warning('No image on canvas to analyze');
      return;
    }
    
    console.log('📝 [HEADLINE GENERATOR] Setting loadingHeadlines=true');
    setLoadingHeadlines(true);
    
    try {
      console.log('📝 [HEADLINE GENERATOR] Calling generateHeadlines API...');
      console.log('📝 [HEADLINE GENERATOR] Params:', {
        imageBase64Length: canvasImageBase64?.length,
        designId,
        campaignType,
        userKeywords: keywords
      });
      
      const result = await generateHeadlines({
        imageBase64: canvasImageBase64,
        designId,
        campaignType,
        userKeywords: keywords.length > 0 ? keywords : null
      });
      
      console.log('📥 [HEADLINE GENERATOR] API Response:', result);
      console.log('📥 [HEADLINE GENERATOR] result.success:', result.success);
      console.log('📥 [HEADLINE GENERATOR] result.headlines:', result.headlines);
      console.log('📥 [HEADLINE GENERATOR] result.headlines type:', typeof result.headlines);
      console.log('📥 [HEADLINE GENERATOR] result.headlines?.length:', result.headlines?.length);
      
      if (result.success && result.headlines?.length > 0) {
        console.log('✅ [HEADLINE GENERATOR] SUCCESS! Setting headlines state...');
        console.log('✅ [HEADLINE GENERATOR] Headlines to set:', JSON.stringify(result.headlines, null, 2));
        setHeadlines(result.headlines);
        console.log('✅ [HEADLINE GENERATOR] setHeadlines() called');
        messageApi.success(`Generated ${result.headlines.length} headlines`);
      } else {
        console.log('❌ [HEADLINE GENERATOR] FAILED - No headlines in result');
        console.log('❌ [HEADLINE GENERATOR] Error:', result.error);
        messageApi.error(result.error || 'Failed to generate headlines');
      }
    } catch (error) {
      console.error('❌ [HEADLINE GENERATOR] EXCEPTION:', error);
      messageApi.error('Failed to generate headlines');
    } finally {
      console.log('📝 [HEADLINE GENERATOR] Setting loadingHeadlines=false');
      setLoadingHeadlines(false);
      console.log('=' .repeat(60));
    }
  }, [canvasImageBase64, designId, campaignType, keywords]);
  
  // Generate subheadings
  const handleGenerateSubheadings = useCallback(async () => {
    if (!canvasImageBase64) {
      messageApi.warning('No image on canvas to analyze');
      return;
    }
    
    console.log('📝 [HEADLINE GENERATOR] Generating subheadings...');
    setLoadingSubheadings(true);
    
    try {
      const result = await generateSubheadings({
        imageBase64: canvasImageBase64,
        designId,
        campaignType,
        userKeywords: keywords.length > 0 ? keywords : null
      });
      
      if (result.success && result.subheadings?.length > 0) {
        setSubheadings(result.subheadings);
        messageApi.success(`Generated ${result.subheadings.length} subheadings`);
      } else {
        messageApi.error(result.error || 'Failed to generate subheadings');
      }
    } catch (error) {
      console.error('❌ [HEADLINE GENERATOR] Subheading generation error:', error);
      messageApi.error('Failed to generate subheadings');
    } finally {
      setLoadingSubheadings(false);
    }
  }, [canvasImageBase64, designId, campaignType, keywords]);
  
  // Add headline to canvas with SMART LLM PLACEMENT
  const handleAddToCanvas = useCallback(async (text, isSubheading = false) => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎯 [HEADLINE] ═══ STARTING HEADLINE PLACEMENT ═══');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📝 [HEADLINE] Text:', text);
    console.log('📝 [HEADLINE] Is Subheading:', isSubheading);
    console.log('📐 [HEADLINE] Canvas Size:', canvasSize);
    console.log('📸 [HEADLINE] Has Canvas Image:', !!canvasImageBase64);
    console.log('📸 [HEADLINE] Image Base64 Length:', canvasImageBase64?.length || 0);
    
    // COMPLIANCE CHECK - Validate text before adding
    console.log('───────────────────────────────────────────────────────────────');
    console.log('🛡️ [HEADLINE] STEP 1: COMPLIANCE CHECK');
    console.log('───────────────────────────────────────────────────────────────');
    const compliance = validateHeadlineText(text, isSubheading);
    const complianceStatus = formatHeadlineCompliance(compliance);
    console.log('🛡️ [HEADLINE] Compliant:', compliance.compliant);
    console.log('🛡️ [HEADLINE] Issues:', compliance.issues);
    console.log('🛡️ [HEADLINE] Warnings:', compliance.warnings);
    console.log('🛡️ [HEADLINE] Status:', complianceStatus.status);
    
    if (!compliance.compliant) {
      // HARD FAIL - Block non-compliant text
      console.log('❌ [HEADLINE] BLOCKED - Text not compliant!');
      messageApi.error(complianceStatus.message);
      complianceStatus.details?.forEach(issue => {
        messageApi.warning(issue, 5);
      });
      return; // Don't add to canvas
    }
    
    if (complianceStatus.status === 'warning') {
      // Show warnings but allow adding
      console.log('⚠️ [HEADLINE] Warnings present but proceeding...');
      messageApi.warning(complianceStatus.message);
    }
    
    // Get RELIABLE BOUNDS - use canvas size as primary, image bounds for offset
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📐 [HEADLINE] STEP 2: CLIENT-SIDE CANVAS ANALYSIS');
    console.log('───────────────────────────────────────────────────────────────');
    
    // Use canvas size for width/height, image bounds for offset if available
    const canvasWidth = canvasSize?.w || 800;
    const canvasHeight = canvasSize?.h || 600;
    
    console.log('📐 [HEADLINE] Canvas Size:', canvasWidth, 'x', canvasHeight);
    console.log('📐 [HEADLINE] Image Bounds:', imageBounds);
    
    let position;
    
    // === CHECK FOR EXISTING TEXT ELEMENTS ===
    let existingHeadline = null;
    let existingSubheading = null;
    const page = editorPages?.[activeIndex];
    
    if (page && page.children) {
      existingHeadline = page.children.find(child => 
        child.id?.startsWith('headline-') && child.type === 'text' && !child.id?.includes('sub')
      );
      existingSubheading = page.children.find(child => 
        child.id?.startsWith('subheading-') && child.type === 'text'
      );
    }
    
    console.log('🔍 [TEXT] Existing headline:', existingHeadline?.id || 'none');
    console.log('🔍 [TEXT] Existing subheading:', existingSubheading?.id || 'none');
    
    // === HEADLINE: Position relative to existing subheading ===
    if (!isSubheading && existingSubheading) {
      console.log('📐 [HEADLINE] Positioning above existing subheading');
      
      const fontSize = Math.max(28, Math.min(52, canvasWidth / 16));
      // Use provided text to estimate height
      const headlineText = text || 'Headline';
      
      const avgCharWidth = fontSize * 0.55;
      const textWidth = existingSubheading.width; // Match width
      const charsPerLine = Math.max(10, Math.floor(textWidth / avgCharWidth));
      const estimatedLines = Math.max(1, Math.ceil(headlineText.length / charsPerLine));
      
      const lineHeight = fontSize * 1.3;
      const headlineHeight = lineHeight * estimatedLines;
      
      // Gap
      const GOLDEN_RATIO = 1.618;
      const goldenGap = fontSize / GOLDEN_RATIO;
      const gap = Math.max(20, goldenGap);
      
      // Top of subheading - gap - headline height
      const bottomOfHeadline = existingSubheading.y - gap;
      const topOfHeadline = bottomOfHeadline - headlineHeight;
      
      // Create position object
      position = {
        x: existingSubheading.x,
        y: Math.max(20, topOfHeadline), // Ensure not off-screen
        width: existingSubheading.width,
        fontSize: fontSize,
        color: existingSubheading.fill || '#FFFFFF',
        align: existingSubheading.align || 'center',
        shadowEnabled: true,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 4,
        fontWeight: 'bold',
        fontFamily: existingSubheading.fontFamily || 'Inter, Arial, sans-serif',
        isSmart: true
      };
      console.log('✅ [HEADLINE] Positioned above subheading at:', position.y);
    }
    // === SUBHEADING: Position relative to existing headline ===
    if (isSubheading && existingHeadline) {
      console.log('📐 [SUBHEADING] Positioning below existing headline');
      console.log('📐 [SUBHEADING] Headline details:', {
        y: existingHeadline.y,
        fontSize: existingHeadline.fontSize,
        width: existingHeadline.width,
        text: existingHeadline.text?.substring(0, 30) + '...'
      });
      
      // Calculate ACTUAL headline height (accounting for text wrapping)
      const fontSize = existingHeadline.fontSize || 42;
      const textWidth = existingHeadline.width || canvasWidth * 0.8;
      const headlineText = existingHeadline.text || '';
      
      // MORE GENEROUS character width estimate (typical proportional font)
      // Using 0.6 * fontSize as average char width is more accurate
      const avgCharWidth = fontSize * 0.55;
      const charsPerLine = Math.max(10, Math.floor(textWidth / avgCharWidth));
      const estimatedLines = Math.max(1, Math.ceil(headlineText.length / charsPerLine));
      
      // Calculate headline height with GENEROUS line spacing (1.4 for multi-line)
      const lineHeight = fontSize * 1.4;
      const headlineHeight = lineHeight * estimatedLines;
      
      // GOLDEN RATIO GAP between headline and subheading
      const GOLDEN_RATIO = 1.618;
      const goldenGap = fontSize / GOLDEN_RATIO; // ~0.618 * fontSize
      const subheadingGap = Math.max(20, goldenGap); // At least 20px gap
      
      // Position subheading below headline with proper gap
      const headlineBottom = existingHeadline.y + headlineHeight;
      
      console.log('📐 [SUBHEADING] Calculation:', {
        estimatedLines,
        headlineHeight,
        headlineBottom,
        goldenGap: goldenGap.toFixed(1),
        subheadingGap
      });
      
      position = {
        x: existingHeadline.x,
        y: headlineBottom + subheadingGap,
        width: existingHeadline.width,
        fontSize: Math.round(fontSize * 0.5), // 50% of headline font (2:1 ratio)
        color: existingHeadline.fill || '#FFFFFF',
        align: existingHeadline.align || 'center',
        shadowEnabled: existingHeadline.shadowEnabled !== false,
        shadowColor: existingHeadline.shadowColor || 'rgba(0,0,0,0.5)',
        shadowBlur: 3,
        fontWeight: 'normal',
        fontFamily: existingHeadline.fontFamily || 'Inter, Arial, sans-serif',
        isSmart: true
      };
      
      console.log('✅ [SUBHEADING] Final Y position:', position.y);
    }
    // === PRIMARY: Client-Side Canvas Analysis (No API Call!) ===
    else if (canvasImageBase64) {
      try {
        console.log('🔍 [HEADLINE] Running client-side canvas analysis...');
        const startTime = performance.now();
        
        // TextPlacementService analyzes:
        // 1. Divide image into 3x3 grid
        // 2. Calculate brightness & variance for each cell
        // 3. Score cells (top preference, center avoidance, logo avoidance)
        // 4. Pick the best zone for text
        const analysis = await TextPlacementService.analyze(
          canvasImageBase64,
          canvasWidth,
          canvasHeight,
          logoPosition || 'bottom-right',
          imageBounds
        );
        
        const endTime = performance.now();
        console.log('🔍 [HEADLINE] Analysis Time:', (endTime - startTime).toFixed(0), 'ms');
        
        // Get the appropriate position (headline or subheading)
        const smartPos = isSubheading ? analysis.subheading : analysis.headline;
        
        console.log('🔍 [HEADLINE] Smart Analysis Result:');
        console.log('   ├─ Zone:', smartPos.zone || 'auto');
        console.log('   ├─ X:', smartPos.x?.toFixed(0));
        console.log('   ├─ Y:', smartPos.y?.toFixed(0));
        console.log('   ├─ Width:', smartPos.width?.toFixed(0));
        console.log('   ├─ Font Size:', smartPos.fontSize);
        console.log('   ├─ Color:', smartPos.color);
        console.log('   └─ Align:', smartPos.align);
        
        position = {
          x: smartPos.x,
          y: smartPos.y,
          width: smartPos.width,
          fontSize: smartPos.fontSize,
          color: smartPos.color || '#FFFFFF',
          align: smartPos.align || 'center',
          shadowEnabled: smartPos.shadowEnabled !== false,
          shadowColor: smartPos.shadowColor || 'rgba(0,0,0,0.6)',
          shadowBlur: smartPos.shadowBlur || 4,
          fontWeight: isSubheading ? 'normal' : 'bold',
          fontFamily: 'Inter, Arial, sans-serif',
          isSmart: true
        };
        
        console.log('✅ [HEADLINE] Client-side analysis SUCCESS!');
        
      } catch (e) {
        console.warn('⚠️ [HEADLINE] Canvas analysis failed:', e.message);
        console.log('📐 [HEADLINE] Falling back to default positioning...');
        position = null; // Will use fallback below
      }
    }
    
    // === FALLBACK: Simple reliable positioning ===
    if (!position) {
      console.log('📐 [HEADLINE] Using fallback positioning (no canvas analysis)');
      const paddingPercent = 0.10;
      const textWidth = canvasWidth * 0.80;
      const xPos = canvasWidth * paddingPercent;
      const yPercent = isSubheading ? 0.22 : 0.08;
      const yPos = canvasHeight * yPercent;
      const fontSize = isSubheading 
        ? Math.max(18, Math.min(28, canvasWidth / 30))
        : Math.max(28, Math.min(48, canvasWidth / 18));
      
      position = {
        x: xPos,
        y: yPos,
        width: textWidth,
        fontSize: fontSize,
        color: '#FFFFFF',
        align: 'center',
        shadowEnabled: true,
        shadowColor: 'rgba(0,0,0,0.6)',
        shadowBlur: 4,
        fontWeight: isSubheading ? 'normal' : 'bold',
        fontFamily: 'Inter, Arial, sans-serif',
        isSmart: false
      };
    }
    
    console.log('📐 [HEADLINE] Final Position:', position);
    
    // === ZONE VALIDATION: Ensure text is in compliant content zone ===
    const zones = getZones(canvasWidth, canvasHeight, '9:16');
    const textRect = {
      x: position.x,
      y: position.y,
      width: position.width || 200,
      height: position.fontSize * 2 // Estimate text height
    };
    
    if (isInNoGoZone(textRect, zones)) {
      console.log('⚠️ [HEADLINE] Text is in NO-GO ZONE! Adjusting...');
      const contentZone = zones.content;
      
      // Clamp Y to content zone
      if (position.y < contentZone.y) {
        console.log(`🔧 [HEADLINE] Moving Y from ${position.y} to ${contentZone.y + 20}`);
        position.y = contentZone.y + 20;
      }
      if (position.y + textRect.height > contentZone.y + contentZone.height) {
        console.log(`🔧 [HEADLINE] Moving Y up to avoid bottom zone`);
        position.y = contentZone.y + contentZone.height - textRect.height - 20;
      }
    } else {
      console.log('✅ [HEADLINE] Position is in compliant zone');
    }
    
    // === LOGO COLLISION DETECTION ===
    // Find logo on canvas and adjust text position if overlapping
    if (page && page.children) {
      const logo = page.children.find(child => child.id?.startsWith('logo-'));
      
      if (logo) {
        console.log('🏪 [HEADLINE] Logo detected at:', { x: logo.x, y: logo.y, w: logo.width, h: logo.height });
        
        // Calculate text bounding box
        const textHeight = position.fontSize * 2; // Estimate text height
        const textBottom = position.y + textHeight;
        const textRight = position.x + position.width;
        
        // Check for collision (any overlap)
        const horizontalOverlap = 
          position.x < logo.x + logo.width &&
          textRight > logo.x;
        const verticalOverlap = 
          position.y < logo.y + logo.height &&
          textBottom > logo.y;
        
        if (horizontalOverlap && verticalOverlap) {
          console.log('⚠️ [HEADLINE] COLLISION with logo detected!');
          
          // Adjust text to avoid logo - move UP above the logo
          const safeY = Math.max(20, logo.y - textHeight - 20); // 20px above logo top
          console.log('🔧 [HEADLINE] Adjusting Y from', position.y, 'to', safeY);
          position.y = safeY;
        } else {
          console.log('✅ [HEADLINE] No collision with logo');
        }
      }
    }
    
    // 2. TRY AI-POWERED FONT STYLING (Gemini Vision) - ENHANCE FONT
    console.log('───────────────────────────────────────────────────────────────');
    console.log('🎨 [HEADLINE] STEP 4: AI FONT STYLING (Gemini Vision)');
    console.log('───────────────────────────────────────────────────────────────');
    
    if (canvasImageBase64) {
      try {
        console.log('🎨 [HEADLINE] Calling getFontStyle API...');
        const startTime = performance.now();
        const { getFontStyle } = await import('../api/headlineApi');
        const { getStyleFromMood } = await import('../config/fonts');
        
        const fontResult = await getFontStyle({ imageBase64: canvasImageBase64 });
        const endTime = performance.now();
        
        console.log('🎨 [HEADLINE] API Response Time:', (endTime - startTime).toFixed(0), 'ms');
        console.log('🎨 [HEADLINE] API Success:', fontResult.success);
        console.log('🎨 [HEADLINE] Full Font Result:', JSON.stringify(fontResult, null, 2));
        
        if (fontResult.success && fontResult.fontStyle) {
          const mood = fontResult.fontStyle.mood;
          const fontStyle = getStyleFromMood(mood, isSubheading);
          
          console.log('🎨 [HEADLINE] Font Style Details:');
          console.log('   ├─ Detected Mood:', mood);
          console.log('   ├─ AI Reasoning:', fontResult.fontStyle.reasoning);
          console.log('   ├─ Mapped Font Family:', fontStyle.fontFamily);
          console.log('   ├─ Mapped Font Weight:', fontStyle.fontWeight);
          console.log('   ├─ Letter Spacing:', fontStyle.letterSpacing);
          console.log('   └─ Text Transform:', fontStyle.textTransform);
          
          // Apply AI-recommended font styling
          position = {
            ...position,
            fontFamily: fontStyle.fontFamily,
            fontWeight: fontStyle.fontWeight,
            letterSpacing: fontStyle.letterSpacing,
            textTransform: fontStyle.textTransform,
          };
          
          console.log('✅ [HEADLINE] AI Font Style Applied Successfully!');
        } else {
          console.warn('⚠️ [HEADLINE] Font styling returned no data, using defaults');
        }
      } catch (e) {
        console.error('❌ [HEADLINE] Font styling failed!');
        console.error('❌ [HEADLINE] Error:', e.message);
        console.warn('⚠️ [HEADLINE] Using default font styling...');
      }
    } else {
      console.warn('⚠️ [HEADLINE] No canvas image available, skipping font styling');
    }
    
    // FINAL POSITION SUMMARY
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📍 [HEADLINE] ═══ FINAL POSITION SUMMARY ═══');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📍 [HEADLINE] Position X:', position.x);
    console.log('📍 [HEADLINE] Position Y:', position.y);
    console.log('📍 [HEADLINE] Width:', position.width);
    console.log('📍 [HEADLINE] Font Size:', position.fontSize);
    console.log('📍 [HEADLINE] Font Family:', position.fontFamily);
    console.log('📍 [HEADLINE] Font Weight:', position.fontWeight);
    console.log('📍 [HEADLINE] Color:', position.color);
    console.log('📍 [HEADLINE] Align:', position.align);
    console.log('📍 [HEADLINE] Shadow Enabled:', position.shadowEnabled);
    console.log('📍 [HEADLINE] Shadow Color:', position.shadowColor);
    console.log('📍 [HEADLINE] Letter Spacing:', position.letterSpacing);
    console.log('📍 [HEADLINE] Text Transform:', position.textTransform);
    console.log('═══════════════════════════════════════════════════════════════');
    
    // STEP 5: ADD TO CANVAS
    console.log('───────────────────────────────────────────────────────────────');
    console.log('🖼️ [HEADLINE] STEP 5: ADDING TO CANVAS');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('🖼️ [HEADLINE] Calling parent callback...');
    console.log('🖼️ [HEADLINE] Is Subheading:', isSubheading);
    
    if (isSubheading) {
      if (typeof onAddSubheading === 'function') {
        onAddSubheading(text, position);
        console.log('✅ [HEADLINE] onAddSubheading called successfully!');
      } else {
        console.error('❌ [HEADLINE] onAddSubheading is NOT a function!');
      }
    } else {
      if (typeof onAddHeadline === 'function') {
        onAddHeadline(text, position);
        console.log('✅ [HEADLINE] onAddHeadline called successfully!');
      } else {
        console.error('❌ [HEADLINE] onAddHeadline is NOT a function!');
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 [HEADLINE] ═══ HEADLINE PLACEMENT COMPLETE ═══');
    console.log('═══════════════════════════════════════════════════════════════');
    
    messageApi.success(`Added "${text.substring(0, 20)}..." to canvas`);
  }, [canvasSize, canvasImageBase64, onAddHeadline, onAddSubheading, logoPosition, imageBounds]);
  
  // Render confidence stars
  const renderConfidence = (confidence) => {
    const stars = Math.round(confidence * 5);
    return (
      <Space size={2}>
        {[...Array(5)].map((_, i) => (
          i < stars 
            ? <StarFilled key={i} style={{ color: '#faad14', fontSize: 10 }} />
            : <StarOutlined key={i} style={{ color: '#d9d9d9', fontSize: 10 }} />
        ))}
      </Space>
    );
  };
  
  return (
    <div style={{ padding: '8px 0' }}>
      {contextHolder}
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BulbOutlined style={{ color: '#faad14' }} />
          Headline Generator
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
          AI-powered headlines using Gemini Vision
        </p>
      </div>
      
      <Divider style={{ margin: '12px 0' }} />
      
      {/* Campaign Type (Optional) */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>
          Campaign Type (optional)
        </label>
        <Select
          placeholder="Select campaign type"
          value={campaignType}
          onChange={setCampaignType}
          allowClear
          style={{ width: '100%' }}
          size="small"
        >
          {CAMPAIGN_TYPES.map(ct => (
            <Option key={ct.value} value={ct.value}>{ct.label}</Option>
          ))}
        </Select>
      </div>
      
      {/* Keywords */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>
          Keywords
        </label>
        <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
          <Input
            placeholder="Add keyword..."
            value={inputKeyword}
            onChange={e => setInputKeyword(e.target.value)}
            onPressEnter={handleAddKeyword}
            size="small"
            style={{ flex: 1 }}
          />
          <Tooltip title="✨ AI Suggest Keywords">
            <Button 
              icon={<ThunderboltOutlined />}
              onClick={handleSuggestKeywords}
              loading={loadingKeywords}
              size="small"
              type="primary"
              style={{ background: '#722ed1' }}
            />
          </Tooltip>
        </Space.Compact>
        
        {/* Keyword Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {keywords.map(keyword => (
            <Tag 
              key={keyword} 
              closable 
              onClose={() => handleRemoveKeyword(keyword)}
              color="purple"
              style={{ fontSize: 11 }}
            >
              {keyword}
            </Tag>
          ))}
        </div>
      </div>
      
      <Divider style={{ margin: '12px 0' }} />
      
      {/* Generate Buttons */}
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button
          type="primary"
          icon={<BulbOutlined />}
          onClick={handleGenerateHeadlines}
          loading={loadingHeadlines}
          disabled={!canvasImageBase64}
          block
          size="small"
        >
          Generate Headlines
        </Button>
        
        <Button
          icon={<BulbOutlined />}
          onClick={handleGenerateSubheadings}
          loading={loadingSubheadings}
          disabled={!canvasImageBase64}
          block
          size="small"
        >
          Generate Subheadings
        </Button>
      </Space>
      
      {/* Headlines Results */}
      {headlines.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 12, color: '#888' }}>
            Headlines
          </h5>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {headlines.map((h, idx) => (
              <Card 
                key={idx} 
                size="small" 
                style={{ 
                  background: '#f5f5f5',
                  border: '1px solid #e8e8e8'
                }}
                styles={{ body: { padding: 8 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.text}</div>
                    <div style={{ marginTop: 2 }}>{renderConfidence(h.confidence)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ position: 'relative', zIndex: 10 }} // Ensure button is above potential overlays
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('👆 [HEADLINE GENERATOR] Add Headline Button Clicked:', h.text);
                        handleAddToCanvas(h.text, false);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}
      
      {/* Subheadings Results */}
      {subheadings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 12, color: '#888' }}>
            Subheadings
          </h5>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {subheadings.map((s, idx) => (
              <Card 
                key={idx} 
                size="small" 
                style={{ 
                  background: '#f0f5ff',
                  border: '1px solid #d6e4ff'
                }}
                styles={{ body: { padding: 8 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>{s.text}</div>
                    <div style={{ marginTop: 2 }}>{renderConfidence(s.confidence)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ position: 'relative', zIndex: 10 }}
                      onClick={(e) => {
                         e.stopPropagation();
                         console.log('👆 [HEADLINE GENERATOR] Add Subheading Button Clicked:', s.text);
                         handleAddToCanvas(s.text, true);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}
      
      {/* No image warning */}
      {!canvasImageBase64 && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          background: '#fff7e6', 
          border: '1px solid #ffe58f',
          borderRadius: 4,
          fontSize: 12 
        }}>
          ⚠️ Add an image to the canvas first to generate headlines.
        </div>
      )}
    </div>
  );
};

export default HeadlineGenerator;
