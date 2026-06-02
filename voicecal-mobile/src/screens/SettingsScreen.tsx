import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../stores';

export const SettingsScreen = () => {
  const {
    llmBaseUrl,
    llmApiKey,
    llmModel,
    language,
    speechRate,
    updateLlmConfig,
    updateVoiceConfig,
  } = useSettingsStore();

  // Local state for editing
  const [baseUrl, setBaseUrl] = useState(llmBaseUrl);
  const [apiKey, setApiKey] = useState(llmApiKey);
  const [model, setModel] = useState(llmModel);
  const [lang, setLang] = useState(language);
  const [rate, setRate] = useState(String(speechRate));

  // Save LLM config
  const handleSaveLlm = useCallback(() => {
    if (!baseUrl.trim()) {
      Alert.alert('错误', 'API Base URL 不能为空');
      return;
    }
    if (!model.trim()) {
      Alert.alert('错误', '模型名称不能为空');
      return;
    }
    updateLlmConfig(baseUrl.trim(), apiKey.trim(), model.trim());
    Alert.alert('成功', 'LLM 配置已保存');
  }, [baseUrl, apiKey, model, updateLlmConfig]);

  // Save voice config
  const handleSaveVoice = useCallback(() => {
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0.1 || parsedRate > 2.0) {
      Alert.alert('错误', '语速应在 0.1 到 2.0 之间');
      return;
    }
    updateVoiceConfig(lang.trim() || 'zh-CN', parsedRate);
    Alert.alert('成功', '语音配置已保存');
  }, [lang, rate, updateVoiceConfig]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* LLM Configuration Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-outline" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>LLM 配置</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>API Base URL</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.deepseek.com"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="输入 API Key（可选）"
            placeholderTextColor="#bbb"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>模型名称</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="deepseek-chat"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveLlm}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveButtonText}>保存 LLM 配置</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Settings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic-outline" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>语音设置</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>识别语言</Text>
          <TextInput
            style={styles.input}
            value={lang}
            onChangeText={setLang}
            placeholder="zh-CN"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>语言代码，如 zh-CN、en-US</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>TTS 语速</Text>
          <TextInput
            style={styles.input}
            value={rate}
            onChangeText={setRate}
            placeholder="0.5"
            placeholderTextColor="#bbb"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>范围 0.1 ~ 2.0，默认 0.5</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveVoice}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveButtonText}>保存语音配置</Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>关于</Text>
        </View>

        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>应用名称</Text>
          <Text style={styles.aboutValue}>VoiceCal 语音日历</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>版本</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>技术栈</Text>
          <Text style={styles.aboutValue}>React Native + Expo</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>AI 引擎</Text>
          <Text style={styles.aboutValue}>LLM (DeepSeek)</Text>
        </View>
        <View style={[styles.aboutRow, styles.aboutRowLast]}>
          <Text style={styles.aboutLabel}>功能</Text>
          <Text style={styles.aboutValue}>自然语言日程管理</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>VoiceCal - AI 驱动的语音日历工具</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  hint: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  aboutRowLast: {
    borderBottomWidth: 0,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#888',
  },
  aboutValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: '#bbb',
    marginTop: 8,
  },
});
