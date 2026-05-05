# VibeTrace

> Vibe-Coding 过程链记录与可视化工具 —— 不再丢失任何 Agent 窗口的对话上下文。

[English](README.md)

VibeTrace 是一款兼容 VS Code 生态的扩展插件，自动记录和可视化你的 AI 辅助编程旅程。每次 AI Agent 完成代码变更后，自动生成一份轻量级元数据记录。VibeTrace 收集这些记录，并以交互式时间线、业务功能图和会话链的形式在编辑器内直接呈现。

## 为什么选择 VibeTrace

试想一下，当你使用 Cursor 编写一个项目，你 vibe 了一周，一个双休过后，当你再次打开项目时，面对数不清的对话窗口和 AI 生成的陌生代码，你一定会觉得一团乱麻。

- 要想知道一个对话窗口到底都进行了什么操作，只能滚动窗口一点点看之前的对话记录。
- 或者对于一个业务功能，你可能会在多个窗口中实现该业务，那么当要复盘某个业务功能的实现方案时，又需要在一堆窗口中进行寻找。
- 或者当你想要分享你的 vibe coding 项目给其他人时，没人会想要看一堆 AI 生成的代码，但是你的整个 vibe coding 流程会是最吸引人的。
- 当切换新的 AI 或者窗口去继续 vibe 项目时，如果 AI 有项目之前编写的完整的流程记录，那么可以帮助 AI 更好的了解项目。

因此，针对以上的场景，VibeTrace 应运而生。

## 页面展示

插件主要提供三大核心功能：

#### 全局时间线 (Global Timeline)

按时间倒序展示所有 AI 对话记录，跨会话、跨模块。点击任意事件查看意图、摘要和影响文件。

#### 业务功能图 (Business Features)

基于 React Flow 的树形图，展示 AI 对话如何映射到业务功能模块（根节点 → 模块 → 意图节点）。支持折叠/展开父节点、点击节点查看详情、拖拽平移。

#### 窗口会话 (Window Sessions)

按会话窗口分组 —— 每个 AI 聊天窗口拥有独立的对话链，完整追溯多轮会话上下文。

插件提供两种可视化，以 Cursor 为例：

- 基于编辑器的可视化

  <img src="./res/1.png" style="zoom:50%;" />

- Web Dashboard

  <img src="./res/2.png" style="zoom:50%;" />

  <img src="./res/3.png" style="zoom:50%;" />

  <img src="./res/4.png" style="zoom:50%;" />

## 主要功能

* **零配置 AI 记录**：由 AI 处理一切，你什么都不需要管理，插件会默默地处理你的每一场对话，构建你的 vibe 足迹。
* **模块自动分类**：AI 自行维护业务功能对话实现，将工作内容智能分类到业务功能模块，不用担心复盘某个业务功能时找不到路。
* **文件影响追踪**：记录每轮操作中创建、修改、删除或引用的所有文件。
* **未解决问题标记**：AI 可标记未完成的工作，供后续跟进。
* **无缝编辑器集成**：点击任何受影响的文件路径即可直接打开。右键点击即可重命名会话或更正模块分类。

## 支持的编辑器

| 编辑器 | 规则文件 |
|--------|----------|
| Cursor | `.cursor/rules/vibetrace-core.mdc` |
| Codex | `AGENTS.md` |
| Trae | `.trae/rules/project_rules.md` |

## 工作原理

1. **初始化** — 点击侧边栏中的「Initialize VibeTrace」按钮，选择你的编辑器，VibeTrace 自动创建规则文件和 `.vibe/events/` 目录。
2. **AI 自动记录** — 注入的规则指示 AI 在每次代码变更对话后，将元数据 JSON 写入 `.vibe/events/`。
3. **可视化呈现** — VibeTrace 监听目录变化，呈现三种实时视图：

## 功能特性

- **零配置 AI 记录** — 规则自动注入，AI 自动处理记录生成
- **模块自动分类** — AI 读取 `.vibe/MODULE_DICT.md` 将工作归类到功能模块
- **文件影响追踪** — 每次对话中创建、修改、删除、引用的文件均被记录
- **遗留问题标记** — AI 可标记未完成的工作供后续跟进
- **编辑器内打开文件** — 点击任意影响文件路径直接打开
- **会话重命名** — 为会话窗口赋予可读的名称
- **模块纠错** — 右键更正错误分类的事件

## 安装

从 [Releases](https://github.com/zpeakj/vibe-trace/releases) 下载 `.vsix` 文件后安装：

```
code --install-extension vibetrace-0.1.0.vsix
```

或在 VS Code 中：`Ctrl+Shift+P` → "Extensions: Install from VSIX..."

## 使用方法

1. 在 Cursor / Codex / Trae 中打开项目
2. 点击活动栏中的 VibeTrace 图标
3. 点击 **「Initialize VibeTrace」** 并选择你的编辑器
4. 开始与 AI 对话 —— 事件自动出现

### 命令列表

| 命令 | 说明 |
|------|------|
| `VibeTrace: Initialize` | 为当前项目初始化 VibeTrace |
| `VibeTrace: Open Dashboard` | 打开完整的 React Webview 仪表盘 |
| `VibeTrace: Refresh Views` | 手动刷新所有树视图 |
| `VibeTrace: Setup AI Rules File` | 重新生成规则文件 |
| `VibeTrace: Edit Module Name` | 更正事件的模块分类 |
| `VibeTrace: Rename Session` | 为会话赋予可读名称 |
| `VibeTrace: Copy Rules to Clipboard` | 复制原始规则到剪贴板（手动配置用） |

## 元数据格式

AI 在 `.vibe/events/` 中生成 JSON 文件：

```json
{
  "id": "20260505-LoginPage-k7m-x9k",
  "session_id": "LoginPage-k7m",
  "module": "Auth",
  "intent": "在登录弹窗中添加微信扫码登录按钮",
  "summary": "新增 WeChatOAuth 组件，接入二维码生成逻辑，更新 auth store",
  "impactFiles": [
    { "path": "src/components/WeChatOAuth.tsx", "action": "create", "description": "微信扫码登录组件" },
    { "path": "src/store/auth.ts", "action": "modify", "description": "新增 wechat_openid 字段" }
  ],
  "unresolved_issues": "后端 OAuth 回调接口尚未配置"
}
```

`timestamp` 字段由 VibeTrace 插件处理文件时自动加盖 —— AI 不应包含此字段。

## 开发

```bash
# 安装依赖
npm install
cd webview-ui && npm install && cd ..

# 编译扩展 + 构建 webview
npm run vscode:prepublish

# 打包
npx vsce package
```

在 VS Code 中按 `F5` 启动扩展开发主机。

### 技术栈

- **扩展端**: TypeScript, VS Code Extension API
- **Webview**: React 19, Vite 6, Tailwind CSS v4
- **流程图**: @xyflow/react, @dagrejs/dagre
- **图标**: lucide-react

## 说明

**目前的插件依旧是相当初期的阶段，仍旧需要很多的优化和提升，如果你觉得该插件有用，或者对该项目感兴趣，我们非常期待你的加入，让我们一起构建出更好的 VibeTrace！**

## 许可证

MIT © [zpeakj](https://github.com/zpeakj)
