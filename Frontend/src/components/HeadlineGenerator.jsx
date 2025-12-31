/**
 * HeadlineGenerator Component
 * AI-powered headline and subheading generation using Gemini Vision
 */

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
  designId = 'default'
}) => {
  // State
  const [keywords, setKeywords] = useState([]);
  const [inputKeyword, setInputKeyword] = useState('');
  const [campaignType, setCampaignType] = useState(null);
  const [headlines, setHeadlines] = useState([]);
  const [subheadings, setSubheadings] = useState([]);
  
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
      message.warning('No image on canvas to analyze');
      return;
    }
    
    console.log('✨ [HEADLINE GENERATOR] Suggesting keywords...');
    setLoadingKeywords(true);
    
    try {
      const result = await suggestKeywords(canvasImageBase64);
      
      if (result.success && result.keywords?.length > 0) {
        setKeywords(result.keywords);
        message.success(`Found ${result.keywords.length} keywords`);
      } else {
        message.error(result.error || 'Failed to suggest keywords');
      }
    } catch (error) {
      console.error('❌ [HEADLINE GENERATOR] Keyword suggestion error:', error);
      message.error('Failed to suggest keywords');
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
      message.warning('No image on canvas to analyze');
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
        message.success(`Generated ${result.headlines.length} headlines`);
      } else {
        console.log('❌ [HEADLINE GENERATOR] FAILED - No headlines in result');
        console.log('❌ [HEADLINE GENERATOR] Error:', result.error);
        message.error(result.error || 'Failed to generate headlines');
      }
    } catch (error) {
      console.error('❌ [HEADLINE GENERATOR] EXCEPTION:', error);
      message.error('Failed to generate headlines');
    } finally {
      console.log('📝 [HEADLINE GENERATOR] Setting loadingHeadlines=false');
      setLoadingHeadlines(false);
      console.log('=' .repeat(60));
    }
  }, [canvasImageBase64, designId, campaignType, keywords]);
  
  // Generate subheadings
  const handleGenerateSubheadings = useCallback(async () => {
    if (!canvasImageBase64) {
      message.warning('No image on canvas to analyze');
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
        message.success(`Generated ${result.subheadings.length} subheadings`);
      } else {
        message.error(result.error || 'Failed to generate subheadings');
      }
    } catch (error) {
      console.error('❌ [HEADLINE GENERATOR] Subheading generation error:', error);
      message.error('Failed to generate subheadings');
    } finally {
      setLoadingSubheadings(false);
    }
  }, [canvasImageBase64, designId, campaignType, keywords]);
  
  // Add headline to canvas with placement
  const handleAddToCanvas = useCallback(async (text, isSubheading = false) => {
    console.log('➕ [HEADLINE GENERATOR] Adding to canvas:', { text, isSubheading });
    
    // Get optimal placement
    const placement = await calculatePlacement({
      canvasWidth: canvasSize?.w || 800,
      canvasHeight: canvasSize?.h || 600,
      backgroundColor: '#1a1a1a'
    });
    
    const position = isSubheading ? placement.subheading : placement.headline;
    
    if (isSubheading) {
      onAddSubheading?.(text, position);
    } else {
      onAddHeadline?.(text, position);
    }
    
    message.success(`Added "${text.substring(0, 20)}..." to canvas`);
  }, [canvasSize, onAddHeadline, onAddSubheading]);
  
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
                bodyStyle={{ padding: 8 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.text}</div>
                    <div style={{ marginTop: 2 }}>{renderConfidence(h.confidence)}</div>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddToCanvas(h.text, false)}
                  >
                    Add
                  </Button>
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
                bodyStyle={{ padding: 8 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>{s.text}</div>
                    <div style={{ marginTop: 2 }}>{renderConfidence(s.confidence)}</div>
                  </div>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddToCanvas(s.text, true)}
                  >
                    Add
                  </Button>
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
