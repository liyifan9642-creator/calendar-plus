import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#2196F3';

interface VoiceInputProps {
  onSend: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  isListening?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

export default function VoiceInput({
  onSend,
  onVoiceStart,
  onVoiceStop,
  isListening = false,
  isProcessing = false,
  placeholder = '输入消息...',
}: VoiceInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onSend(trimmed);
      setText('');
    }
  };

  const handleVoicePress = () => {
    if (isListening) {
      onVoiceStop?.();
    } else {
      onVoiceStart?.();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
        onPress={handleVoicePress}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isListening ? 'mic' : 'mic-outline'}
          size={22}
          color={isListening ? '#FFFFFF' : PRIMARY}
        />
      </TouchableOpacity>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#9E9E9E"
          editable={!isProcessing && !isListening}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        {isProcessing && (
          <ActivityIndicator
            style={styles.spinner}
            size="small"
            color={PRIMARY}
          />
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.sendButton,
          (text.trim().length === 0 || isProcessing) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={text.trim().length === 0 || isProcessing}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-up"
          size={20}
          color={text.trim().length > 0 && !isProcessing ? '#FFFFFF' : '#BDBDBD'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginRight: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#F44336',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    paddingVertical: 0,
  },
  spinner: {
    marginLeft: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});
