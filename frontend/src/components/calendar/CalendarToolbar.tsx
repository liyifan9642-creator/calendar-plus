import React, { useState } from 'react';
import { Space, Button, Tooltip } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useCalendar } from '@/hooks';
import { useUIStore } from '@/stores';

const toolbarStyles = `
  .toolbar-container {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toolbar-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    transition: left 0.8s;
  }

  .toolbar-container:hover::before {
    left: 100%;
  }

  .toolbar-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative;
    overflow: hidden;
  }

  .toolbar-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.1);
    transform: translate(-50%, -50%);
    transition: width 0.4s, height 0.4s;
  }

  .toolbar-btn:hover::after {
    width: 200%;
    height: 200%;
  }

  .toolbar-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
  }

  .toolbar-btn:active {
    transform: translateY(0) scale(0.98);
  }

  .primary-btn {
    background: linear-gradient(135deg, #6366f1, #818cf8) !important;
    border: none !important;
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3) !important;
    position: relative;
    overflow: hidden;
  }

  .primary-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s;
  }

  .primary-btn:hover::before {
    left: 100%;
  }

  .primary-btn:hover {
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4) !important;
    transform: translateY(-2px);
  }

  .logo-icon {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toolbar-container:hover .logo-icon {
    transform: rotate(-5deg) scale(1.05);
  }
`;

const CalendarToolbar: React.FC = () => {
  const { goToToday } = useCalendar();
  const { showSearch, toggleSearch, openCreateForm } = useUIStore();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <style>{toolbarStyles}</style>
      <div
        className="toolbar-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          marginBottom: '12px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,255,0.95))',
          borderRadius: '12px',
          boxShadow: isHovered
            ? '0 16px 48px rgba(99, 102, 241, 0.1), 0 4px 16px rgba(0, 0, 0, 0.04)'
            : '0 8px 32px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(99, 102, 241, 0.08)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Left: Title area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            className="logo-icon"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)',
              backgroundSize: '200% 200%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            <CalendarOutlined style={{ fontSize: '14px', color: '#fff' }} />
          </div>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e1b4b', letterSpacing: '-0.3px' }}>
              日历
            </span>
            <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 400, marginTop: '1px' }}>
              管理您的日程安排
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <Space size="middle">
          <Tooltip title="搜索事件" placement="bottom">
            <Button
              className="toolbar-btn"
              icon={<SearchOutlined />}
              onClick={toggleSearch}
              type={showSearch ? 'primary' : 'default'}
              style={{
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                ...(showSearch
                  ? {
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1.5px solid rgba(99, 102, 241, 0.1)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    }),
              }}
            />
          </Tooltip>
          <Button
            className="toolbar-btn"
            onClick={goToToday}
            style={{
              borderRadius: '8px',
              height: '32px',
              padding: '0 14px',
              fontWeight: 600,
              fontSize: '13px',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1.5px solid rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}
          >
            今天
          </Button>
          <Button
            className="primary-btn toolbar-btn"
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateForm}
            style={{
              borderRadius: '8px',
              height: '32px',
              padding: '0 16px',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            新建事件
          </Button>
        </Space>
      </div>
    </>
  );
};

export default CalendarToolbar;
