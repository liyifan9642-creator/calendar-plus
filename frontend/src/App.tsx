import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AppLayout } from '@/components/layout';
import HomePage from '@/pages/HomePage';
import './styles/animations.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          colorBgContainer: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
          boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.04)',
        },
        components: {
          Button: {
            borderRadius: 12,
            controlHeight: 40,
            fontWeight: 500,
          },
          Card: {
            borderRadiusLG: 24,
            paddingLG: 24,
          },
          Input: {
            borderRadius: 14,
            controlHeight: 44,
          },
          Tag: {
            borderRadiusSM: 20,
          },
          Tooltip: {
            borderRadius: 10,
          },
        },
      }}
    >
      <AppLayout>
        <HomePage />
      </AppLayout>
    </ConfigProvider>
  );
};

export default App;
