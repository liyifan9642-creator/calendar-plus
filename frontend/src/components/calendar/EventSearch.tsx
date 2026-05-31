import React, { useState, useCallback, useRef } from 'react';
import { Card, Input, List, Tag, Space, Typography, Empty, Spin, Button } from 'antd';
import {
  SearchOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  CloseOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { CalendarEvent } from '@/types';
import { calendarApi } from '@/services/calendarApi';
import { formatDateTime, getRelativeTime } from '@/utils';
import { useUIStore } from '@/stores';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface EventSearchProps {
  visible: boolean;
  onClose: () => void;
}

const EventSearch: React.FC<EventSearchProps> = ({ visible, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { openEventDetail } = useUIStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Highlight matching text
  const highlightText = (text: string, keyword: string) => {
    if (!keyword || !text) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span
          key={index}
          style={{
            backgroundColor: '#fffbe6',
            color: '#faad14',
            fontWeight: 600,
            padding: '0 2px',
            borderRadius: '2px',
          }}
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!value.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setSearched(true);
        try {
          const data = await calendarApi.searchEvents(value.trim());
          setResults(data);
        } catch (error) {
          console.error('Search failed:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    []
  );

  // Get event status
  const getEventStatus = (event: CalendarEvent) => {
    const now = dayjs();
    const start = dayjs(event.startTime);
    const end = dayjs(event.endTime);

    if (event.status === 'CANCELLED') return { text: '已取消', color: 'default' };
    if (event.status === 'COMPLETED') return { text: '已完成', color: 'success' };
    if (end.isBefore(now)) return { text: '已结束', color: 'default' };
    if (start.isBefore(now) && end.isAfter(now)) return { text: '进行中', color: 'processing' };
    return { text: '即将开始', color: 'blue' };
  };

  if (!visible) return null;

  return (
    <Card
      title={
        <Space>
          <SearchOutlined />
          <span>搜索事件</span>
        </Space>
      }
      extra={
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      }
      style={{
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Input
        placeholder="搜索事件标题、描述、地点..."
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        allowClear
        size="large"
        autoFocus
        style={{ marginBottom: '12px' }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin />
        </div>
      ) : searched && results.length === 0 ? (
        <Empty
          description={
            <Text type="secondary">
              未找到与 "{query}" 相关的事件
            </Text>
          }
          style={{ padding: '24px' }}
        />
      ) : results.length > 0 ? (
        <>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            找到 {results.length} 个相关事件
          </Text>
          <List
            dataSource={results}
            renderItem={(event) => {
              const status = getEventStatus(event);
              return (
                <List.Item
                  style={{
                    padding: '10px 12px',
                    marginBottom: '6px',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => openEventDetail(event)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fafafa';
                    e.currentTarget.style.borderColor = '#d9d9d9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text strong>{highlightText(event.title, query)}</Text>
                      <Tag color={status.color} style={{ margin: 0 }}>
                        {status.text}
                      </Tag>
                    </div>

                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          ({getRelativeTime(event.startTime)})
                        </Text>
                      </Space>

                      {event.location && (
                        <Space size={4}>
                          <EnvironmentOutlined style={{ color: '#999', fontSize: '12px' }} />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {highlightText(event.location, query)}
                          </Text>
                        </Space>
                      )}

                      {event.description && (
                        <Text
                          type="secondary"
                          style={{ fontSize: '12px' }}
                          ellipsis={{ tooltip: event.description }}
                        >
                          {highlightText(event.description, query)}
                        </Text>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <Space size={4}>
                          <UserOutlined style={{ color: '#999', fontSize: '12px' }} />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {event.attendees.join('、')}
                          </Text>
                        </Space>
                      )}
                    </Space>
                  </div>
                </List.Item>
              );
            }}
          />
        </>
      ) : null}
    </Card>
  );
};

export default EventSearch;
