import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MessageStatus } from '../../models/enums';
import dayjs from 'dayjs';

const PRIMARY = '#2196F3';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  status?: MessageStatus;
}

interface ChatBubbleProps {
  message: ChatMessage;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function formatTimestamp(ts: string): string {
  return dayjs(ts).format('HH:mm');
}

export default function ChatBubble({ message, onConfirm, onCancel }: ChatBubbleProps) {
  const isUser = message.isUser;
  const showActions = message.status === MessageStatus.NEED_CLARIFICATION;

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.systemBubble,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.systemText]}>
          {message.text}
        </Text>
      </View>
      <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
        {formatTimestamp(message.timestamp)}
      </Text>
      {showActions && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmButtonText}>确认</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    backgroundColor: '#EEEEEE',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  systemText: {
    color: '#212121',
  },
  timestamp: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 4,
  },
  timestampRight: {
    marginRight: 4,
  },
  timestampLeft: {
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: PRIMARY,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#757575',
  },
});
