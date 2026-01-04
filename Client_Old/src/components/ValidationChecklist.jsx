import React, { useState, useEffect } from 'react';
import { Card, Typography, Tag, Collapse, Space, Button, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

/**
 * ValidationChecklist Component
 * Displays compliance check results in a user-friendly format
 */
export default function ValidationChecklist({ validationData, onRequestChanges, loading = false }) {
  console.log('🎨 [VALIDATION CHECKLIST] Component rendering/updating');
  console.log('📋 Props received:', {
    hasValidationData: !!validationData,
    hasCallback: !!onRequestChanges,
    loading,
    validationData
  });

  useEffect(() => {
    console.log('🔄 [VALIDATION CHECKLIST] Component mounted/updated');
    console.log('📊 Current validation state:', validationData);
    
    return () => {
      console.log('🗑️ [VALIDATION CHECKLIST] Component will unmount');
    };
  }, [validationData]);

  if (!validationData) {
    console.log('⚠️ [VALIDATION CHECKLIST] No validation data, returning null');
    return null;
  }

  const { compliant, warnings = [], rules_enforced = [], issues = [], suggestions = [] } = validationData;
  
  console.log('📈 [VALIDATION CHECKLIST] Parsed data:', {
    compliant,
    warningsCount: warnings.length,
    rulesEnforcedCount: rules_enforced.length,
    issuesCount: issues.length,
    suggestionsCount: suggestions.length
  });

  const handleAutoFixClick = () => {
    console.log('🔧 [VALIDATION CHECKLIST] Auto-fix button clicked');
    console.log('📋 Issues to fix:', issues);
    if (onRequestChanges) {
      onRequestChanges();
    }
  };

  return (
    <Card
      style={{
        marginTop: 16,
        borderRadius: 8,
        border: compliant ? '2px solid #52c41a' : '2px solid #ff4d4f',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Header - Overall Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {compliant ? (
              <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
            )}
            <Title level={5} style={{ margin: 0 }}>
              {compliant ? 'Compliance Passed ✓' : 'Compliance Issues Found'}
            </Title>
          </div>
          {!compliant && onRequestChanges && (
            <Button 
              type="primary" 
              size="small"
              onClick={handleAutoFixClick}
              loading={loading}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Auto-Fix Compliance
            </Button>
          )}
        </div>

        {/* Hard Fail Issues Section */}
        {issues.length > 0 && (
          <Alert
            message="Blocking Issues (Must Fix)"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                {issues.map((issue, idx) => {
                  console.log(`  ↳ Issue ${idx + 1}:`, issue);
                  return (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <CloseCircleOutlined style={{ color: '#ff4d4f', marginTop: 4 }} />
                        <Text strong style={{ color: '#ff4d4f' }}>{issue}</Text>
                      </div>
                      {suggestions[idx] && (
                        <div style={{ marginLeft: 22, marginTop: 4 }}>
                          <Text type="secondary">💡 Fix: {suggestions[idx]}</Text>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Space>
            }
            type="error"
            showIcon={false}
            style={{ borderRadius: 6 }}
          />
        )}

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <Alert
            message="Warnings"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                {warnings.map((warning, idx) => {
                  console.log(`  ↳ Warning ${idx + 1}:`, warning);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <WarningOutlined style={{ color: '#faad14', marginTop: 4 }} />
                      <Text>{warning}</Text>
                    </div>
                  );
                })}
              </Space>
            }
            type="warning"
            showIcon={false}
            style={{ borderRadius: 6 }}
          />
        )}

        {/* Rules Enforced Section */}
        {rules_enforced.length > 0 && (
          <Collapse
            ghost
            defaultActiveKey={compliant ? [] : ['rules']}
            items={[
              {
                key: 'rules',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    <Text strong>Rules Enforced ({rules_enforced.length})</Text>
                  </div>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {rules_enforced.map((rule, idx) => (
                      <Tag
                        key={idx}
                        icon={<CheckCircleOutlined />}
                        color="success"
                        style={{ margin: '2px 0', padding: '4px 8px' }}
                      >
                        {rule}
                      </Tag>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        )}

        {/* Success Message */}
        {compliant && warnings.length === 0 && (
          <Alert
            message="All compliance checks passed! Your design meets Tesco advertising standards."
            type="success"
            showIcon
            style={{ borderRadius: 6 }}
          />
        )}
      </Space>
    </Card>
  );
}
