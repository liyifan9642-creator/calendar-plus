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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../stores';
import { Colors, Gradients, Spacing, Radius, Typography, Shadows } from '../theme';

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
      {/* Header */}
      <LinearGradient
        colors={Gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>设置</Text>
      </LinearGradient>
      {/* LLM Configuration Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-outline" size={20} color={Colors.primary} />
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
          <Ionicons name="mic-outline" size={20} color={Colors.primary} />
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
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
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
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingTop: 48,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    ...Shadows.small,
  },
  saveButtonText: {
    color: Colors.textOnPrimary,
    ...Typography.bodyMedium,
    marginLeft: Spacing.sm,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  aboutRowLast: {
    borderBottomWidth: 0,
  },
  aboutLabel: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  aboutValue: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  footer: {
    textAlign: 'center',
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
});
