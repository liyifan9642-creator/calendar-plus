import React, { useEffect } from 'react';
import { Row, Col, Space } from 'antd';
import { MonthCalendar, DaySchedulePanel, EventSearch, CalendarToolbar } from '@/components/calendar';
import { VoiceAssistant } from '@/components/voice';
import { EventForm, EventDetail, EventImportExport } from '@/components/event';
import { useCalendar } from '@/hooks';
import { useUIStore } from '@/stores';

// 全局页面动画
const pageStyles = `
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes float-orb {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(50px, -30px) scale(1.1); }
    50% { transform: translate(-20px, 20px) scale(0.95); }
    75% { transform: translate(30px, 40px) scale(1.05); }
  }

  .page-container {
    position: relative;
    overflow: hidden;
  }

  .page-container::before {
    content: '';
    position: absolute;
    top: -200px;
    right: -200px;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
    animation: float-orb 20s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }

  .page-container::after {
    content: '';
    position: absolute;
    bottom: -150px;
    left: -150px;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
    animation: float-orb 25s ease-in-out infinite reverse;
    pointer-events: none;
    z-index: 0;
  }

  .page-content {
    position: relative;
    z-index: 1;
  }

  .toolbar-wrapper {
    animation: fade-in-down 0.5s ease-out;
  }

  @keyframes fade-in-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .main-content {
    animation: fade-in-up 0.6s ease-out;
  }

  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* 自定义滚动条 */
  .page-container::-webkit-scrollbar {
    width: 8px;
  }

  .page-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .page-container::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
  }

  .page-container::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #4f46e5, #7c3aed);
    background-clip: content-box;
  }

  /* 网格点背景 */
  .dot-grid {
    background-image: radial-gradient(circle, rgba(99, 102, 241, 0.08) 1px, transparent 1px);
    background-size: 24px 24px;
  }
`;

const HomePage: React.FC = () => {
  const { refreshEvents } = useCalendar();
  const { showSearch, toggleSearch } = useUIStore();

  // Fetch events on mount
  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  return (
    <>
      <style>{pageStyles}</style>
      <div
        className="page-container"
        style={{
          padding: '28px',
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
          background: 'linear-gradient(135deg, #f5f7ff 0%, #eef2ff 25%, #faf5ff 50%, #f0f9ff 75%, #f5f7ff 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 15s ease infinite',
        }}
      >
        <div className="page-content">
          {/* Calendar Toolbar */}
          <div className="toolbar-wrapper">
            <CalendarToolbar />
          </div>

          {/* Search Panel (collapsible) */}
          <EventSearch visible={showSearch} onClose={toggleSearch} />

          {/* 主要内容区域：左侧日历，右侧语音助手 */}
          <div className="main-content">
            <Row gutter={[28, 28]} style={{ marginBottom: '28px' }}>
              {/* 左侧：日历区域 */}
              <Col xs={24} lg={14}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {/* Month Calendar */}
                  <MonthCalendar />

                  {/* Day Schedule Panel */}
                  <DaySchedulePanel />
                </Space>
              </Col>

              {/* 右侧：语音助手 */}
              <Col xs={24} lg={10}>
                <VoiceAssistant />
              </Col>
            </Row>
          </div>
        </div>

        {/* Modals */}
        <EventForm />
        <EventDetail />
        <EventImportExport />
      </div>
    </>
  );
};

export default HomePage;
