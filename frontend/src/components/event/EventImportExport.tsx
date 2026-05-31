import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  message,
  DatePicker,
  Select,
  List,
  Tag,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useUIStore } from '@/stores';
import { useCalendar } from '@/hooks';
import {
  eventsToICS,
  parseICS,
  downloadFile,
  readFileAsText,
  formatDateTime,
} from '@/utils';
import { CalendarEvent, ICSImportResult } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { RangePicker } = DatePicker;

const EventImportExport: React.FC = () => {
  const { showImportExport, closeImportExport } = useUIStore();
  const { events, selectedDayEvents, refreshEvents } = useCalendar();

  // Export state
  const [exportRange, setExportRange] = useState<'all' | 'day' | 'custom'>('all');
  const [exportDateRange, setExportDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [exporting, setExporting] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ICSImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const handleClose = () => {
    setImportFile(null);
    setImportResult(null);
    setExportRange('all');
    setExportDateRange(null);
    closeImportExport();
  };

  // Export handlers
  const handleExport = async () => {
    setExporting(true);
    try {
      let eventsToExport: CalendarEvent[] = [];

      switch (exportRange) {
        case 'all':
          eventsToExport = events;
          break;
        case 'day':
          eventsToExport = selectedDayEvents;
          break;
        case 'custom':
          if (exportDateRange) {
            const [start, end] = exportDateRange;
            eventsToExport = events.filter((e) => {
              const eventDate = dayjs(e.startTime);
              return eventDate.isAfter(start.startOf('day')) && eventDate.isBefore(end.endOf('day'));
            });
          }
          break;
      }

      if (eventsToExport.length === 0) {
        message.warning('没有可导出的事件');
        return;
      }

      const icsContent = eventsToICS(eventsToExport);
      const filename = `voice-calendar-export-${dayjs().format('YYYY-MM-DD')}.ics`;
      downloadFile(icsContent, filename, 'text/calendar;charset=utf-8');
      message.success(`成功导出 ${eventsToExport.length} 个事件`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  // Import handlers
  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportResult(null);

    try {
      const content = await readFileAsText(file);
      const result = parseICS(content);
      setImportResult(result);
    } catch (error) {
      console.error('Failed to read file:', error);
      message.error('文件读取失败');
      setImportFile(null);
    }

    return false; // Prevent default upload behavior
  };

  const handleImport = async () => {
    if (!importFile || !importResult) {
      message.warning('请先选择文件');
      return;
    }

    setImporting(true);
    try {
      const content = await readFileAsText(importFile);
      const result = parseICS(content);

      // In a real implementation, you would send the parsed events to the API
      // For now, we show the result and refresh the event list
      message.success(`成功解析 ${result.importedEvents} 个事件`);

      if (result.errors.length > 0) {
        message.warning(`${result.skippedEvents} 个事件解析失败`);
      }

      // Refresh events from server
      await refreshEvents();
      handleClose();
    } catch (error) {
      console.error('Import failed:', error);
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.ics',
    beforeUpload: handleFileSelect,
    showUploadList: false,
    fileList: importFile
      ? [
          {
            uid: '-1',
            name: importFile.name,
            status: 'done' as const,
          },
        ]
      : [],
  };

  return (
    <Modal
      title="导入/导出日历"
      open={showImportExport}
      onCancel={handleClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Export section */}
        <div>
          <Title level={5}>
            <Space>
              <DownloadOutlined />
              <span>导出事件</span>
            </Space>
          </Title>
          <Paragraph type="secondary">
            将日历事件导出为 ICS 文件，可在其他日历应用中导入。
          </Paragraph>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Select
              value={exportRange}
              onChange={setExportRange}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: `所有事件 (${events.length} 个)` },
                { value: 'day', label: `当天事件 (${selectedDayEvents.length} 个)` },
                { value: 'custom', label: '自定义日期范围' },
              ]}
            />

            {exportRange === 'custom' && (
              <RangePicker
                value={exportDateRange}
                onChange={(dates) => setExportDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                style={{ width: '100%' }}
                placeholder={['开始日期', '结束日期']}
              />
            )}

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
              block
            >
              导出 ICS 文件
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Import section */}
        <div>
          <Title level={5}>
            <Space>
              <UploadOutlined />
              <span>导入事件</span>
            </Space>
          </Title>
          <Paragraph type="secondary">
            从 ICS 文件导入日历事件。
          </Paragraph>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Dragger {...uploadProps} style={{ padding: '16px' }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                点击或拖拽 ICS 文件到此处
              </p>
              <p className="ant-upload-hint">
                支持 .ics 格式的日历文件
              </p>
            </Dragger>

            {importFile && (
              <Alert
                type="info"
                message={
                  <Space>
                    <FileTextOutlined />
                    <Text>{importFile.name}</Text>
                    <Text type="secondary">({(importFile.size / 1024).toFixed(1)} KB)</Text>
                  </Space>
                }
              />
            )}

            {importResult && (
              <div>
                <Alert
                  type={importResult.errors.length > 0 ? 'warning' : 'success'}
                  message={
                    <Space direction="vertical" size="small">
                      <Space>
                        <CheckCircleOutlined />
                        <Text>解析结果：共 {importResult.totalEvents} 个事件</Text>
                      </Space>
                      <Space>
                        <Text type="success">成功：{importResult.importedEvents}</Text>
                        {importResult.skippedEvents > 0 && (
                          <Text type="danger">失败：{importResult.skippedEvents}</Text>
                        )}
                      </Space>
                    </Space>
                  }
                />
                {importResult.errors.length > 0 && (
                  <List
                    size="small"
                    style={{ marginTop: 8, maxHeight: 120, overflow: 'auto' }}
                    dataSource={importResult.errors.slice(0, 5)}
                    renderItem={(error) => (
                      <List.Item>
                        <Text type="danger" style={{ fontSize: 12 }}>
                          <CloseCircleOutlined /> {error}
                        </Text>
                      </List.Item>
                    )}
                  />
                )}
              </div>
            )}

            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleImport}
              loading={importing}
              disabled={!importFile || !importResult}
              block
            >
              导入事件
            </Button>
          </Space>
        </div>
      </Space>
    </Modal>
  );
};

export default EventImportExport;
