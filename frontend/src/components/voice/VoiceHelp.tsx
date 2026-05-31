import React, { useState } from 'react';
import { Card, Typography, Space, Tag, Collapse, List, Input, Button } from 'antd';
import {
  QuestionCircleOutlined,
  AudioOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { VoiceCommand, Intent } from '@/types';
import { useVoice } from '@/hooks';

const { Text, Paragraph } = Typography;

// [旧代码保留] 旧的 voiceCommands 数据
// const voiceCommands: VoiceCommand[] = [
//   { command: '创建事件', description: '创建新的日历事件', examples: ['帮我创建明天下午三点的会议', '添加一个下周一上午十点的面试', '新建周五晚上七点的聚餐'], intent: 'CREATE_EVENT' },
//   { command: '更新事件', description: '修改已有的日历事件', examples: ['把明天的会议改到后天', '修改下午的面试时间为四点', '更新周五聚餐的地点'], intent: 'UPDATE_EVENT' },
//   { command: '删除事件', description: '删除指定的日历事件', examples: ['取消明天的会议', '删除下午的面试', '去掉周五的聚餐安排'], intent: 'DELETE_EVENT' },
//   { command: '查询事件', description: '查看某段时间的日程安排', examples: ['我明天有什么安排', '这周有什么会议', '查看今天的日程'], intent: 'QUERY_EVENTS' },
//   { command: '搜索事件', description: '搜索包含特定关键词的事件', examples: ['搜索关于项目的会议', '找一下面试相关的安排', '有没有和客户相关的日程'], intent: 'SEARCH_EVENTS' },
//   { command: '设置提醒', description: '为事件设置提醒通知', examples: ['提醒我明天的会议', '给下午的面试设个提醒', '提前半小时提醒我聚餐'], intent: 'SET_REMINDER' },
//   { command: '取消提醒', description: '取消已设置的提醒', examples: ['取消明天会议的提醒', '去掉面试的提醒'], intent: 'CANCEL_REMINDER' },
//   { command: '检查空闲', description: '检查某个时间段是否有空', examples: ['明天下午有空吗', '这周三上午有没有安排', '检查一下周五的时间'], intent: 'CHECK_AVAILABILITY' },
//   { command: '帮助', description: '获取语音助手的使用帮助', examples: ['你能做什么', '怎么使用语音助手', '帮助'], intent: 'HELP' },
// ];

// 新的 voiceCommands 数据（使用新的 Intent 类型）
const voiceCommands: VoiceCommand[] = [
  {
    command: '创建事件',
    description: '创建新的日历事件',
    examples: [
      '帮我创建明天下午三点的会议',
      '添加一个下周一上午十点的面试',
      '新建周五晚上七点的聚餐',
    ],
    intent: 'CREATE',
  },
  {
    command: '更新事件',
    description: '修改已有的日历事件',
    examples: [
      '把明天的会议改到后天',
      '修改下午的面试时间为四点',
      '更新周五聚餐的地点',
    ],
    intent: 'UPDATE',
  },
  {
    command: '删除事件',
    description: '删除指定的日历事件',
    examples: [
      '取消明天的会议',
      '删除下午的面试',
      '去掉周五的聚餐安排',
    ],
    intent: 'DELETE',
  },
  {
    command: '查询事件',
    description: '查看某段时间的日程安排',
    examples: [
      '我明天有什么安排',
      '这周有什么会议',
      '查看今天的日程',
    ],
    intent: 'QUERY',
  },
];

// [旧代码保留] 旧的 intentColorMap
// const intentColorMap: Record<Intent, string> = {
//   CREATE_EVENT: 'green', UPDATE_EVENT: 'blue', DELETE_EVENT: 'red', QUERY_EVENTS: 'cyan',
//   SEARCH_EVENTS: 'purple', SET_REMINDER: 'orange', CANCEL_REMINDER: 'default',
//   CHECK_AVAILABILITY: 'geekblue', HELP: 'lime', CANCEL: 'default', UNKNOWN: 'default',
// };

// 新的 intentColorMap
const intentColorMap: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  QUERY: 'cyan',
  UNKNOWN: 'default',
};

const VoiceHelp: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const { processText } = useVoice();

  // Filter commands based on search
  const filteredCommands = voiceCommands.filter((cmd) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      cmd.command.toLowerCase().includes(lowerSearch) ||
      cmd.description.toLowerCase().includes(lowerSearch) ||
      cmd.examples.some((ex) => ex.toLowerCase().includes(lowerSearch))
    );
  });

  // Try a voice command via text
  const handleTryCommand = async (example: string) => {
    try {
      await processText(example);
    } catch {
      // Error handled in store
    }
  };

  return (
    <Card
      title={
        <Space>
          <QuestionCircleOutlined />
          <span>语音命令帮助</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Search */}
        <Input
          placeholder="搜索语音命令..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
        />

        {/* Quick tips */}
        <div
          style={{
            padding: '8px 12px',
            background: '#f0f5ff',
            borderRadius: '6px',
            border: '1px solid #adc6ff',
          }}
        >
          <Space>
            <AudioOutlined style={{ color: '#1677ff' }} />
            <Text style={{ fontSize: '12px' }}>
              点击麦克风按钮，说出命令即可。也可以点击示例直接测试。
            </Text>
          </Space>
        </div>

        {/* Command list */}
        <Collapse
          size="small"
          ghost
          items={filteredCommands.map((cmd) => ({
            key: cmd.intent,
            label: (
              <Space>
                <Tag color={intentColorMap[cmd.intent]} style={{ margin: 0 }}>
                  {cmd.command}
                </Tag>
                <Text style={{ fontSize: '13px' }}>{cmd.description}</Text>
              </Space>
            ),
            children: (
              <List
                size="small"
                dataSource={cmd.examples}
                renderItem={(example) => (
                  <List.Item
                    style={{ padding: '4px 0', cursor: 'pointer' }}
                    onClick={() => handleTryCommand(example)}
                  >
                    <Space>
                      <AudioOutlined style={{ color: '#1677ff', fontSize: '12px' }} />
                      <Text style={{ fontSize: '13px' }}>{example}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          }))}
        />

        {filteredCommands.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <Text type="secondary">未找到匹配的命令</Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default VoiceHelp;
