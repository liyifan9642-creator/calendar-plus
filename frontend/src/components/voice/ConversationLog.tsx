import React, { useRef, useEffect, useCallback } from 'react';
import { Typography, Spin } from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import { ConversationItem } from '@/types';
import MessageBubble from './MessageBubble';

const { Text } = Typography;

interface ConversationLogProps {
  conversationHistory: ConversationItem[];
  loading?: boolean;
  onSelectOption?: (optionId: string) => void;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * 对话历史组件
 * - 显示对话历史列表
 * - 支持滚动加载
 * - 每条记录显示时间、用户输入、系统响应
 */
const ConversationLog: React.FC<ConversationLogProps> = ({
  conversationHistory,
  loading = false,
  onSelectOption,
  onConfirm,
  onCancel,
  onLoadMore,
  hasMore = false,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Handle scroll for loading more
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || loading) return;

    const { scrollTop } = containerRef.current;
    if (scrollTop === 0) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: 'linear-gradient(180deg, #fafbff 0%, #f5f7ff 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.06)',
      }}
    >
      {/* Loading indicator at top */}
      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px',
          }}
        >
          <Spin size="small" />
        </div>
      )}

      {conversationHistory.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AudioOutlined style={{ fontSize: '28px', color: '#818cf8' }} />
          </div>
          <Text style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 500 }}>
            点击麦克风开始语音对话
          </Text>
        </div>
      ) : (
        <>
          {/* Display messages in reverse order (newest first at bottom) */}
          {[...conversationHistory].reverse().map((item, index) => (
            <MessageBubble
              key={item.id || index}
              item={item}
              onSelectOption={onSelectOption}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          ))}
          <div ref={chatEndRef} />
        </>
      )}
    </div>
  );
};

export default ConversationLog;
