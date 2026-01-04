/**
 * TescoLogo - Smart Logo Insertion Component
 * 
 * Features:
 * - Single logo mode (no duplicates)
 * - Live position/size/opacity updates
 * - Toggle on/off
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Select, Slider, Space, message, Switch } from 'antd';
import useImage from 'use-image';
import { useEditorStore } from '../store/useEditorStore';

// Import logos
import tescoLogoSrc from '../assets/tesco-logo.png';
import drinkawareLogoSrc from '../assets/drinkaware-logo.png';

// Logo configuration
const LOGO_CONFIG = {
  tesco: {
    src: tescoLogoSrc,
    label: '🏪 Tesco Logo',
    aspectRatio: 3.5,
  },
  drinkaware: {
    src: drinkawareLogoSrc,
    label: '🍺 Drinkaware',
    aspectRatio: 3.5,
  },
};

const POSITIONS = {
  'bottom-right': 'Bottom Right',
  'bottom-left': 'Bottom Left',
  'top-right': 'Top Right',
  'top-left': 'Top Left',
};

export default function TescoLogo({ setPagesWithHistory }) {
  // State
  const [enabled, setEnabled] = useState(false);
  const [logoType, setLogoType] = useState('tesco');
  const [position, setPosition] = useState('bottom-right');
  const [size, setSize] = useState(12);
  const [opacity, setOpacity] = useState(1.0);

  // Store
  const activeIndex = useEditorStore((state) => state.activeIndex);
  const canvasSize = useEditorStore((state) => state.canvasSize);
  const editorPages = useEditorStore((state) => state.editorPages);

  // Load logo image
  const currentLogoConfig = LOGO_CONFIG[logoType];
  const [image, status] = useImage(currentLogoConfig.src, 'anonymous');

  // Memoized image bounds - efficiently tracks main image changes
  const imageBounds = useMemo(() => {
    const page = editorPages[activeIndex];
    if (page && page.children) {
      const mainImage = page.children.find(child => 
        child.type === 'image' && !child.id.startsWith('logo-')
      );
      if (mainImage) {
        return {
          x: mainImage.x || 0,
          y: mainImage.y || 0,
          width: mainImage.width || canvasSize.w,
          height: mainImage.height || canvasSize.h,
          // Add a key for change detection
          _key: `${mainImage.x}-${mainImage.y}-${mainImage.width}-${mainImage.height}`
        };
      }
    }
    return { x: 0, y: 0, width: canvasSize.w, height: canvasSize.h, _key: 'default' };
  }, [editorPages, activeIndex, canvasSize]);

  // Legacy wrapper for backward compatibility
  const getImageBounds = useCallback(() => imageBounds, [imageBounds]);

  // Calculate logo position
  const calculateLogoPosition = useCallback((bounds, logoWidth, logoHeight, pos) => {
    const padding = Math.max(10, bounds.width * 0.02);
    let x, y;

    switch (pos) {
      case 'top-left':
        x = bounds.x + padding;
        y = bounds.y + padding;
        break;
      case 'top-right':
        x = bounds.x + bounds.width - logoWidth - padding;
        y = bounds.y + padding;
        break;
      case 'bottom-left':
        x = bounds.x + padding;
        y = bounds.y + bounds.height - logoHeight - padding;
        break;
      case 'bottom-right':
      default:
        x = bounds.x + bounds.width - logoWidth - padding;
        y = bounds.y + bounds.height - logoHeight - padding;
        break;
    }

    return { x, y };
  }, []);

  // Create or update logo
  const updateLogo = useCallback(() => {
    if (!enabled) {
      // Remove logo if disabled
      setPagesWithHistory((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        if (copy[activeIndex] && copy[activeIndex].children) {
          copy[activeIndex].children = copy[activeIndex].children.filter(
            child => !child.id.startsWith('logo-')
          );
        }
        return copy;
      });
      return;
    }

    if (status !== 'loaded') return;

    const bounds = getImageBounds();
    const logoWidth = Math.round((bounds.width * size) / 100);
    const logoHeight = Math.round(logoWidth / currentLogoConfig.aspectRatio);
    const { x, y } = calculateLogoPosition(bounds, logoWidth, logoHeight, position);

    setPagesWithHistory((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      
      if (!copy[activeIndex]) {
        copy[activeIndex] = { id: activeIndex + 1, children: [], background: '#ffffff' };
      }
      if (!copy[activeIndex].children) {
        copy[activeIndex].children = [];
      }

      // Find existing logo
      const logoIndex = copy[activeIndex].children.findIndex(
        child => child.id.startsWith('logo-')
      );

      const logoElement = {
        id: logoIndex >= 0 ? copy[activeIndex].children[logoIndex].id : `logo-${Date.now()}`,
        type: 'image',
        src: currentLogoConfig.src,
        x,
        y,
        width: logoWidth,
        height: logoHeight,
        rotation: 0,
        opacity: opacity,
      };

      if (logoIndex >= 0) {
        // Update existing logo
        copy[activeIndex].children[logoIndex] = logoElement;
      } else {
        // Add new logo
        copy[activeIndex].children.push(logoElement);
      }

      return copy;
    });
  }, [enabled, status, size, position, opacity, logoType, activeIndex, currentLogoConfig, getImageBounds, calculateLogoPosition, setPagesWithHistory]);

  // Update logo when settings change OR when main image bounds change
  useEffect(() => {
    if (enabled && status === 'loaded') {
      console.log('🏪 [LOGO] Repositioning logo for new bounds:', imageBounds._key);
      updateLogo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, position, size, opacity, logoType, status, imageBounds._key]);

  // Handle toggle
  const handleToggle = (checked) => {
    setEnabled(checked);
    if (checked && status === 'loaded') {
      message.success('🏪 Logo enabled!');
    } else if (!checked) {
      message.info('Logo removed');
    }
  };

  // Quick insert
  const handleQuickInsert = () => {
    setLogoType('tesco');
    setPosition('bottom-right');
    setSize(12);
    setOpacity(1.0);
    setEnabled(true);
  };

  return (
    <Card size="small" title="🏪 Tesco Logo" style={{ marginBottom: 12 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        
        {/* Toggle Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Insert Logo</span>
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
          ⚡ Quick Insert (Bottom-Right)
        </Button>

        {/* Controls (only show when enabled) */}
        {enabled && (
          <>
            {/* Logo Type */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Logo Type</div>
              <Select
                value={logoType}
                onChange={setLogoType}
                style={{ width: '100%' }}
                options={Object.entries(LOGO_CONFIG).map(([key, config]) => ({
                  value: key,
                  label: config.label,
                }))}
              />
            </div>

            {/* Position */}
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

            {/* Size */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                Size: {size}%
              </div>
              <Slider min={5} max={40} value={size} onChange={setSize} />
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
          {status === 'loaded' && (enabled ? '✅ Logo active' : '⏸️ Logo ready')}
          {status === 'loading' && '⏳ Loading...'}
          {status === 'failed' && '❌ Failed to load'}
        </div>
      </Space>
    </Card>
  );
}
