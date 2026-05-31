import React from 'react';
import { Space, Button, Checkbox, Typography, Popconfirm, message } from 'antd';
import {
  DeleteOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
  MinusSquareOutlined,
} from '@ant-design/icons';
import { useCalendar } from '@/hooks';

const { Text } = Typography;

const BatchActions: React.FC = () => {
  const {
    isBatchMode,
    selectedDayEvents,
    selectedCount,
    toggleBatchMode,
    selectAllEvents,
    clearSelection,
    batchDeleteEvents,
    isEventSelected,
    toggleSelectEvent,
  } = useCalendar();

  const handleBatchDelete = async () => {
    try {
      await batchDeleteEvents();
      message.success(`已删除 ${selectedCount} 个事件`);
    } catch (error) {
      console.error('Batch delete failed:', error);
      message.error('批量删除失败');
    }
  };

  const handleSelectAll = () => {
    const allSelected = selectedDayEvents.every((e) => isEventSelected(e.id));
    if (allSelected) {
      clearSelection();
    } else {
      selectAllEvents();
    }
  };

  if (!isBatchMode) {
    return (
      <Button
        icon={<CheckSquareOutlined />}
        onClick={toggleBatchMode}
        size="small"
      >
        批量操作
      </Button>
    );
  }

  const allSelected = selectedDayEvents.length > 0 && selectedDayEvents.every((e) => isEventSelected(e.id));
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Checkbox
            indeterminate={someSelected}
            checked={allSelected}
            onChange={handleSelectAll}
          >
            {allSelected ? '取消全选' : '全选'}
          </Checkbox>
          <Text type="secondary">
            已选择 {selectedCount} / {selectedDayEvents.length} 项
          </Text>
        </Space>
        <Space>
          <Popconfirm
            title={`确定删除选中的 ${selectedCount} 个事件？`}
            description="删除后无法恢复"
            onConfirm={handleBatchDelete}
            okText="确定"
            cancelText="取消"
            disabled={selectedCount === 0}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedCount === 0}
              size="small"
            >
              删除选中
            </Button>
          </Popconfirm>
          <Button
            icon={<CloseSquareOutlined />}
            onClick={toggleBatchMode}
            size="small"
          >
            退出批量
          </Button>
        </Space>
      </Space>
    </Space>
  );
};

/**
 * Checkbox component for selecting individual events in batch mode
 */
export const EventSelectCheckbox: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { isBatchMode, isEventSelected, toggleSelectEvent } = useCalendar();

  if (!isBatchMode) {
    return null;
  }

  return (
    <Checkbox
      checked={isEventSelected(eventId)}
      onChange={() => toggleSelectEvent(eventId)}
      style={{ marginRight: 8 }}
    />
  );
};

export default BatchActions;
