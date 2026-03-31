# StepWise - AI 智能任务规划与执行系统

> 一个基于 LangGraph 和 LangChain 的 AI 智能任务规划与执行系统，支持人类参与的交互式工作流。

## 📋 项目简介

StepWise 是一个个人练习项目，旨在探索和实践 LangGraph 在构建复杂 AI 工作流中的应用。项目实现了完整的"用户输入 → 意图校验 → 计划生成 → 人工审批 → 执行计划 → 结果反馈"的闭环流程。

## ✨ 主要功能

- **智能意图校验**：使用 AI 模型（OpenAI）智能判断用户输入是否与制定计划相关，拒绝非计划类请求
- **AI 计划生成**：基于用户目标自动生成 3-5 步的执行计划，步骤具体、可操作
- **人类参与审批**：在执行前暂停工作流，等待用户审批或拒绝计划
- **流式响应**：使用 SSE（Server-Sent Events）实现实时流式输出，提升用户体验
- **执行备注生成**：为每个执行步骤生成简短的备注说明
- **状态持久化**：使用 `MemorySaver` 保存工作流状态，支持中断后恢复

## 🛠️ 技术栈

### 后端
- **LangChain & LangGraph**：构建状态图和工作流
- **OpenAI API**：使用 GPT 模型进行意图分类和计划生成
- **Express.js**：轻量级 Node.js Web 框架
- **TypeScript**：类型安全的开发体验
- **Zod**：运行时类型验证和 schema 定义
- **SSE**：Server-Sent Events 实现实时流式响应

### 前端
- **Next.js 14+**：React 框架，支持 SSR 和流式渲染
- **React 19**：最新版 React
- **TypeScript**：类型安全
- **Tailwind CSS**：样式框架
- **Lucide React**：图标库
- **自定义 Hook**：`useTypewriter` 实现打字机效果

## 🔥 技术难点

1. **LangGraph 状态管理**
   - 使用 `Annotation` 定义状态结构
   - 实现条件边（Conditional Edges）处理审批流程
   - 使用 `MemorySaver` 实现工作流状态持久化

2. **AI 意图分类**
   - 使用 `withStructuredOutput` 强制模型返回 JSON 格式
   - 通过 Zod Schema 定义严格的输出格式
   - 实现智能意图判断，拒绝非计划类请求

3. **流式响应与打字机效果**
   - 后端使用 `graph.stream()` 实现流式输出
   - 前端使用 `AsyncGenerator` 接收流数据
   - 自定义 `useTypewriter` Hook 实现逐字显示效果

4. **人类参与工作流**
   - 使用 `Command({ resume: { approve } })` 实现工作流恢复
   - 处理中断和恢复的完整状态管理

## 🎯 项目亮点

- **完整的 AI 工作流实践**：从输入到输出的完整闭环
- **类型安全**：前后端均使用 TypeScript，确保类型安全
- **用户体验优化**：流式响应 + 打字机效果，视觉体验更自然
- **错误处理完善**：清晰的错误提示和状态管理
- **代码结构清晰**：节点化设计，易于扩展和维护

## 🚀 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd langgraph_task_manager_agent

# 安装依赖
cd backend && npm install
cd ../client && npm install

# 配置环境变量
cp .env.example .env
# 填写 OPENAI_API_KEY 和 OPENAI_MODEL

# 运行项目
cd backend && npm run dev
cd client && npm run dev
```

## 📚 学习价值

这个项目非常适合想要学习以下技术的开发者：
- LangGraph 构建复杂 AI 工作流
- LangChain 与 OpenAI 集成
- TypeScript 类型安全开发
- 流式响应（SSE）实现
- 人类参与式 AI 应用设计

## 📄 License

ISC
