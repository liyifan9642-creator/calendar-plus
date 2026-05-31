# VoiceCal 语音日历

> 🎙️ AI 驱动的语音日历工具，让日程管理更高效、更便捷

[![Java](https://img.shields.io/badge/Java-17+-orange.svg)](https://www.java.com/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
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

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (React + TypeScript)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  日历模块    │  │  语音助手    │  │  事件操作    │         │
│  │  (FullCalendar) │ (Web Speech API) │ (CRUD表单)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼───────────────┼───────────────┼───────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Spring Boot 3.2)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              VoiceOrchestrator (核心编排器)            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ ASR识别  │→│ LLM理解  │→│ 日历操作 │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Sherpa  │  │ LangChain│  │ Time-NLP│  │  H2 DB  │       │
│  │ ONNX    │  │ 4j      │  │         │  │         │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **前端框架** | React 18 + TypeScript | 组件化开发 |
| **UI 组件** | Ant Design 5 | 企业级 UI 库 |
| **状态管理** | Zustand | 轻量级状态管理 |
| **构建工具** | Vite 5 | 快速开发构建 |
| **后端框架** | Spring Boot 3.2 | Java 后端服务 |
| **NLU 引擎** | LangChain4j + mimo-v2.5 | 意图识别与实体提取 |
| **语音识别** | Web Speech API / Sherpa-ONNX | 语音转文字 |
| **数据库** | H2 (开发) / MySQL (生产) | 数据持久化 |
| **API 文档** | SpringDoc OpenAPI | 接口文档 |

---

## 🚀 快速开始

### 环境要求

| 组件 | 版本要求 |
|------|----------|
| Java | 17+ |
| Node.js | 18+ |
| Maven | 3.8+ |
| 浏览器 | Chrome 90+ / Edge 90+ (语音功能) |

### 1. 克隆项目

```bash
git clone https://github.com/your-username/voice-calendar.git
cd voice-calendar
```

### 2. 启动后端

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

### 3. 启动前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器 (默认端口 3000)
npm run dev
```

### 4. 访问应用

打开浏览器访问 `http://localhost:3000`

---

## 💬 使用示例

### 语音输入

| 说话内容 | 系统响应 |
|----------|----------|
| "明天下午三点开会" | ✅ 已为您创建 2026年6月1日 的开会 |
| "今天有什么安排" | 📋 2026年5月31日 有2个安排：1. 部门例会 (09:00-10:00) 2. 客户拜访 (14:00-15:00) |
| "把会议改到四点" | ✅ 已为您更新开会 |
| "取消明天的会议" | ⚠️ 确认要删除吗？ |
| "这周有什么安排" | 📋 本周共有5个安排... |

### 文字输入

在语音助手模块点击键盘图标，输入文字：
- "创建一个下周一上午10点的项目评审"
- "删除后天的出差"
- "查看本周的日程"

---

## 📁 项目结构

```
voice-calendar/
├── frontend/                    # 前端 React 项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── calendar/        # 日历组件
│   │   │   ├── voice/           # 语音助手组件
│   │   │   ├── event/           # 事件操作组件
│   │   │   └── layout/          # 布局组件
│   │   ├── stores/              # Zustand 状态管理
│   │   ├── services/            # API 服务层
│   │   ├── hooks/               # 自定义 Hooks
│   │   └── types/               # TypeScript 类型
│   └── package.json
│
├── voicecal-core/               # 核心业务模型
├── voicecal-voice/              # 语音处理模块
├── voicecal-nlu/                # 自然语言理解模块
├── voicecal-service/            # 业务逻辑模块
├── voicecal-ui/                 # REST API 控制器
├── voicecal-app/                # Spring Boot 应用入口
│   └── src/main/resources/
│       └── application.yml      # 应用配置
│
└── models/                      # Sherpa-ONNX 模型文件
```

---

## ⭐ 项目亮点

### 1. 🧠 LLM 驱动的意图理解

不同于传统的关键词匹配，本项目使用 **LangChain4j + 大语言模型** 进行真正的语义理解：

```java
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

### 2. 🔄 智能冲突检测

当新事件与已有事件时间冲突时，系统会：
1. 自动检测冲突
2. 通过 LLM 判断用户真实意图
3. 如有歧义，主动向用户澄清

```
用户："明天下午三点出去玩"
系统："该时间段已有「团队会议」，请问您是想：
      1. 开完会后再出去玩
      2. 取消会议直接出去玩"
```

### 3. 📊 三级语音识别降级

```
优先级 1: Web Speech API (浏览器内置，最快)
    ↓ 失败
优先级 2: 联网 ASR 服务
    ↓ 失败
优先级 3: 本地 Sherpa-ONNX (离线可用)
```

### 4. 💬 对话式交互体验

采用聊天界面设计，支持多轮对话：
- 上下文记忆：记住对话中的实体信息
- 澄清机制：信息不完整时主动询问
- 确认机制：危险操作（删除）需二次确认

### 5. 🗓️ 完整的日历功能

- **月视图**：查看整月事件分布
- **周视图**：查看一周安排
- **日视图**：查看当天详细日程
- **拖拽操作**：拖拽创建/移动事件
- **批量操作**：批量删除/导出事件

### 6. 🔌 接口设计规范

采用 **Message 对象** 统一消息格式：

```typescript
interface Message {
  mode: 'CREATE' | 'DELETE' | 'UPDATE' | 'QUERY';
  status: 'PENDING' | 'CONFIRMED' | 'EXECUTED' | 'NEED_CLARIFICATION';
  content: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  responseText: string;
}
```

---

## 🔧 配置说明

### LLM 配置

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

# 前端测试
cd frontend && npm test

# API 测试
curl -X POST http://localhost:8080/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"inputType":"TEXT","text":"明天下午三点开会"}'
```

---

## 🛣️ 后续规划

- [ ] 支持重复事件（每周/每月/每年）
- [ ] 支持事件提醒推送
- [ ] 集成日历同步（CalDAV/Google Calendar）
- [ ] 支持多语言（英文/中文）
- [ ] 移动端 App（React Native）
- [ ] 离线模式支持

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [LangChain4j](https://github.com/langchain4j/langchain4j) - Java LLM 框架
- [Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx) - 语音识别引擎
- [Ant Design](https://ant.design/) - UI 组件库
- [Spring Boot](https://spring.io/projects/spring-boot) - 后端框架

---

**VoiceCal** - 让日程管理，开口即达 🎙️
