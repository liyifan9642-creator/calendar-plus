import React from 'react';
import { Card, Button, Space, Typography } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useVoice, useCalendar } from '@/hooks';
import dayjs from 'dayjs';

const { Text } = Typography;

const QuickActions: React.FC = () => {
  const { processText, loading } = useVoice();
  const { goToToday } = useCalendar();

  const handleQuickAction = async (text: string) => {
    try {
      await processText(text);
    } catch (error) {
      console.error('Quick action failed:', error);
    }
  };

  const actions = [
    {
      icon: <CalendarOutlined />,
      label: '今日日程',
      text: '今天有什么安排',
      color: '#1677ff',
    },
    {
      icon: <ClockCircleOutlined />,
      label: '明日日程',
      text: '明天有什么安排',
      color: '#52c41a',
    },
    {
      icon: <UnorderedListOutlined />,
      label: '本周日程',
      text: '这周的日程',
      color: '#722ed1',
    },
    {
      icon: <SearchOutlined />,
      label: '搜索事件',
      text: '搜索关于项目的会议',
      color: '#fa8c16',
    },
  ];

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>快捷操作</span>
        </Space>
      }
      size="small"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
        }}
      >
        {actions.map((action, index) => (
          <Button
            key={index}
            icon={action.icon}
            onClick={() => handleQuickAction(action.text)}
            loading={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'auto',
              padding: '12px 8px',
              borderColor: action.color,
              color: action.color,
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default QuickActions;
