import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card, Typography, Space, Tag, Spin, Tooltip } from 'antd';
import {
  AudioOutlined,
  StopOutlined,
  LoadingOutlined,
  KeyOutlined,
  SendOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useVoice, useCalendar } from '@/hooks';
import { Intent, ConversationItem } from '@/types';
import ConversationLog from './ConversationLog';

const { Text } = Typography;

// Intent display mapping
const intentDisplayMap: Record<string, { label: string; color: string }> = {
  CREATE: { label: '创建事件', color: 'green' },
  UPDATE: { label: '更新事件', color: 'blue' },
  DELETE: { label: '删除事件', color: 'red' },
  QUERY: { label: '查询事件', color: 'cyan' },
  UNKNOWN: { label: '未知', color: 'default' },
};

// 声明 CSS 变量和动画
const globalStyles = `
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4), 0 0 60px rgba(99, 102, 241, 0.2); }
    50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.6), 0 0 80px rgba(99, 102, 241, 0.3); }
  }

  @keyframes listening-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2); }
    50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6), 0 0 80px rgba(239, 68, 68, 0.3); }
  }

  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fade-in-scale {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes ripple {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }

  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes bounce-in {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes slide-in-left {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slide-in-right {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .glass-effect {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .voice-card {
    position: relative;
    overflow: hidden;
  }

  .voice-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: conic-gradient(
      from 0deg,
      transparent,
      rgba(99, 102, 241, 0.03),
      transparent,
      rgba(139, 92, 246, 0.03),
      transparent
    );
    animation: spin-slow 20s linear infinite;
    z-index: 0;
  }

  .voice-card > * {
    position: relative;
    z-index: 1;
  }

  .quick-action-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .quick-action-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.1);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .quick-action-btn:hover::before {
    width: 200%;
    height: 200%;
  }

  .quick-action-btn:hover {
    transform: translateY(-3px) !important;
  }

  .voice-button {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .voice-button::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.5);
    opacity: 0;
    border-radius: 100%;
    transform: scale(1, 1) translate(-50%);
    transform-origin: 50% 50%;
  }

  @keyframes ripple-effect {
    0% { transform: scale(0); opacity: 0.5; }
    100% { transform: scale(40); opacity: 0; }
  }

  .voice-button:focus:not(:active)::after {
    animation: ripple-effect 1s ease-out;
  }

  .keyboard-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .keyboard-btn:hover {
    transform: rotate(-5deg) scale(1.05);
  }

  .keyboard-btn:active {
    transform: rotate(0deg) scale(0.95);
  }

  .status-text {
    animation: fade-in-up 0.5s ease-out;
  }

  .chat-area {
    scrollbar-width: thin;
    scrollbar-color: rgba(99, 102, 241, 0.2) transparent;
  }

  .chat-area::-webkit-scrollbar {
    width: 6px;
  }

  .chat-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-area::-webkit-scrollbar-thumb {
    background-color: rgba(99, 102, 241, 0.2);
    border-radius: 20px;
    border: transparent;
  }

  .chat-area::-webkit-scrollbar-thumb:hover {
    background-color: rgba(99, 102, 241, 0.4);
  }

  .input-glow:focus {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    border-color: #6366f1 !important;
  }

  .send-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .send-btn::before {
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

  .send-btn:hover::before {
    left: 100%;
  }

  .recording-indicator {
    animation: bounce-in 0.5s ease-out;
  }

  .wave-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 20px;
  }

  .wave-bar {
    width: 3px;
    background: linear-gradient(to top, #6366f1, #818cf8);
    border-radius: 3px;
    animation: wave 1.2s ease-in-out infinite;
  }

  @keyframes wave {
    0%, 100% { height: 4px; }
    50% { height: 18px; }
  }

  .wave-bar:nth-child(2) { animation-delay: 0.1s; }
  .wave-bar:nth-child(3) { animation-delay: 0.2s; }
  .wave-bar:nth-child(4) { animation-delay: 0.3s; }
  .wave-bar:nth-child(5) { animation-delay: 0.4s; }

  @keyframes particle-float {
    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
    50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.3);
    animation: particle-float 3s ease-in-out infinite;
  }
`;

const VoiceAssistant: React.FC = () => {
  const {
    voiceState,
    interimText,
    finalText,
    systemResponse,
    recognizedIntent,
    conversationHistory,
    loading,
    error,
    formattedDuration,
    currentMessage,
    clarificationOptions,
    startRecording,
    stopRecording,
    process,
    confirm,
    cancel,
    selectOption,
    clearCurrentInput,
    setVoiceState,
  } = useVoice();

  const { refreshEvents } = useCalendar();

  // Quick action buttons config
  const quickActions = [
    { icon: <CalendarOutlined />, label: '今日日程', text: '今天有什么安排', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { icon: <ClockCircleOutlined />, label: '明日日程', text: '明天有什么安排', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
    { icon: <UnorderedListOutlined />, label: '本周日程', text: '这周的日程', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
    { icon: <SearchOutlined />, label: '搜索事件', text: '搜索关于项目的会议', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  ];

  const [showKeyboard, setShowKeyboard] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showRecognition, setShowRecognition] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<number | null>(null);
  const [isVoiceHovered, setIsVoiceHovered] = useState(false);
  const [isVoicePressed, setIsVoicePressed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const isListening = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';
  const isIdle = voiceState === 'idle';

  // Show recognition popup when recording finishes
  useEffect(() => {
    if (finalText && !isListening && !isProcessing) {
      setShowRecognition(true);
      const timer = setTimeout(() => setShowRecognition(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [finalText, isListening, isProcessing]);

  // Focus input when keyboard is shown
  useEffect(() => {
    if (showKeyboard) {
      inputRef.current?.focus();
    }
  }, [showKeyboard]);

  // Toggle recording
  const handleToggleRecording = useCallback(() => {
    if (isListening) {
      stopRecording();
    } else if (isIdle) {
      setShowRecognition(false);
      startRecording();
    }
  }, [isListening, isIdle, startRecording, stopRecording]);

  // Toggle keyboard
  const handleToggleKeyboard = useCallback(() => {
    setShowKeyboard(!showKeyboard);
  }, [showKeyboard]);

  // Handle quick action click
  const handleQuickAction = useCallback(async (text: string) => {
    try {
      await process(text);
      await refreshEvents();
    } catch (error) {
      console.error('Quick action failed:', error);
    }
  }, [process, refreshEvents]);

  // Send text message
  const handleSendText = useCallback(async () => {
    if (!textInput.trim()) return;

    const text = textInput.trim();
    setTextInput('');
    setShowKeyboard(false);

    try {
      const response = await process(text);
      await refreshEvents();
    } catch (error) {
      console.error('Failed to process text:', error);
    }
  }, [textInput, process, refreshEvents]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  // Get voice button gradient
  const getVoiceGradient = () => {
    if (isListening) return 'linear-gradient(135deg, #ef4444, #f87171, #fca5a5)';
    if (isProcessing) return 'linear-gradient(135deg, #f59e0b, #fbbf24, #fcd34d)';
    return 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)';
  };

  // Get voice button animation
  const getVoiceAnimation = () => {
    if (isListening) return 'listening-pulse 2s ease-in-out infinite';
    if (isIdle && isVoiceHovered) return 'pulse-glow 2s ease-in-out infinite';
    return 'none';
  };

  return (
    <>
      <style>{globalStyles}</style>
      <Card
        bordered={false}
        className="voice-card"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,255,0.9))',
          boxShadow: '0 20px 60px rgba(99, 102, 241, 0.08), 0 4px 20px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          border: '1px solid rgba(99, 102, 241, 0.1)',
        }}
        styles={{
          header: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,255,0.95))',
            borderBottom: '1px solid rgba(99, 102, 241, 0.08)',
            padding: '20px 24px',
            backdropFilter: 'blur(10px)',
          },
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 24px',
            background: 'transparent',
          },
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)',
                backgroundSize: '200% 200%',
                animation: 'gradient-flow 3s ease infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
              }}
            >
              <AudioOutlined style={{ fontSize: '20px', color: '#fff' }} />
            </div>
            <div>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.3px' }}>
                语音助手
              </span>
              <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400, marginTop: '2px' }}>
                AI 驱动的智能日程管理
              </div>
            </div>
            {isListening && (
              <div className="recording-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <div className="wave-container">
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                </div>
                <Tag
                  color="error"
                  style={{
                    borderRadius: '20px',
                    padding: '2px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                    border: 'none',
                    color: '#ef4444',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {formattedDuration}
                </Tag>
              </div>
            )}
            {isProcessing && (
              <div style={{ marginLeft: 'auto' }}>
                <Spin size="small" />
              </div>
            )}
          </div>
        }
      >
        {/* Chat messages area */}
        <div className="chat-area">
          <ConversationLog
            conversationHistory={conversationHistory}
            loading={loading}
            onSelectOption={selectOption}
            onConfirm={confirm}
            onCancel={cancel}
          />
        </div>

        {/* Recognition result popup */}
        {showRecognition && finalText && (
          <div
            style={{
              padding: '14px 18px',
              marginBottom: '14px',
              background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9), rgba(220, 252, 231, 0.9))',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'fade-in-scale 0.4s ease-out',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 24px rgba(34, 197, 94, 0.1)',
            }}
          >
            <Text style={{ color: '#166534', fontWeight: 600 }}>{finalText}</Text>
            <Tag
              color="success"
              style={{
                borderRadius: '20px',
                padding: '2px 12px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                border: 'none',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              }}
            >
              已识别
            </Tag>
          </div>
        )}

        {/* Real-time recognition text */}
        {isListening && interimText && (
          <div
            style={{
              padding: '14px 18px',
              marginBottom: '14px',
              background: 'linear-gradient(135deg, rgba(255, 251, 235, 0.9), rgba(254, 243, 199, 0.9))',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '16px',
              animation: 'fade-in-up 0.3s ease-out',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="wave-container" style={{ height: '16px' }}>
                <div className="wave-bar" style={{ background: 'linear-gradient(to top, #f59e0b, #fbbf24)', width: '2px' }} />
                <div className="wave-bar" style={{ background: 'linear-gradient(to top, #f59e0b, #fbbf24)', width: '2px' }} />
                <div className="wave-bar" style={{ background: 'linear-gradient(to top, #f59e0b, #fbbf24)', width: '2px' }} />
              </div>
              <Text style={{ fontStyle: 'italic', color: '#92400e', fontWeight: 500 }}>
                {interimText}
              </Text>
            </div>
          </div>
        )}

        {/* Keyboard input */}
        {showKeyboard && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '18px',
              padding: '14px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,255,0.9))',
              borderRadius: '18px',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
              animation: 'slide-in-left 0.3s ease-out',
              backdropFilter: 'blur(20px)',
            }}
          >
            <input
              ref={inputRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              className="input-glow"
              style={{
                flex: 1,
                padding: '12px 18px',
                border: '1.5px solid #e5e7eb',
                borderRadius: '14px',
                outline: 'none',
                fontSize: '14px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#1e1b4b',
              }}
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || loading}
              className="send-btn"
              style={{
                padding: '12px 22px',
                background: textInput.trim()
                  ? 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)'
                  : '#e5e7eb',
                backgroundSize: '200% 200%',
                animation: textInput.trim() ? 'gradient-flow 3s ease infinite' : 'none',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: textInput.trim()
                  ? '0 8px 24px rgba(99, 102, 241, 0.3)'
                  : 'none',
                transform: textInput.trim() ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              <SendOutlined style={{ fontSize: '16px' }} />
            </button>
          </div>
        )}

        {/* Bottom area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '16px 0 8px', marginTop: 'auto' }}>
          {/* Left: Quick action buttons - vertical */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', animation: 'slide-in-left 0.5s ease-out' }}>
            {quickActions.map((action, index) => (
              <Tooltip key={index} title={action.text} placement="right">
                <button
                  onClick={() => handleQuickAction(action.text)}
                  onMouseEnter={() => setHoveredAction(index)}
                  onMouseLeave={() => setHoveredAction(null)}
                  disabled={loading}
                  className="quick-action-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '12px',
                    background: hoveredAction === index ? action.gradient : '#ffffff',
                    color: hoveredAction === index ? '#fff' : action.color,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    lineHeight: 1,
                    opacity: loading ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    boxShadow: hoveredAction === index
                      ? `0 6px 20px ${action.color}40`
                      : '0 2px 8px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: hoveredAction === index ? 'translateX(4px)' : 'translateX(0)',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Center: Voice button + keyboard */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fade-in-up 0.6s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Voice button container */}
              <div style={{ width: '88px', height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {/* Pulse rings for listening state */}
                {isListening && (
                  <>
                    <div style={{ position: 'absolute', width: '88px', height: '88px', borderRadius: '50%', border: '2px solid rgba(239, 68, 68, 0.3)', animation: 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                    <div style={{ position: 'absolute', width: '88px', height: '88px', borderRadius: '50%', border: '2px solid rgba(239, 68, 68, 0.2)', animation: 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.5s' }} />
                  </>
                )}

                {/* Glow effect on hover */}
                {isIdle && isVoiceHovered && (
                  <div style={{
                    position: 'absolute',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                    animation: 'breathe 2s ease-in-out infinite',
                  }} />
                )}

                {/* Voice button */}
                <button
                  onClick={handleToggleRecording}
                  onMouseEnter={() => setIsVoiceHovered(true)}
                  onMouseLeave={() => { setIsVoiceHovered(false); setIsVoicePressed(false); }}
                  onMouseDown={() => setIsVoicePressed(true)}
                  onMouseUp={() => setIsVoicePressed(false)}
                  disabled={isProcessing}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: '4px solid rgba(255, 255, 255, 0.8)',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: getVoiceGradient(),
                    backgroundSize: '200% 200%',
                    animation: `${getVoiceAnimation()}, gradient-flow 3s ease infinite`,
                    boxShadow: isVoicePressed
                      ? '0 4px 16px rgba(99, 102, 241, 0.3)'
                      : isVoiceHovered
                        ? '0 12px 40px rgba(99, 102, 241, 0.4)'
                        : '0 8px 32px rgba(99, 102, 241, 0.3)',
                    transform: isVoicePressed ? 'scale(0.95)' : isVoiceHovered ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {isProcessing ? (
                    <LoadingOutlined style={{ fontSize: 24, color: '#fff' }} />
                  ) : isListening ? (
                    <StopOutlined style={{ fontSize: 24, color: '#fff' }} />
                  ) : (
                    <AudioOutlined style={{ fontSize: 24, color: '#fff' }} />
                  )}
                </button>
              </div>

              {/* Keyboard button */}
              <Tooltip title={showKeyboard ? '关闭键盘' : '打开键盘'} placement="top">
                <button
                  onClick={handleToggleKeyboard}
                  className="keyboard-btn"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: showKeyboard
                      ? 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)'
                      : 'linear-gradient(145deg, #ffffff, #f8fafc)',
                    border: showKeyboard ? 'none' : '1.5px solid rgba(99, 102, 241, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: showKeyboard
                      ? '0 6px 20px rgba(99, 102, 241, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <KeyOutlined style={{ fontSize: '16px', color: showKeyboard ? '#fff' : '#6366f1' }} />
                </button>
              </Tooltip>
            </div>

            {/* Status text */}
            <Text style={{ fontSize: '12px', color: isListening ? '#ef4444' : isProcessing ? '#f59e0b' : '#9ca3af', fontWeight: 500 }}>
              {isListening ? '正在聆听...' : isProcessing ? '处理中...' : '点击说话'}
            </Text>
          </div>

          {/* Right: placeholder for balance */}
          <div style={{ width: '100px' }} />
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginTop: '14px',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.9), rgba(254, 226, 226, 0.9))',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '14px',
              textAlign: 'center',
              animation: 'bounce-in 0.5s ease-out',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.1)',
            }}
          >
            <Text style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
              {error}
            </Text>
          </div>
        )}
      </Card>
    </>
  );
};

export default VoiceAssistant;
