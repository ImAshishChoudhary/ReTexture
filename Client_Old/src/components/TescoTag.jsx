/**
 * TescoTag - Smart Badge Insertion Component
 * 
 * Features:
 * - 3 official Tesco badge variants
 * - Smart positioning (avoids overlaps)
 * - Live position/size/opacity updates
 * - Toggle on/off
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Select, Slider, Space, message, Switch } from 'antd';
import { TagOutlined } from '@ant-design/icons';
import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';

// Import compliance-aware layout engine
import { findOptimalPosition, validatePlacement, getZones } from '../compliance/utils/layoutEngine';

// Import badge images
import badgeAvailable from '../assets/avl-on-tesco.png';
import badgeExclusive from '../assets/tesco-only-avl-here.png';
import badgeSelected from '../assets/selected-store-tesco.png';

console.log('🏷️ [TESCO_TAG] TescoTag badge component loaded');

// Badge configuration
const BADGE_CONFIG = {
  available: {
    src: badgeAvailable,
    label: '🛒 Available at Tesco',
    aspectRatio: 1.4, // Adjust based on actual badge dimensions
  },
  exclusive: {
    src: badgeExclusive,
    label: '⭐ Only at Tesco',
    aspectRatio: 1.4,
  },
  selected: {
    src: badgeSelected,
    label: '📍 Selected Stores',
    aspectRatio: 1.4,
  },
};

const POSITIONS = {
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right',
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  'middle-left': 'Middle Left',
  'middle-right': 'Middle Right',
};

export default function TescoTag({ setPagesWithHistory }) {
  // State
  const [enabled, setEnabled] = useState(false);
  const [badgeType, setBadgeType] = useState('available');
  const [position, setPosition] = useState('bottom-left');
  const [size, setSize] = useState(15); // Percentage of image width
  const [opacity, setOpacity] = useState(1.0);
  const [autoPosition, setAutoPosition] = useState(true); // Smart positioning

  // Store
  const activeIndex = useEditorStore((state) => state.activeIndex);
  const canvasSize = useEditorStore((state) => state.canvasSize);
  const editorPages = useEditorStore((state) => state.editorPages);

  // Load badge image
  const currentBadgeConfig = BADGE_CONFIG[badgeType];
  const [image, status] = useImage(currentBadgeConfig.src, 'anonymous');

  // Memoized image bounds - tracks main product image
  const imageBounds = useMemo(() => {
    const page = editorPages[activeIndex];
    if (page && page.children) {
      const mainImage = page.children.find(child => 
        child.type === 'image' && 
        !child.id.startsWith('logo-') &&
        !child.id.startsWith('badge-')
      );
      if (mainImage) {
        return {
          x: mainImage.x || 0,
          y: mainImage.y || 0,
          width: mainImage.width || canvasSize.w,
          height: mainImage.height || canvasSize.h,
          _key: `${mainImage.x}-${mainImage.y}-${mainImage.width}-${mainImage.height}`
        };
      }
    }
    return { x: 0, y: 0, width: canvasSize.w, height: canvasSize.h, _key: 'default' };
  }, [editorPages, activeIndex, canvasSize]);

  const getImageBounds = useCallback(() => imageBounds, [imageBounds]);

  // Smart placement algorithm using compliance-aware layout engine
  const findBestPosition = useCallback((bounds, badgeWidth, badgeHeight) => {
    console.log('🧠 [BADGE] Finding best compliance-aware position...');
    
    // Get all existing elements on canvas (normalized for layout engine)
    const page = editorPages[activeIndex];
    const existingElements = (page?.children || [])
      .filter(el => !el.id?.startsWith('badge-'))
      .map(el => {
        // Determine element type for priority scoring
        let type = el.type || 'decorative';
        if (el.id?.startsWith('logo-')) type = 'logo';
        else if (el.id?.includes('headline')) type = 'headline';
        else if (el.id?.includes('subhead')) type = 'subheading';
        else if (el.type === 'text') type = 'headline'; // Text defaults to headline priority
        
        // Calculate bounds (with text approximation)
        let width = el.width || 100;
        let height = el.height || 50;
        if (el.type === 'text') {
          const fontSize = el.fontSize || 20;
          width = (el.text || '').length * fontSize * 0.6;
          height = fontSize * 1.5;
        }
        
        return {
          id: el.id,
          type,
          x: el.x || 0,
          y: el.y || 0,
          width,
          height
        };
      });
    
    console.log('🧠 [BADGE] Existing elements for collision:', existingElements.length);
    
    // Use compliance-aware layout engine to find optimal position
    const badgeSize = { width: badgeWidth, height: badgeHeight };
    const optimal = findOptimalPosition(
      'badge',
      badgeSize,
      existingElements,
      canvasSize.w,
      canvasSize.h,
      '9:16' // Tesco format
    );
    
    // Validate the placement
    const validation = validatePlacement(
      { type: 'badge', x: optimal.x, y: optimal.y, width: badgeWidth, height: badgeHeight },
      existingElements,
      canvasSize.w,
      canvasSize.h,
      '9:16'
    );
    
    if (!validation.isValid) {
      console.warn('⚠️ [BADGE] Placement has compliance issues:', validation.violations);
      message.warning('Badge placement may have compliance issues');
    }
    
    console.log(`✅ [BADGE] Optimal position: ${optimal.anchor} (score: ${optimal.score})`);
    return optimal.anchor;
  }, [editorPages, activeIndex, canvasSize]);

  // Smart badge positioning - avoids overlaps
  const calculateBadgePosition = useCallback((bounds, badgeWidth, badgeHeight, pos) => {
    const padding = Math.max(20, bounds.width * 0.03);
    const safeZoneTop = 200; // Avoid Tesco logo area
    const safeZoneBottom = 250; // Tesco 9:16 safe zone
    
    let x, y;

    switch (pos) {
      case 'top-left':
        x = bounds.x + padding;
        y = bounds.y + safeZoneTop + padding;
        break;
      case 'top-right':
        x = bounds.x + bounds.width - badgeWidth - padding;
        y = bounds.y + safeZoneTop + padding;
        break;
      case 'middle-left':
        x = bounds.x + padding;
        y = bounds.y + (bounds.height / 2) - (badgeHeight / 2);
        break;
      case 'middle-right':
        x = bounds.x + bounds.width - badgeWidth - padding;
        y = bounds.y + (bounds.height / 2) - (badgeHeight / 2);
        break;
      case 'bottom-left':
        x = bounds.x + padding;
        y = bounds.y + bounds.height - safeZoneBottom - badgeHeight - 20;
        break;
      case 'bottom-right':
      default:
        x = bounds.x + bounds.width - badgeWidth - padding;
        y = bounds.y + bounds.height - safeZoneBottom - badgeHeight - 20;
        break;
    }

    console.log(`🏷️ [BADGE] Position calculated: ${pos} → x:${x}, y:${y}`);
    return { x, y };
  }, []);

  // Create or update badge
  const updateBadge = useCallback(() => {
    if (!enabled) {
      // Remove badge if disabled
      setPagesWithHistory((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        if (copy[activeIndex] && copy[activeIndex].children) {
          copy[activeIndex].children = copy[activeIndex].children.filter(
            child => !child.id.startsWith('badge-')
          );
        }
        console.log('🏷️ [BADGE] Badge removed');
        return copy;
      });
      return;
    }

    if (status !== 'loaded') return;

    const bounds = getImageBounds();
    const badgeWidth = Math.round((bounds.width * size) / 100);
    const badgeHeight = Math.round(badgeWidth / currentBadgeConfig.aspectRatio);
    
    // Use smart positioning if auto-position is enabled
    let finalPosition = position;
    if (autoPosition) {
      finalPosition = findBestPosition(bounds, badgeWidth, badgeHeight);
      console.log('🧠 [BADGE] Auto-position enabled, using:', finalPosition);
    }
    
    const { x, y } = calculateBadgePosition(bounds, badgeWidth, badgeHeight, finalPosition);

    console.log('🏷️ [BADGE] Creating badge:', {
      type: badgeType,
      position,
      size: { width: badgeWidth, height: badgeHeight },
      coords: { x, y }
    });

    setPagesWithHistory((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      
      if (!copy[activeIndex]) {
        copy[activeIndex] = { id: activeIndex + 1, children: [], background: '#ffffff' };
      }
      if (!copy[activeIndex].children) {
        copy[activeIndex].children = [];
      }

      // Find existing badge
      const badgeIndex = copy[activeIndex].children.findIndex(
        child => child.id.startsWith('badge-')
      );

      const badgeElement = {
        id: badgeIndex >= 0 ? copy[activeIndex].children[badgeIndex].id : `badge-${Date.now()}`,
        type: 'image',
        src: currentBadgeConfig.src,
        x,
        y,
        width: badgeWidth,
        height: badgeHeight,
        rotation: 0,
        opacity: opacity,
      };

      if (badgeIndex >= 0) {
        copy[activeIndex].children[badgeIndex] = badgeElement;
      } else {
        copy[activeIndex].children.push(badgeElement);
      }

      console.log('🏷️ [BADGE] Badge added/updated');
      return copy;
    });
  }, [enabled, status, size, position, opacity, badgeType, activeIndex, currentBadgeConfig, getImageBounds, calculateBadgePosition, setPagesWithHistory]);

  // Update badge when settings or image bounds change
  useEffect(() => {
    if (enabled && status === 'loaded') {
      console.log('🏷️ [BADGE] Repositioning badge for new bounds:', imageBounds._key);
      updateBadge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, position, size, opacity, badgeType, status, imageBounds._key]);

  // Handle toggle
  const handleToggle = (checked) => {
    setEnabled(checked);
    if (checked && status === 'loaded') {
      message.success('🏷️ Badge enabled!');
    } else if (!checked) {
      message.info('Badge removed');
    }
  };

  // Quick insert
  const handleQuickInsert = () => {
    setBadgeType('available');
    setPosition('bottom-left');
    setSize(15);
    setOpacity(1.0);
    setEnabled(true);
  };

  return (
    <Card size="small" title="🏷️ Tesco Badge" style={{ marginBottom: 12 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        
        {/* Toggle Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Insert Badge</span>
          <Switch 
            checked={enabled} 
            onChange={handleToggle}
            disabled={status !== 'loaded'}
          />
        </div>

        {/* Quick Insert */}
        <Button 
          type="primary" 
          block 
          onClick={handleQuickInsert}
          disabled={status !== 'loaded'}
          style={{ 
            background: status === 'loaded' ? '#00539F' : '#ccc', 
            borderColor: status === 'loaded' ? '#00539F' : '#ccc',
            height: 36,
            fontWeight: 600
          }}
        >
          ⚡ Quick Insert (Bottom-Left)
        </Button>

        {/* Controls (only show when enabled) */}
        {enabled && (
          <>
            {/* Badge Type */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Badge Type</div>
              <Select
                value={badgeType}
                onChange={setBadgeType}
                style={{ width: '100%' }}
                options={Object.entries(BADGE_CONFIG).map(([key, config]) => ({
                  value: key,
                  label: config.label,
                }))}
              />
            </div>

            {/* Auto-Position Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 12, color: '#666' }}>🧠 Auto-Position</span>
              <Switch 
                checked={autoPosition} 
                onChange={setAutoPosition}
                size="small"
              />
            </div>
            
            {/* Manual Position (only show if auto-position is off) */}
            {!autoPosition && (
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Position</div>
                <Select
                  value={position}
                  onChange={setPosition}
                  style={{ width: '100%' }}
                  options={Object.entries(POSITIONS).map(([key, label]) => ({
                    value: key,
                    label,
                  }))}
                />
              </div>
            )}

            {/* Size */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                Size: {size}%
              </div>
              <Slider min={10} max={35} value={size} onChange={setSize} />
            </div>

            {/* Opacity */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                Opacity: {Math.round(opacity * 100)}%
              </div>
              <Slider min={0.1} max={1} step={0.1} value={opacity} onChange={setOpacity} />
            </div>
          </>
        )}

        {/* Status */}
        <div style={{ 
          fontSize: 11, 
          padding: 4, 
          borderRadius: 4,
          background: status === 'loaded' ? '#f0fdf4' : '#fef3c7',
          color: status === 'loaded' ? '#166534' : '#92400e'
        }}>
          {status === 'loaded' && (enabled ? '✅ Badge active' : '⏸️ Badge ready')}
          {status === 'loading' && '⏳ Loading...'}
          {status === 'failed' && '❌ Failed to load'}
        </div>
      </Space>
    </Card>
  );
}
