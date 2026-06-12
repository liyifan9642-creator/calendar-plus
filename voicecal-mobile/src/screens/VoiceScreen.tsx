import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceStore, useCalendarStore } from '../stores';
import { voiceOrchestrator } from '../services/voice/VoiceOrchestrator';
import { asrService } from '../services/voice/AsrService';
import { Message, MessageMode, MessageStatus } from '../models';
import { generateId } from '../utils/uuid';
import dayjs from 'dayjs';
import * as Speech from 'expo-speech';
import { Colors, Gradients, Spacing, Radius, Typography, Shadows } from '../theme';

// ─── Inline ChatBubble ───────────────────────────────────────────────

interface ChatBubbleProps {
  message: Message;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onConfirm, onCancel }) => {
  const isUser = message.mode === MessageMode.QUERY && !message.responseText;
  const isPending = message.status === MessageStatus.NEED_CLARIFICATION;
  const isFailed = message.status === MessageStatus.FAILED;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowSystem]}>
      {/* AI avatar */}
      {!isUser && (
        <View style={styles.avatarAi}>
          <LinearGradient
            colors={Gradients.primary as [string, string]}
            style={styles.avatarGradient}
          >
            <Ionicons name="sparkles" size={16} color="#fff" />
          </LinearGradient>
        </View>
      )}

      <View style={styles.bubbleContentWrapper}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleSystem,
            isFailed && styles.bubbleFailed,
            isPending && styles.bubblePending,
          ]}
        >
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextSystem]}>
            {isUser ? message.userInput : message.responseText || message.clarificationQuestion || '...'}
          </Text>

          {/* Confirm / Cancel actions */}
          {isPending && onConfirm && onCancel && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => onConfirm(message.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.confirmButtonText}>确认</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => onCancel(message.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Timestamp */}
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {dayjs(message.createdAt).format('HH:mm')}
          </Text>
        </View>
      </View>

      {/* User avatar */}
      {isUser && (
        <View style={styles.avatarUser}>
          <View style={styles.avatarUserInner}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        </View>
      )}
    </View>
  );
};

// ─── VoiceScreen ──────────────────────────────────────────────────────

export const VoiceScreen = () => {
  const {
    messages,
    sessionId,
    isProcessing,
    addMessage,
    setProcessing,
    updateMessageStatus,
  } = useVoiceStore();

  const { loadEvents } = useCalendarStore();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Poll for partial text while recording
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const partial = asrService.getPartialText();
      if (partial) setPartialText(partial);
    }, 200);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Send a text message through the orchestrator
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    const now = new Date().toISOString();

    const userMessage: Message = {
      id: generateId(),
      mode: MessageMode.QUERY,
      status: MessageStatus.EXECUTED,
      sessionId,
      userId: 'default',
      userInput: text,
      createdAt: now,
      updatedAt: now,
    };

    addMessage(userMessage);
    setInputText('');
    setProcessing(true);

    try {
      const response = await voiceOrchestrator.processText(text, sessionId, 'default');
      addMessage(response.message);

      if (response.responseText) {
        Speech.speak(response.responseText, { language: 'zh-CN', rate: 0.8 });
      }

      if (response.success && response.affectedEvents && response.affectedEvents.length > 0) {
        const now = dayjs();
        const start = now.startOf('month').format('YYYY-MM-DD');
        const end = now.endOf('month').add(1, 'day').format('YYYY-MM-DD');
        loadEvents(start, end);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: generateId(),
        mode: MessageMode.QUERY,
        status: MessageStatus.FAILED,
        sessionId,
        userId: 'system',
        userInput: '',
        responseText: `处理失败：${error?.message ?? '未知错误'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [inputText, isProcessing, sessionId, addMessage, setProcessing, loadEvents]);

  // Handle confirmation
  const handleConfirm = useCallback(
    async (messageId: string) => {
      setProcessing(true);
      try {
        const response = await voiceOrchestrator.confirmMessage(messageId, messages);
        updateMessageStatus(messageId, response.message.status);
        addMessage(response.message);

        if (response.responseText) {
          Speech.speak(response.responseText, { language: 'zh-CN', rate: 0.8 });
        }

        if (response.success && response.affectedEvents && response.affectedEvents.length > 0) {
          const now = dayjs();
          const start = now.startOf('month').format('YYYY-MM-DD');
          const end = now.endOf('month').add(1, 'day').format('YYYY-MM-DD');
          loadEvents(start, end);
        }
      } catch (error: any) {
        const errorMessage: Message = {
          id: generateId(),
          mode: MessageMode.QUERY,
          status: MessageStatus.FAILED,
          sessionId,
          userId: 'system',
          userInput: '',
          responseText: `确认失败：${error?.message ?? '未知错误'}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addMessage(errorMessage);
      } finally {
        setProcessing(false);
      }
    },
    [messages, sessionId, addMessage, setProcessing, updateMessageStatus, loadEvents]
  );

  // Handle cancellation
  const handleCancel = useCallback(
    (messageId: string) => {
      const response = voiceOrchestrator.cancelMessage(messageId, messages);
      updateMessageStatus(messageId, MessageStatus.FAILED);
      addMessage(response.message);
    },
    [messages, addMessage, updateMessageStatus]
  );

  // Microphone toggle — uses device built-in ASR
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      // Stop listening and get the recognized text
      try {
        const text = await asrService.stopListening();
        setIsRecording(false);
        setPartialText('');

        if (text && text.trim()) {
          // Auto-send the recognized text
          setInputText(text);
          // Small delay to let user see what was recognized, then auto-send
          setTimeout(() => {
            setInputText('');
            processRecognizedText(text.trim());
          }, 500);
        } else {
          Alert.alert('未识别到语音', '请再试一次，说话时尽量清晰');
        }
      } catch (error: any) {
        setIsRecording(false);
        setPartialText('');
        Alert.alert('识别失败', error?.message ?? '未知错误');
      }
    } else {
      // Start listening
      try {
        const available = await asrService.isAvailable();
        if (!available) {
          const diag = asrService.getDiagnostics();
          const services = await asrService.getAvailableServices();
          const lines = [
            `模块加载: ${diag.moduleLoaded ? '✅' : '❌'}`,
            `监听器: ${diag.listenersSetup ? '✅' : '❌'}`,
            `可用服务: ${services.length > 0 ? services.join(', ') : '无'}`,
            diag.error ? `错误: ${diag.error}` : '',
            '',
            '请确认：',
            '1. 已安装 Google 语音服务',
            '2. 麦克风权限已授予',
            '3. 使用 Preview/Development Build',
          ].filter(Boolean);
          Alert.alert('语音识别不可用', lines.join('\n'));
          return;
        }

        setPartialText('');
        setIsRecording(true);

        // Start listening — this returns a promise that resolves when speech ends
        const text = await asrService.startListening();
        setIsRecording(false);
        setPartialText('');

        if (text && text.trim()) {
          setInputText(text);
          setTimeout(() => {
            setInputText('');
            processRecognizedText(text.trim());
          }, 500);
        }
      } catch (error: any) {
        setIsRecording(false);
        setPartialText('');
        Alert.alert('语音识别失败', error?.message ?? '请检查麦克风权限');
      }
    }
  }, [isRecording, sessionId, addMessage, isProcessing]);

  // Process recognized text through the orchestrator
  const processRecognizedText = useCallback(async (text: string) => {
    if (!text || isProcessing) return;

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: generateId(),
      mode: MessageMode.QUERY,
      status: MessageStatus.EXECUTED,
      sessionId,
      userId: 'default',
      userInput: text,
      createdAt: now,
      updatedAt: now,
    };

    addMessage(userMessage);
    setProcessing(true);

    try {
      const response = await voiceOrchestrator.processText(text, sessionId, 'default');
      addMessage(response.message);

      if (response.responseText) {
        Speech.speak(response.responseText, { language: 'zh-CN', rate: 0.8 });
      }

      if (response.success && response.affectedEvents && response.affectedEvents.length > 0) {
        const now = dayjs();
        const start = now.startOf('month').format('YYYY-MM-DD');
        const end = now.endOf('month').add(1, 'day').format('YYYY-MM-DD');
        loadEvents(start, end);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: generateId(),
        mode: MessageMode.QUERY,
        status: MessageStatus.FAILED,
        sessionId,
        userId: 'system',
        userInput: '',
        responseText: `处理失败：${error?.message ?? '未知错误'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [sessionId, addMessage, setProcessing, loadEvents, isProcessing]);

  const handleContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble message={item} onConfirm={handleConfirm} onCancel={handleCancel} />
    ),
    [handleConfirm, handleCancel]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Welcome state
  const renderEmptyList = useCallback(
    () => (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeIconBg}>
          <LinearGradient colors={Gradients.primary as [string, string]} style={styles.welcomeIconGradient}>
            <Ionicons name="mic" size={36} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.welcomeTitle}>VoiceCal 语音助手</Text>
        <Text style={styles.welcomeText}>
          输入文字或点击麦克风{'\n'}用自然语言管理您的日程
        </Text>
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>✨ 试试这样说</Text>
          {[
            '"明天下午3点开会"',
            '"这周有什么安排"',
            '"取消周五的会议"',
          ].map((hint, i) => (
            <View key={i} style={styles.hintItemRow}>
              <View style={styles.hintDot} />
              <Text style={styles.hintItem}>{hint}</Text>
            </View>
          ))}
        </View>
      </View>
    ),
    []
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={Gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>语音助手</Text>
        <TouchableOpacity style={styles.settingsButton} activeOpacity={0.6}>
          <View style={styles.settingsIconBg}>
            <Ionicons name="settings-outline" size={20} color={Colors.primaryDark} />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={messages.length === 0 ? styles.emptyChatContainer : styles.chatContainer}
        onContentSizeChange={handleContentSizeChange}
        showsVerticalScrollIndicator={false}
      />

      {/* Processing indicator */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.processingText}>正在处理...</Text>
        </View>
      )}

      {/* Recording indicator with partial text */}
      {isRecording && (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText} numberOfLines={2}>
            {partialText || '正在聆听...'}
          </Text>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonRecording]}
          onPress={handleMicPress}
          activeOpacity={0.7}
        >
          {isRecording ? (
            <LinearGradient colors={Gradients.micActive as [string, string]} style={styles.micGradient}>
              <Ionicons name="stop" size={20} color="#fff" />
            </LinearGradient>
          ) : (
            <Ionicons name="mic" size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="输入指令，如：明天下午3点开会"
            placeholderTextColor={Colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isProcessing}
            multiline
            maxLength={500}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isProcessing) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isProcessing}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-up"
            size={22}
            color={inputText.trim() && !isProcessing ? '#fff' : Colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  settingsIconBg: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },

  // Chat
  chatContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  emptyChatContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },

  // Bubble layout
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowSystem: {
    justifyContent: 'flex-start',
  },
  bubbleContentWrapper: {
    maxWidth: '72%',
  },

  // Avatars
  avatarAi: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.small,
  },
  avatarGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarUser: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.small,
  },
  avatarUserInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bubbles
  bubble: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bubbleUser: {
    backgroundColor: Colors.userBubble,
    borderBottomRightRadius: Radius.sm,
    ...Shadows.colored(Colors.userBubble, 0.25),
  },
  bubbleSystem: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm,
    ...Shadows.medium,
  },
  bubbleFailed: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  bubblePending: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  bubbleText: {
    ...Typography.body,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: Colors.textOnDark,
  },
  bubbleTextSystem: {
    color: Colors.textPrimary,
  },
  bubbleTime: {
    ...Typography.tiny,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    gap: 4,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  confirmButtonText: {
    ...Typography.bodyMedium,
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  // Processing
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryContainer,
  },
  processingText: {
    ...Typography.caption,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },

  // Recording indicator
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.errorLight,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginRight: Spacing.sm,
  },
  recordingText: {
    ...Typography.body,
    color: Colors.error,
    flex: 1,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    ...Shadows.small,
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginBottom: 2,
  },
  micButtonRecording: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  micGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 42,
    justifyContent: 'center',
  },
  textInput: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    marginBottom: 2,
    ...Shadows.small,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceVariant,
  },

  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xxxl * 2,
  },
  welcomeIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    ...Shadows.colored(Colors.primary, 0.3),
  },
  welcomeIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
  },
  welcomeText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 24,
  },
  hintCard: {
    marginTop: Spacing.xxxl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    ...Shadows.medium,
  },
  hintTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  hintItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Spacing.md,
  },
  hintItem: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
