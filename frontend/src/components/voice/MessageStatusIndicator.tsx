import React from 'react';
import { Message } from '@/types';

interface MessageStatusIndicatorProps {
  status: Message['status'];
}

/**
 * 消息状态指示器组件
 * 根据 Message.status 显示不同的图标和颜色
 */
const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING':
        return { icon: '⏳', color: '#f59e0b', bg: '#fef3c7', label: '等待确认' };
      case 'CONFIRMED':
        return { icon: '✓', color: '#22c55e', bg: '#dcfce7', label: '已确认' };
      case 'EXECUTED':
        return { icon: '✓', color: '#22c55e', bg: '#dcfce7', label: '已执行' };
      case 'FAILED':
        return { icon: '✕', color: '#ef4444', bg: '#fee2e2', label: '执行失败' };
      case 'NEED_CLARIFICATION':
        return { icon: '?', color: '#6366f1', bg: '#eef2ff', label: '需要澄清' };
      default:
        return { icon: '', color: '#9ca3af', bg: '#f3f4f6', label: '' };
    }
  };

  const config = getStatusConfig();

  if (!config.label) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: config.color,
        background: config.bg,
        padding: '2px 10px',
        borderRadius: '20px',
        fontWeight: 500,
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: 600 }}>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

export default MessageStatusIndicator;
