export const zh_cn: Record<string, string> = {
  // ── Common ──────────────────────────────────────────
  'common.events': '{count} 个事件',
  'common.files': '{count} 个文件',
  'common.turns': '{count} 轮对话',
  'common.module': '模块',
  'common.session': '会话',
  'common.time': '时间',
  'common.summary': '摘要',
  'common.openFile': '打开文件',
  'common.ready': '就绪',

  // ── Timeline ────────────────────────────────────────
  'timeline.empty.title': '暂无记录',
  'timeline.empty.desc': '开始与 AI 对话以开始追踪',

  // ── Features ────────────────────────────────────────
  'features.empty.title': '暂无业务功能记录',
  'features.empty.desc': 'AI 将自动将对话归类到功能模块',

  // ── Sessions ────────────────────────────────────────
  'sessions.empty.title': '暂无会话记录',
  'sessions.empty.desc': '在任意 Agent 窗口中开始对话以开始记录',

  // ── Tooltip labels ──────────────────────────────────
  'tooltip.originalPrompt': '**原始提示词：**',
  'tooltip.intent': '**意图：**',
  'tooltip.summary': '**摘要：**',
  'tooltip.module': '**模块：**',
  'tooltip.session': '**会话：**',
  'tooltip.time': '**时间：**',
  'tooltip.unresolved': '\n⚠️ **未解决：**',
  'tooltip.file': '**文件：**',
  'tooltip.action': '**操作：**',
  'tooltip.description': '**描述：**',
  'tooltip.turns': '**轮次：**',
  'tooltip.modulesTouched': '**涉及模块：**',
  'tooltip.timeSpan': '**时间范围：**',

  // ── HTML webview pages ──────────────────────────────
  'html.detail.id': 'ID',
  'html.detail.time': '时间',
  'html.detail.session': '会话',
  'html.detail.module': '模块',
  'html.detail.aiSummary': 'AI 摘要',
  'html.detail.impactFiles': '影响文件（{count}）',
  'html.detail.clickToOpen': '点击打开',
  'html.detail.originalPrompt': '原始提示词',
  'html.detail.unresolved': '未解决问题',

  'html.feature.subtitle': '此功能共 {count} 个事件',
  'html.feature.details': '详情',
  'html.feature.unresolved': '未解决：{text}',

  'html.session.subtitle': '此会话共 {count} 轮对话',
  'html.session.conversationLog': '对话日志',
  'html.session.unresolved': '未解决：{text}',

  // ── Export ──────────────────────────────────────────
  'export.noData': 'VibeTrace：没有可导出的 .vibe 数据。请先初始化 VibeTrace。',
  'export.dialogTitle': '导出 VibeTrace 数据',
  'export.filterLabel': 'ZIP 压缩包',
  'export.success': 'VibeTrace 数据已导出到 {filename}',

  // ── Notifications ───────────────────────────────────
  'notify.noWorkspace': 'VibeTrace：请先打开工作区文件夹。',
  'notify.alreadyInitialized': 'VibeTrace 已在此项目中初始化。',
  'notify.initialized': 'VibeTrace 已为 {editor}（{file}）初始化。AI 将自动记录对话。',
  'notify.noWorkspaceFile': '未打开工作区文件夹。',
  'notify.fileNotFound': '文件未找到：{path}',
  'notify.rulesCreated': 'VibeTrace：已为 {editor} 创建 {file}。',
  'notify.rulesUpdated': 'VibeTrace：{file} 已更新 VibeTrace 记录规则。',
  'notify.rulesUnchanged': 'VibeTrace：{file} 已配置完毕。',
  'notify.rulesCopied': 'VibeTrace：规则已复制到剪贴板。',

  // ── Input boxes ─────────────────────────────────────
  'input.editModule.title': '编辑模块名称',
  'input.editModule.prompt': '请为此事件输入正确的模块名称',
  'input.editModule.emptyError': '模块名称不能为空',
  'input.renameSession.title': '重命名会话',
  'input.renameSession.prompt': '请为此会话窗口输入一个可读的名称',
  'input.renameSession.emptyError': '会话名称不能为空',
  'input.renameSession.unchanged': '名称未更改',
  'input.renameSession.duplicate': '已存在同名会话',

  // ── Editor picker ───────────────────────────────────
  'editor.pickPlaceholder': '选择你的 AI 编辑器以配置规则文件',
  'editor.cursor.label': '$(symbol-class) Cursor',
  'editor.cursor.desc': '.cursor/rules/vibetrace-core.mdc',
  'editor.cursor.detail': 'Cursor 编辑器 (cursor.com)',
  'editor.codex.label': '$(symbol-constructor) Codex',
  'editor.codex.desc': 'AGENTS.md',
  'editor.codex.detail': 'OpenAI Codex CLI / Codex Web',
  'editor.trae.label': '$(symbol-module) Trae',
  'editor.trae.desc': '.trae/rules/project_rules.md',
  'editor.trae.detail': 'Trae 编辑器 (字节跳动)',

  // ── Status bar ──────────────────────────────────────
  'statusbar.text': '$(history) VibeTrace',
  'statusbar.tooltip': 'VibeTrace — 点击刷新',

  // ── Webview panel titles ────────────────────────────
  'panel.event': '事件：{title}',
  'panel.feature': '功能：{name}',
  'panel.session': '会话：{name}',
};
