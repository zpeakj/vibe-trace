export const en: Record<string, string> = {
  // ── Common ──────────────────────────────────────────
  'common.events': '{count} event(s)',
  'common.files': '{count} file(s)',
  'common.turns': '{count} turn(s)',
  'common.module': 'Module',
  'common.session': 'Session',
  'common.time': 'Time',
  'common.summary': 'Summary',
  'common.openFile': 'Open File',
  'common.ready': 'Ready',

  // ── Timeline ────────────────────────────────────────
  'timeline.empty.title': 'No events recorded yet',
  'timeline.empty.desc': 'Start a conversation with AI to begin tracing',

  // ── Features ────────────────────────────────────────
  'features.empty.title': 'No business features recorded yet',
  'features.empty.desc': 'AI will auto-classify conversations into features',

  // ── Sessions ────────────────────────────────────────
  'sessions.empty.title': 'No sessions recorded yet',
  'sessions.empty.desc': 'Start a conversation in any agent window to begin',

  // ── Tooltip labels ──────────────────────────────────
  'tooltip.originalPrompt': '**Original Prompt:**',
  'tooltip.intent': '**Intent:**',
  'tooltip.summary': '**Summary:**',
  'tooltip.module': '**Module:**',
  'tooltip.session': '**Session:**',
  'tooltip.time': '**Time:**',
  'tooltip.unresolved': '\n⚠️ **Unresolved:**',
  'tooltip.file': '**File:**',
  'tooltip.action': '**Action:**',
  'tooltip.description': '**Description:**',
  'tooltip.turns': '**Turns:**',
  'tooltip.modulesTouched': '**Modules touched:**',
  'tooltip.timeSpan': '**Time span:**',

  // ── HTML webview pages ──────────────────────────────
  'html.detail.id': 'ID',
  'html.detail.time': 'Time',
  'html.detail.session': 'Session',
  'html.detail.module': 'Module',
  'html.detail.aiSummary': 'AI Summary',
  'html.detail.impactFiles': 'Impact Files ({count})',
  'html.detail.clickToOpen': 'Click to open',
  'html.detail.originalPrompt': 'Original Prompt',
  'html.detail.unresolved': 'Unresolved Issues',

  'html.feature.subtitle': '{count} event(s) in this feature',
  'html.feature.details': 'Details',
  'html.feature.unresolved': 'Unresolved: {text}',

  'html.session.subtitle': '{count} conversation turn(s) in this session',
  'html.session.conversationLog': 'Conversation Log',
  'html.session.unresolved': 'Unresolved: {text}',

  // ── Export ──────────────────────────────────────────
  'export.noData': 'VibeTrace: No .vibe data to export. Initialize VibeTrace first.',
  'export.dialogTitle': 'Export VibeTrace Data',
  'export.filterLabel': 'ZIP Archive',
  'export.success': 'VibeTrace data exported to {filename}',

  // ── Notifications ───────────────────────────────────
  'notify.noWorkspace': 'VibeTrace: Open a workspace folder first.',
  'notify.alreadyInitialized': 'VibeTrace is already initialized for this project.',
  'notify.initialized': 'VibeTrace initialized for {editor} ({file}). AI will now auto-record conversations.',
  'notify.noWorkspaceFile': 'No workspace folder open.',
  'notify.fileNotFound': 'File not found: {path}',
  'notify.rulesCreated': 'VibeTrace: {file} created for {editor}.',
  'notify.rulesUpdated': 'VibeTrace: {file} updated with VibeTrace recording rules.',
  'notify.rulesUnchanged': 'VibeTrace: {file} is already configured.',
  'notify.rulesCopied': 'VibeTrace: Rules copied to clipboard.',

  // ── Input boxes ─────────────────────────────────────
  'input.editModule.title': 'Edit Module Name',
  'input.editModule.prompt': 'Enter the correct module name for this event',
  'input.editModule.emptyError': 'Module name cannot be empty',
  'input.renameSession.title': 'Rename Session',
  'input.renameSession.prompt': 'Enter a readable name for this session window',
  'input.renameSession.emptyError': 'Session name cannot be empty',
  'input.renameSession.unchanged': 'Name is unchanged',
  'input.renameSession.duplicate': 'A session with this name already exists',

  // ── Editor picker ───────────────────────────────────
  'editor.pickPlaceholder': 'Select your AI editor to configure rules file',
  'editor.cursor.label': '$(symbol-class) Cursor',
  'editor.cursor.desc': '.cursor/rules/vibetrace-core.mdc',
  'editor.cursor.detail': 'Cursor editor (cursor.com)',
  'editor.codex.label': '$(symbol-constructor) Codex',
  'editor.codex.desc': 'AGENTS.md',
  'editor.codex.detail': 'OpenAI Codex CLI / Codex Web',
  'editor.trae.label': '$(symbol-module) Trae',
  'editor.trae.desc': '.trae/rules/project_rules.md',
  'editor.trae.detail': 'Trae editor (字节跳动)',

  // ── Status bar ──────────────────────────────────────
  'statusbar.text': '$(history) VibeTrace',
  'statusbar.tooltip': 'VibeTrace — Click to refresh',

  // ── Webview panel titles ────────────────────────────
  'panel.event': 'Event: {title}',
  'panel.feature': 'Feature: {name}',
  'panel.session': 'Session: {name}',
};
