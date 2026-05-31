import React, { useState, useCallback } from 'react';
import { ClarificationOption } from '@/types';

interface ClarificationOptionsProps {
  options: ClarificationOption[];
  question: string;
  onSelect: (optionId: string) => void;
  onCustomInput?: (text: string) => void;
}

/**
 * 澄清选项组件
 * 当 Message.status = 'NEED_CLARIFICATION' 时显示
 * - 显示澄清问题
 * - 显示选项按钮
 * - 允许用户自定义输入
 */
const ClarificationOptions: React.FC<ClarificationOptionsProps> = ({
  options,
  question,
  onSelect,
  onCustomInput,
}) => {
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const handleCustomSubmit = useCallback(() => {
    if (customText.trim() && onCustomInput) {
      onCustomInput(customText.trim());
      setCustomText('');
      setShowCustomInput(false);
    }
  }, [customText, onCustomInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCustomSubmit();
      }
    },
    [handleCustomSubmit]
  );

  return (
    <div style={{ marginTop: '12px' }}>
      {/* 澄清问题 */}
      {question && (
        <div
          style={{
            marginBottom: '10px',
            fontSize: '13px',
            color: '#4b5563',
            fontWeight: 500,
          }}
        >
          {question}
        </div>
      )}

      {/* 选项按钮 */}
      {options.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              onMouseEnter={() => setHoveredOption(option.id)}
              onMouseLeave={() => setHoveredOption(null)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '12px',
                background: hoveredOption === option.id
                  ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                  : '#ffffff',
                color: hoveredOption === option.id ? '#fff' : '#6366f1',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: hoveredOption === option.id
                  ? '0 4px 16px rgba(99, 102, 241, 0.3)'
                  : '0 2px 8px rgba(0, 0, 0, 0.06)',
                transform: hoveredOption === option.id ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* 自定义输入区域 */}
      {onCustomInput && (
        <div>
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              style={{
                padding: '6px 12px',
                border: '1px dashed #d1d5db',
                borderRadius: '10px',
                background: 'transparent',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.color = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              输入其他内容...
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '8px',
                animation: 'fade-in-up 0.2s ease-out',
              }}
            >
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入补充说明..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  background: '#fafafa',
                }}
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customText.trim()}
                style={{
                  padding: '8px 16px',
                  background: customText.trim()
                    ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                    : '#e5e7eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: customText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  boxShadow: customText.trim()
                    ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                    : 'none',
                }}
              >
                发送
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClarificationOptions;
