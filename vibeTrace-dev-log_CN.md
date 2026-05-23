# VibeTrace 开发日志

## 20260523 — v0.3.0

### 1. Feature — i18n 多语言支持

- 实现了三层 i18n 架构，覆盖扩展、Webview Dashboard 和 `package.json`。
- 默认语言自动跟随 VS Code 编辑器显示语言。
- 在设置页面添加 `vibetrace.language` 配置项，支持手动切换：自动 / English / 简体中文。
- 添加 `VibeTrace: 切换语言` 命令，可快速循环切换语言选项。

### 2. Feature — Webview Dashboard 主题切换

- 设计了 12 个语义化 CSS 设计 Token（`--vt-bg`、`--vt-text`、`--vt-border` 等），统一应用于所有 Dashboard 视图。
- Dashboard 主题默认自动跟随 VS Code 编辑器主题。
- 添加 `vibetrace.theme` 配置项：自动 / 浅色 / 深色。
- 添加 `VibeTrace: 切换主题` 命令，可快速循环切换主题选项。
- 在 `index.html` 中添加内联主题检测脚本，防止页面加载时的颜色闪烁（FOUC）。

### 3. Feature — 设置页面

- 在 VibeTrace 扩展设置下添加了 `vibetrace.language` 和 `vibetrace.theme` 两个配置项。
- 可通过 `文件 > 首选项 > 设置 > 扩展 > VibeTrace` 或扩展侧边栏的齿轮图标访问。

### 4. Feature — 导出 Vibe 数据

- 在 Global Timeline 视图标题栏添加 `vibetrace.export` 导出按钮。
- 将整个 `.vibe/` 文件夹打包为 `.zip` 文件。
- 用户可通过原生文件对话框选择保存位置，默认保存在工作区根目录。

### 5. Feature — 全部折叠 / 展开按钮

- 为三个侧边栏视图（Global Timeline、Business Features、Window Sessions）添加了折叠/展开切换按钮。
- 点击一次全部折叠，再点击一次全部展开。

### 6. Refactor — UI 优化

- **Business Features**：元数据节点显示更紧凑，每个改动文件显示 `description` 描述信息。
- **Global Timeline 和 Window Sessions**：卡片重点展示原始提示词、AI 总结提示词、本次改动总结。文件改动列表默认折叠（点击展开）。文件条目显示 `description` 字段描述。`unresolved_issues` 内容现在以 amber 高亮框直接展示在卡片正文中，而非藏在 tooltip 里。
- **一致性优化**：两个视图的未解决问题标记统一为 "⚠ Unresolved / 未解决" 文字 + 图标格式。

### 7. Fix — 活动栏图标修复

- 将 PNG-in-SVG 伪装方案替换为真正的矢量 SVG，使用 `fill="currentColor"` 正确适配主题色。
- 裁剪并缩放 viewBox，使图标大小与其他活动栏图标一致。

---

## 20260506 — v0.2.0

### 1. Fix

* 描述：AI 生成了编码为 **UTF-8 with BOM** 的 JSON，导致扩展读取 JSON 时无法处理导致不显示该对话记录

* 原因：提示词中没有明确指定生成的 JSON 的编码格式

* 修复：

  * 在提示词中对编码格式进行了规范。

  ```
  Write the JSON to the following path. The file MUST be encoded as **UTF-8 without BOM**:
  ```

  - 同时进行了兜底策略，`loadFile` 中显式检测并去除 UTF-8 BOM

### 2. Feature

* 描述：扩展元数据生成模板提示词规则更新后，用户如何进行无感知同步
* 方案：添加了 `config.json` ，用来标识目前项目所处的编辑器。**每次打开项目时，扩展会自动重写元数据生成提示词规则**。如果删除了提示词规则，例如 `.cursor\rules\vibetrace-core.mdc`，则扩展会提示用户手动重新生成提示词规则。

### 3. Feature

* 描述：对于全局流程链，设计为以日期为分割的抽屉式，某一日期下节点的折叠

### 4. Feature

* 描述：优化业务功能流程链，删除了React Flow部分节点的无用交互，添加支持子节点连线修改其父节点

### 5. Refactor

- 描述：重构了 Web Dashboard 中的页面
  - Global Timeline：修改为以日期为划分的抽屉式展示
  - Business Timeline：优化了业务功能流程链的显示，从横向变为纵向，并且添加序号

### 6. Feature

- 描述：优化元数据 JSON 生成的提示词，添加了 `original_prompt` 用来记录用户原始输入的提示词。
