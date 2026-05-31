# 缺失接口文档 - ASR 语音识别

> 创建日期: 2026-05-31
> 模块: 前端 ASR 三级降级策略

## 概述

本文档记录了前端 ASR 服务实现中依赖但后端尚未提供的接口。这些接口是三级降级策略中第 2 级（联网 ASR）和第 3 级（本地 Sherpa-ONNX）正常工作所必需的。

---

## 接口清单

### 1. 联网 ASR 接口 (优先级 2)

#### 接口信息
- **路径**: `POST /api/voice/process-audio`
- **Content-Type**: `multipart/form-data`
- **描述**: 处理音频文件并返回识别结果及 NLU 处理结果

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| audio | File | 是 | 音频文件 (webm 格式) |
| language | string | 否 | 语言代码，默认 `zh-CN` |
| sessionId | string | 否 | 会话 ID，用于多轮对话 |

#### 响应格式

```json
{
  "responseId": "resp-001",
  "sessionId": "session-001",
  "intent": "CREATE_EVENT",
  "entities": {
    "title": "会议",
    "date": "2026-06-01",
    "startTime": "15:00"
  },
  "responseText": "好的，已为您创建明天下午3点的会议。",
  "success": true,
  "metadata": {
    "asrDurationMs": 500,
    "asrConfidence": 0.95,
    "nluDurationMs": 800,
    "totalDurationMs": 1300
  }
}
```

#### 前端调用位置
- 文件: `frontend/src/services/asrService.ts`
- 函数: `callOnlineAsr()`

---

### 2. Sherpa-ONNX 本地识别接口 (优先级 3)

#### 接口信息
- **路径**: `POST /api/voice/process-asr`
- **Content-Type**: `application/json`
- **描述**: 使用本地 Sherpa-ONNX 模型进行语音识别

#### 请求参数

```json
{
  "audio": "base64编码的音频数据",
  "language": "zh-CN"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| audio | string | 是 | Base64 编码的音频数据 |
| language | string | 否 | 语言代码，默认 `zh-CN` |

#### 响应格式

```json
{
  "responseId": "resp-002",
  "sessionId": "session-001",
  "intent": "CREATE_EVENT",
  "entities": {
    "title": "会议",
    "date": "2026-06-01",
    "startTime": "15:00"
  },
  "responseText": "好的，已为您创建明天下午3点的会议。",
  "success": true,
  "metadata": {
    "asrDurationMs": 300,
    "asrConfidence": 0.88,
    "nluDurationMs": 800,
    "totalDurationMs": 1100
  }
}
```

#### 前端调用位置
- 文件: `frontend/src/services/asrService.ts`
- 函数: `callSherpaAsr()`

---

## 接口对比

| 特性 | process-audio | process-asr |
|------|---------------|-------------|
| 传输方式 | multipart/form-data | application/json |
| 音频格式 | 原始音频文件 (Blob) | Base64 编码字符串 |
| 识别引擎 | 云端 ASR 服务 | 本地 Sherpa-ONNX |
| 延迟 | ~1000ms | ~800ms |
| 依赖网络 | 是 | 否 |

---

## 降级策略流程

```
用户开始录音
       │
       ▼
┌─────────────────┐
│ 1. Web Speech API│ ← 浏览器内置，实时识别
│    (优先级最高)   │
└────────┬────────┘
         │ 失败或不可用
         ▼
┌─────────────────┐
│ 2. 联网 ASR     │ ← POST /api/voice/process-audio
│    (中等优先级)  │
└────────┬────────┘
         │ 失败或不可用
         ▼
┌─────────────────┐
│ 3. Sherpa-ONNX  │ ← POST /api/voice/process-asr
│    (最低优先级)  │
└────────┬────────┘
         │
         ▼
    返回识别结果
```

---

## 实现状态

| 接口 | 后端实现状态 | 前端调用代码 |
|------|-------------|-------------|
| POST /api/voice/process-audio | 已存在 | asrService.ts: `callOnlineAsr()` |
| POST /api/voice/process-asr | **待实现** | asrService.ts: `callSherpaAsr()` |

---

## 后端实现建议

### Sherpa-ONNX 接口实现要点

1. **音频解码**: 接收 Base64 音频数据，解码为 PCM 格式
2. **模型加载**: 使用 Sherpa-ONNX 加载预训练的中文语音识别模型
3. **识别处理**: 调用 Sherpa-ONNX API 进行语音识别
4. **结果返回**: 返回识别文本及置信度

### 推荐的 Sherpa-ONNX 模型

- **中文**: `sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20`
- **英文**: `sherpa-onnx-streaming-zipformer-en-2023-02-21`

---

## 测试建议

1. **单元测试**: 测试各级降级逻辑
2. **集成测试**: 测试完整的录音 -> 识别 -> 处理流程
3. **降级测试**: 模拟各级失败，验证降级是否正常工作
4. **性能测试**: 测试各级识别的延迟和准确率

---

## 相关文件

- `frontend/src/services/asrService.ts` - ASR 服务实现
- `frontend/src/components/voice/AsrStatusIndicator.tsx` - 状态指示组件
- `frontend/src/hooks/useVoice.ts` - 语音 Hook (已集成 ASR 服务)
- `frontend/src/services/voiceApi.ts` - 原有语音 API 服务

---

**文档完成！**

如有问题，请联系前端开发团队。
