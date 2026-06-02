import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceStore, useCalendarStore } from '../stores';
import { voiceOrchestrator } from '../services/voice/VoiceOrchestrator';
import { Message, MessageMode, MessageStatus } from '../models';
import { generateId } from '../utils/uuid';
import dayjs from 'dayjs';
import * as Speech from 'expo-speech';

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
      {!isUser && (
        <View style={styles.avatarContainer}>
          <Ionicons name="mic" size={18} color="#fff" />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleSystem,
          isFailed && styles.bubbleFailed,
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextSystem]}>
          {isUser ? message.userInput : message.responseText || message.clarificationQuestion || '...'}
        </Text>
        {isPending && onConfirm && onCancel && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => onConfirm(message.id)}
            >
              <Text style={styles.confirmButtonText}>确认</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => onCancel(message.id)}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.bubbleTime}>
          {dayjs(message.createdAt).format('HH:mm')}
        </Text>
      </View>
      {isUser && (
        <View style={[styles.avatarContainer, styles.avatarUser]}>
          <Ionicons name="person" size={18} color="#fff" />
        </View>
      )}
    </View>
  );
};

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
  const flatListRef = useRef<FlatList>(null);

  // Send a text message through the orchestrator
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    const now = new Date().toISOString();

    // Create user message for display
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
      // Process through orchestrator
      const response = await voiceOrchestrator.processText(text, sessionId, 'default');

      // Add system response message
      addMessage(response.message);

      // Speak the response if TTS is available
      if (response.responseText) {
        Speech.speak(response.responseText, {
          language: 'zh-CN',
          rate: 0.8,
        });
      }

      // Refresh calendar events if the operation was successful
      if (response.success && response.affectedEvents && response.affectedEvents.length > 0) {
        const now = dayjs();
        const start = now.startOf('month').format('YYYY-MM-DD');
        const end = now.endOf('month').add(1, 'day').format('YYYY-MM-DD');
        loadEvents(start, end);
      }
    } catch (error: any) {
      // Add error message
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

  // Handle confirmation of a clarification-needed message
  const handleConfirm = useCallback(
    async (messageId: string) => {
      setProcessing(true);
      try {
        const response = await voiceOrchestrator.confirmMessage(messageId, messages);

        // Update the original message status
        updateMessageStatus(messageId, response.message.status);

        // Add the response message
        addMessage(response.message);

        // Speak the response
        if (response.responseText) {
          Speech.speak(response.responseText, {
            language: 'zh-CN',
            rate: 0.8,
          });
        }

        // Refresh calendar if needed
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

  // Handle cancellation of a pending message
  const handleCancel = useCallback(
    (messageId: string) => {
      const response = voiceOrchestrator.cancelMessage(messageId, messages);
      updateMessageStatus(messageId, MessageStatus.FAILED);
      addMessage(response.message);
    },
    [messages, addMessage, updateMessageStatus]
  );

  // Handle microphone button press (placeholder for future ASR)
  const handleMicPress = useCallback(() => {
    // TODO: Implement speech-to-text with expo-av recording
    Speech.speak('语音识别功能即将上线', { language: 'zh-CN' });
  }, []);

  // Scroll to bottom when new messages arrive
  const handleContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Render each message bubble
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble message={item} onConfirm={handleConfirm} onCancel={handleCancel} />
    ),
    [handleConfirm, handleCancel]
  );

  // Key extractor
  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Welcome message when empty
  const renderEmptyList = useCallback(
    () => (
      <View style={styles.welcomeContainer}>
        <Ionicons name="mic-outline" size={64} color="#ccc" />
        <Text style={styles.welcomeTitle}>VoiceCal 语音助手</Text>
        <Text style={styles.welcomeText}>
          输入文字或点击麦克风，用自然语言管理您的日程
        </Text>
        <View style={styles.hintContainer}>
          <Text style={styles.hintTitle}>试试这样说：</Text>
          <Text style={styles.hintItem}>"明天下午3点开会"</Text>
          <Text style={styles.hintItem}>"这周有什么安排"</Text>
          <Text style={styles.hintItem}>"取消周五的会议"</Text>
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
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.processingText}>正在处理...</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
          <Ionicons name="mic" size={22} color="#2196F3" />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="输入指令，如：明天下午3点开会"
          placeholderTextColor="#aaa"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!isProcessing}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isProcessing) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isProcessing}
        >
          <Ionicons
            name="arrow-up"
            size={22}
            color={inputText.trim() && !isProcessing ? '#fff' : '#aaa'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  chatContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  emptyChatContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowSystem: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  avatarUser: {
    backgroundColor: '#4CAF50',
  },
  bubble: {
    maxWidth: '72%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  bubbleSystem: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleFailed: {
    backgroundColor: '#FFF3F0',
    borderColor: '#FFCDD2',
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextSystem: {
    color: '#333',
  },
  bubbleTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
  },
  processingText: {
    fontSize: 13,
    color: '#2196F3',
    marginLeft: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  welcomeText: {
    fontSize: 15,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  hintContainer: {
    marginTop: 28,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  hintItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    paddingLeft: 8,
  },
});
