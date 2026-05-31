import React from 'react';
import { Tag, Tooltip, Space } from 'antd';
import {
  AudioOutlined,
  LoadingOutlined,
  CloudOutlined,
  LaptopOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { AsrMethod, AsrStatus } from '@/services/asrService';

interface AsrStatusIndicatorProps {
  /** ASR 状态 */
  status: AsrStatus;
  /** 当前使用的识别方式 */
  method: AsrMethod | null;
  /** 是否显示详细信息 */
  showDetail?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/** 状态配置映射 */
const statusConfig: Record<AsrStatus, { color: string; label: string; icon: React.ReactNode }> = {
  idle: {
    color: 'default',
    label: '待命',
    icon: <AudioOutlined />,
  },
  listening: {
    color: 'processing',
    label: '录音中',
    icon: <AudioOutlined style={{ color: '#ff4d4f' }} />,
  },
  recognizing: {
    color: 'warning',
    label: '识别中',
    icon: <LoadingOutlined />,
  },
  error: {
    color: 'error',
    label: '识别失败',
    icon: <ExclamationCircleFilled />,
  },
};

/** 识别方式配置映射 */
const methodConfig: Record<AsrMethod, { label: string; icon: React.ReactNode; color: string }> = {
  'web-speech': {
    label: '浏览器识别',
    icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
    color: 'success',
  },
  'online-asr': {
    label: '联网识别',
    icon: <CloudOutlined style={{ color: '#1677ff' }} />,
    color: 'processing',
  },
  'sherpa-local': {
    label: '本地识别',
    icon: <LaptopOutlined style={{ color: '#722ed1' }} />,
    color: 'purple',
  },
};

/**
 * ASR 状态指示组件
 *
 * 显示当前语音识别状态和使用的识别方式
 */
const AsrStatusIndicator: React.FC<AsrStatusIndicatorProps> = ({
  status,
  method,
  showDetail = true,
  style,
}) => {
  const statusInfo = statusConfig[status];
  const methodInfo = method ? methodConfig[method] : null;

  // 状态动画样式
  const getStatusAnimation = () => {
    if (status === 'listening') {
      return {
        animation: 'pulse 1.5s ease-in-out infinite',
      };
    }
    if (status === 'recognizing') {
      return {
        animation: 'spin 1s linear infinite',
      };
    }
    return {};
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
      {/* 状态标签 */}
      <Tooltip title={`识别状态: ${statusInfo.label}`}>
        <Tag
          icon={statusInfo.icon}
          color={statusInfo.color}
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            ...getStatusAnimation(),
          }}
        >
          {statusInfo.label}
        </Tag>
      </Tooltip>

      {/* 识别方式标签 (仅在识别中或识别完成时显示) */}
      {showDetail && methodInfo && (status === 'listening' || status === 'recognizing') && (
        <Tooltip title={`使用: ${methodInfo.label}`}>
          <Tag
            icon={methodInfo.icon}
            color={methodInfo.color}
            style={{ margin: '0 0 0 8px' }}
          >
            {methodInfo.label}
          </Tag>
        </Tooltip>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/**
 * 简化版状态指示器 - 仅显示图标
 */
export const AsrStatusIcon: React.FC<{
  status: AsrStatus;
  method?: AsrMethod | null;
  size?: number;
}> = ({ status, method, size = 16 }) => {
  const statusInfo = statusConfig[status];

  const getIconStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = { fontSize: size };

    if (status === 'listening') {
      return {
        ...baseStyle,
        color: '#ff4d4f',
        animation: 'pulse 1.5s ease-in-out infinite',
      };
    }

    if (status === 'recognizing') {
      return {
        ...baseStyle,
        color: '#faad14',
      };
    }

    if (status === 'error') {
      return {
        ...baseStyle,
        color: '#ff4d4f',
      };
    }

    return {
      ...baseStyle,
      color: '#1677ff',
    };
  };

  return (
    <>
      {status === 'recognizing' ? (
        <LoadingOutlined style={getIconStyle()} />
      ) : (
        <AudioOutlined style={getIconStyle()} />
      )}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
};

/**
 * 识别方式选择器 - 显示当前可用的识别方式
 */
export const AsrMethodSelector: React.FC<{
  currentMethod: AsrMethod | null;
  availableMethods: AsrMethod[];
  onMethodChange?: (method: AsrMethod) => void;
}> = ({ currentMethod, availableMethods, onMethodChange }) => {
  return (
    <Space size={4}>
      {availableMethods.map((method) => {
        const info = methodConfig[method];
        const isActive = currentMethod === method;

        return (
          <Tooltip key={method} title={info.label}>
            <Tag
              icon={info.icon}
              color={isActive ? info.color : 'default'}
              style={{
                cursor: onMethodChange ? 'pointer' : 'default',
                opacity: isActive ? 1 : 0.6,
              }}
              onClick={() => onMethodChange?.(method)}
            >
              {info.label}
            </Tag>
          </Tooltip>
        );
      })}
    </Space>
  );
};

export default AsrStatusIndicator;
