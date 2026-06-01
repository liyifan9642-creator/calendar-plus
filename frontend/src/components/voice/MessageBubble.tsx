import React from 'react';
import { ConversationItem } from '@/types';
import ClarificationOptions from './ClarificationOptions';
import MessageStatusIndicator from './MessageStatusIndicator';

interface MessageBubbleProps {
  item: ConversationItem;
  onSelectOption?: (optionId: string) => void;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
  onCustomInput?: (text: string) => void;
}

/**
 * 消息气泡组件
 * - 用户消息：右侧，渐变紫色背景，白色文字
 * - 系统消息：左侧，白色背景，带微妙阴影
 * - 澄清消息：带选项按钮
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({
  item,
  onSelectOption,
  onConfirm,
  onCancel,
  onCustomInput,
}) => {
  const message = item.message;
  const isClarification = message?.status === 'NEED_CLARIFICATION';
  const isPending = message?.status === 'PENDING';

  // Format time
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ marginBottom: '16px', animation: 'fade-in-up 0.3s ease-out' }}>
      {/* User message - right side, gradient purple background */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
        <div
          style={{
            maxWidth: '80%',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            color: '#fff',
            borderRadius: '18px 18px 4px 18px',
            fontSize: '14px',
            wordBreak: 'break-word',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            lineHeight: 1.6,
          }}
        >
          <div>{item.userInput}</div>
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.7)',
              marginTop: '6px',
              textAlign: 'right',
            }}
          >
            {formatTime(item.timestamp)}
          </div>
        </div>
      </div>

      {/* System response - left side, white background with shadow */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div
          style={{
            maxWidth: '80%',
            padding: '12px 16px',
            background: isClarification
              ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)'
              : '#ffffff',
            borderRadius: '18px 18px 18px 4px',
            fontSize: '14px',
            wordBreak: 'break-word',
            border: isClarification ? '1px solid rgba(14, 165, 233, 0.2)' : '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            lineHeight: 1.6,
          }}
        >
          {/* System response text */}
          <div style={{ color: '#1e1b4b' }}>{item.systemResponse}</div>

          {/* Message status indicator */}
          {message && (
            <div style={{ marginTop: '6px' }}>
              <MessageStatusIndicator status={message.status} />
            </div>
          )}

          {/* Clarification options */}
          {isClarification && message?.clarificationQuestion && (
            <ClarificationOptions
              options={message.conflicts?.map((conflict) => ({
                id: conflict.id,
                label: `${conflict.title} (${new Date(conflict.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}-${new Date(conflict.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })})`,
                value: conflict.id,
              })) || []}
              question={message.clarificationQuestion}
              onSelect={(optionId) => onSelectOption?.(optionId)}
              onCustomInput={onCustomInput}
            />
          )}

          {/* Confirm/Cancel buttons for PENDING status */}
          {isPending && message && (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <button
                onClick={() => onConfirm?.(message.id)}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                }}
              >
                确认
              </button>
              <button
                onClick={() => onCancel?.(message.id)}
                style={{
                  padding: '8px 20px',
                  background: '#ffffff',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                取消
              </button>
            </div>
          )}

          {/* Time */}
          <div
            style={{
              fontSize: '11px',
              color: '#9ca3af',
              marginTop: '6px',
            }}
          >
            {formatTime(item.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
