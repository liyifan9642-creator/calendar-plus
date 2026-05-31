import React from 'react';
import { Layout } from 'antd';
import AppHeader from './AppHeader';
import { useUIStore } from '@/stores';

const { Content } = Layout;

const layoutStyles = `
  @keyframes background-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .app-layout {
    min-height: 100vh;
    background: transparent;
  }

  .app-content {
    position: relative;
    overflow: hidden;
  }

  .app-content::before {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background:
      radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.02) 0%, transparent 50%);
    animation: background-shift 30s ease infinite;
    background-size: 200% 200%;
    pointer-events: none;
    z-index: 0;
  }

  .app-content > * {
    position: relative;
    z-index: 1;
  }

  /* 全局滚动条美化 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.4));
    background-clip: content-box;
  }

  /* 选中文本颜色 */
  ::selection {
    background: rgba(99, 102, 241, 0.2);
    color: #1e1b4b;
  }

  /* 焦点outline美化 */
  *:focus {
    outline: none;
  }

  *:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { toggleSidebar } = useUIStore();

  return (
    <>
      <style>{layoutStyles}</style>
      <Layout className="app-layout">
        <AppHeader onToggleSidebar={toggleSidebar} />
        <Content
          className="app-content"
          style={{
            padding: 0,
            background: 'linear-gradient(135deg, #f5f7ff 0%, #eef2ff 25%, #faf5ff 50%, #f0f9ff 75%, #f5f7ff 100%)',
            backgroundSize: '400% 400%',
            animation: 'background-shift 15s ease infinite',
          }}
        >
          {children}
        </Content>
      </Layout>
    </>
  );
};

export default AppLayout;
