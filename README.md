# VoiceCal 语音日历

Demo视频演示：通过网盘分享的文件：链接: https://pan.baidu.com/s/1ZTC7zFvsGEA79UwwTLuc0w?pwd=h77c 提取码: h77c


(git太大了传不上来SOS）


> 🎙️ AI 驱动的语音日历工具，让日程管理更高效、更便捷

[![Java](https://img.shields.io/badge/Java-17+-orange.svg)](https://www.java.com/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-blueviolet.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 项目简介

VoiceCal 是一款**以语音交互为核心**的日历管理工具。用户可以通过自然语言（语音或文字）来创建、查询、修改、删除日程事件，系统通过 LLM（大语言模型）智能理解用户意图，自动提取时间、地点等信息，大幅降低日程管理的操作成本。

### 核心场景

- 🚗 **驾车时**：语音创建/查询日程，无需手动操作
- 🏃 **运动中**：语音取消/修改安排
- 💼 **会议间隙**：快速语音添加待办事项
- 👴 **老年用户**：无需学习复杂操作，说话即可管理日程

---

## 🏗️ 技术架构

项目采用**三端并行**架构：

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Web 前端        │  │   Android App     │  │   JavaFX 桌面端   │
│  React + TS       │  │  React Native     │  │  JavaFX           │
│  Vite + Ant Design│  │  Expo + TS        │  │                   │
│  状态: Zustand    │  │  状态: Zustand    │  │                   │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Spring Boot 3.2 后端 (Web/桌面端共用)           │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              VoiceOrchestrator (核心编排器)            │       │
│  │  Intent识别 → 完整性检查 → 冲突检测 → 执行操作         │       │
│  └─────────────────────────────────────────────────────┘       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ LLM     │  │ Time-   │  │ Calendar │  │  H2 DB  │           │
│  │ Service │  │ Parser  │  │ Service  │  │         │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               Android App (独立运行，无需后端)                     │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              VoiceOrchestrator (本地编排器)            │       │
│  │  Intent识别 → 完整性检查 → 冲突检测 → 执行操作         │       │
│  └─────────────────────────────────────────────────────┘       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ DeepSeek│  │ Time-   │  │ Calendar │  │ SQLite  │           │
│  │ API     │  │ Parser  │  │ Service  │  │         │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | Web 前端 | Android App | 后端 |
|------|----------|-------------|------|
| **框架** | React 18 | React Native (Expo SDK 56) | Spring Boot 3.2 |
| **语言** | TypeScript | TypeScript | Java 17 |
| **UI** | Ant Design 5 | 自定义主题系统 (Material 3 + Neumorphism) | - |
| **状态管理** | Zustand | Zustand | - |
| **路由** | React Router | React Navigation (Bottom Tabs) | - |
| **构建** | Vite 5 | Expo CLI | Maven |
| **数据库** | - | SQLite (expo-sqlite) | H2 (开发) / MySQL (生产) |
| **NLU** | 后端 API | 本地 LLM + TimeParser | LangChain4j + LLM |
| **语音** | Web Speech API | expo-av (录音) + expo-speech (TTS) | Sherpa-ONNX / Google ASR |
| **通知** | - | expo-notifications (本地推送) | Email |

---

## 🚀 快速开始

### 环境要求

| 组件 | 版本要求 |
|------|----------|
| Java | 17+ |
| Node.js | 18+ |
| Maven | 3.8+ |
| 浏览器 | Chrome 90+ / Edge 90+ (Web 端语音功能) |
| 手机 | Android 设备 + Expo Go App (移动端) |

### 1. 克隆项目

```bash
git clone https://github.com/your-username/voice-calendar.git
cd voice-calendar
```

### 2. 启动后端 (Web/桌面端需要)

```bash
# 编译并安装所有模块
mvn clean install -DskipTests

# 启动后端服务 (默认端口 8080)
mvn spring-boot:run -pl voicecal-app -Dmaven.test.skip=true
```

验证后端启动：
```bash
curl http://localhost:8080/api/voice/health
# 返回: {"status":"UP","activeSessions":0}
```

### 3. 启动 Web 前端

```bash
cd frontend
npm install
npm run dev
```

打开浏览器访问 `http://localhost:3000`

### 4. 启动 Android App

```bash
cd voicecal-mobile
npm install
npx expo start
```

用手机扫描终端中的二维码，或手动输入 Expo 地址连接。

> 💡 手机和电脑需在同一局域网。可连接同一 WiFi 或电脑开热点。

---

## 📱 Android App 功能

### 本地嵌入式架构

Android App 采用**本地嵌入 + 云端 LLM** 架构，无需部署后端服务器：

- **SQLite 本地数据库**：所有日程数据存储在手机本地
- **DeepSeek API**：通过云端 LLM 进行意图识别和语义理解
- **本地时间解析**：中文时间表达式在设备端解析（不依赖网络）

### 页面与功能

| 页面 | 功能 |
|------|------|
| **日历** | 月视图、日期选择、事件列表、事件增删改查、浮动添加按钮 |
| **语音助手** | 对话式界面、文字输入、语音录音、LLM 意图识别、多轮澄清确认 |
| **设置** | LLM API 配置（Base URL / Key / Model）、语音设置（语言 / 语速） |

### VoiceOrchestrator 4 步流水线

```
用户输入 → ① 意图识别 → ② 完整性检查 → ③ 冲突检测 → ④ 执行操作
                                      ↕
                              需要澄清时暂停
                              等待用户确认/取消
```

### 支持的自然语言指令

| 说话内容 | 系统响应 |
|----------|----------|
| "明天下午三点开会" | ✅ 已为您创建 2026年6月3日 的开会 |
| "今天有什么安排" | 📋 查询当天日程列表 |
| "把会议改到四点" | ✅ 已更新事件时间 |
| "取消明天的会议" | ⚠️ 确认要删除吗？ |
| "这周有什么安排" | 📋 查询本周日程 |

### UI 设计

采用 **Modern Flat with Depth** 设计风格：

- 🎨 柔和蓝调渐变（Material Design 3 灵感）
- 📦 圆角卡片 + 扩散软阴影（Neumorphism 风格）
- 💬 聊天气泡带渐变头像和柔和投影
- 📅 日历选中日期带发光指示器
- ⚙️ Material 3 风格圆角方形 FAB

---

## 📁 项目结构

```
voice-calendar/
├── frontend/                        # Web 前端 (React + Vite + Ant Design)
│   └── src/
│       ├── components/
│       │   ├── calendar/            # 日历组件 (MonthCalendar, CalendarDay...)
│       │   ├── voice/               # 语音助手 (VoiceAssistant, MessageBubble...)
│       │   ├── event/               # 事件操作 (EventForm, BatchActions...)
│       │   └── layout/              # 布局 (AppLayout, AppHeader)
│       ├── stores/                  # Zustand (calendar, voice, ui)
│       └── services/                # API 服务层
│
├── voicecal-mobile/                 # Android App (React Native + Expo)
│   └── src/
│       ├── screens/                 # 页面 (Calendar, Voice, Settings, EventDetail)
│       ├── components/              # 组件 (calendar/, voice/, event/)
│       ├── services/                # 服务
│       │   ├── calendar/            # CalendarService (CRUD + 提醒)
│       │   ├── database/            # SQLite (DatabaseService + 4个Repository)
│       │   ├── nlu/                 # LlmService + TimeParserService + NluService
│       │   ├── notification/        # NotificationService (expo-notifications)
│       │   └── voice/               # VoiceOrchestrator + AsrService
│       ├── stores/                  # Zustand (calendar, voice, settings)
│       ├── models/                  # 数据模型 (CalendarEvent, Message, Reminder...)
│       ├── theme/                   # 全局主题 (Colors, Gradients, Shadows...)
│       └── config/                  # AppConfig (LLM 默认配置)
│
├── voicecal-core/                   # 核心业务模型 (Java)
├── voicecal-voice/                  # 语音处理模块 (Java)
├── voicecal-nlu/                    # 自然语言理解 (Java)
├── voicecal-service/                # 业务逻辑层 (Java)
├── voicecal-ui/                     # REST API + JavaFX 桌面端 (Java)
└── voicecal-app/                    # Spring Boot 应用入口 (Java)
```

---

## ⭐ 项目亮点

### 1. 🧠 LLM 驱动的意图理解

使用大语言模型进行真正的语义理解，支持 OpenAI 兼容 API（DeepSeek、GPT 等）：

```json
// 用户说："明天下午三点开会"
// LLM 自动解析为：
{
  "intent": "CREATE",
  "entities": {
    "title": "开会",
    "date": "2026-06-01",
    "startTime": "15:00"
  }
}
```

### 2. 🔄 智能冲突检测与多轮对话

当新事件与已有事件时间冲突时，系统会自动检测并通过 LLM 判断用户真实意图，如有歧义则暂停执行，等待用户确认。

### 3. 📅 中文时间表达式解析

`TimeParserService` 支持 8 种中文时间表达模式：

| 模式 | 示例 |
|------|------|
| 相对日期 | 明天、后天、大后天 |
| N天后 | 三天后、一周后 |
| 星期引用 | 下周三、这周五 |
| 时段词 | 上午、下午、傍晚、晚上 |
| 显式小时 | 3点、15点 |
| 绝对日期 | 2026年3月15日 |
| N小时后 | 两小时后 |
| N分钟后 | 半小时后 |

### 4. 📱 三端统一架构

- **Web 前端**：React + Ant Design，适合桌面浏览器
- **Android App**：React Native + Expo，独立运行无需后端
- **JavaFX 桌面端**：原生桌面应用

### 5. 🎨 Modern Flat with Depth 设计

Android App 采用 Material Design 3 + Neumorphism 融合设计，包含完整主题系统（渐变、阴影、圆角、间距、排版）。

### 6. 💬 对话式交互体验

- 上下文记忆：记住对话中的实体信息
- 澄清机制：信息不完整时主动询问
- 确认机制：危险操作（删除）需二次确认

---

## 🔧 配置说明

### Android App LLM 配置

默认配置在 `voicecal-mobile/src/config/AppConfig.ts`，也可在 App 设置页面修改：

| 配置项 | 默认值 |
|--------|--------|
| API Base URL | `https://api.deepseek.com` |
| API Key | (内置) |
| Model | `deepseek-v4-flash` |
| Temperature | 0.1 |

### 后端 LLM 配置

```yaml
langchain4j:
  open-ai:
    chat-model:
      base-url: https://your-api-url/v1
      api-key: ${LLM_API_KEY}
      model-name: mimo-v2.5
      temperature: 0.3
      max-tokens: 4096
```

### 数据库配置

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:voicedb    # 开发环境
    # url: jdbc:mysql://localhost:3306/voicecal  # 生产环境
```

---

## 📝 API 文档

启动后端后访问：
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

### 核心接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/voice/process` | 处理语音/文本输入 |
| POST | `/api/voice/confirm` | 确认/取消操作 |
| GET | `/api/voice/history` | 获取对话历史 |
| GET | `/api/v1/calendar/events` | 查询事件 |
| POST | `/api/v1/calendar/events` | 创建事件 |
| PUT | `/api/v1/calendar/events/{id}` | 更新事件 |
| DELETE | `/api/v1/calendar/events/{id}` | 删除事件 |

---

## 🧪 测试

```bash
# 后端测试
mvn test

# Web 前端测试
cd frontend && npm test

# API 测试
curl -X POST http://localhost:8080/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"inputType":"TEXT","text":"明天下午三点开会"}'
```

---

## 🛣️ 后续规划

- [x] 移动端 App（React Native + Expo）
- [x] 本地嵌入式架构（SQLite + 云端 LLM）
- [x] 中文时间表达式解析
- [x] Modern Flat with Depth UI 设计
- [ ] 支持重复事件（每周/每月/每年）
- [ ] 集成日历同步（CalDAV / Google Calendar）
- [ ] 云端 ASR 语音识别（Whisper API / Google Speech-to-Text）
- [ ] 支持多语言（英文/中文）
- [ ] 离线模式支持（本地 LLM）

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [LangChain4j](https://github.com/langchain4j/langchain4j) - Java LLM 框架
- [DeepSeek](https://deepseek.com/) - LLM API 服务
- [Expo](https://expo.dev/) - React Native 开发框架
- [Ant Design](https://ant.design/) - Web UI 组件库
- [Spring Boot](https://spring.io/projects/spring-boot) - 后端框架

---

**VoiceCal** - 让日程管理，开口即达 🎙️
