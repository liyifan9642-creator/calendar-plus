import React, { useState } from 'react';
import { Layout, Typography, Space, Button, Tooltip } from 'antd';
import {
  CalendarOutlined,
  AudioOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const headerStyles = `
  .header-container {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .header-container::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);
  }

  .header-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative;
    overflow: hidden;
  }

  .header-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.08);
    transform: translate(-50%, -50%);
    transition: width 0.4s, height 0.4s;
  }

  .header-btn:hover::before {
    width: 200%;
    height: 200%;
  }

  .header-btn:hover {
    transform: translateY(-1px);
    color: #6366f1 !important;
    background: rgba(99, 102, 241, 0.04) !important;
  }

  .header-btn:active {
    transform: translateY(0) scale(0.95);
  }

  .logo-container {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .logo-container:hover {
    transform: scale(1.02);
  }

  .logo-icon {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .logo-container:hover .logo-icon {
    transform: rotate(-5deg) scale(1.05);
    box-shadow: 0 12px 28px rgba(99, 102, 241, 0.4);
  }

  .logo-text {
    background: linear-gradient(135deg, #1e1b4b, #4338ca, #6366f1);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-flow 4s ease infinite;
  }

  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes subtle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  .header-title {
    animation: subtle-float 4s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .logo-icon::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transform: translateX(-100%);
    border-radius: inherit;
  }

  .logo-container:hover .logo-icon::after {
    animation: shimmer 0.6s ease;
  }
`;

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onToggleSidebar }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <style>{headerStyles}</style>
      <Header
        className="header-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,255,0.95))',
          borderBottom: '1px solid rgba(99, 102, 241, 0.06)',
          boxShadow: isHovered
            ? '0 8px 32px rgba(99, 102, 241, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
            : '0 4px 16px rgba(0, 0, 0, 0.02)',
          zIndex: 10,
          height: '52px',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s ease',
        }}
      >
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div
            className="logo-icon"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)',
              backgroundSize: '200% 200%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CalendarOutlined style={{ fontSize: '16px', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              className="logo-text"
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              VoiceCal
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#9ca3af',
                fontWeight: 500,
              }}
            >
              语音日历
            </span>
          </div>
        </div>

        <Space size="small">
          <Tooltip title="语音助手" placement="bottom">
            <Button
              className="header-btn"
              type="text"
              icon={<AudioOutlined />}
              onClick={onToggleSidebar}
              style={{
                color: '#6b7280',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
              }}
            />
          </Tooltip>
          <Tooltip title="设置" placement="bottom">
            <Button
              className="header-btn"
              type="text"
              icon={<SettingOutlined />}
              style={{
                color: '#6b7280',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
              }}
            />
          </Tooltip>
          <Tooltip title="帮助" placement="bottom">
            <Button
              className="header-btn"
              type="text"
              icon={<QuestionCircleOutlined />}
              style={{
                color: '#6b7280',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
              }}
            />
          </Tooltip>
        </Space>
      </Header>
    </>
  );
};

export default AppHeader;
