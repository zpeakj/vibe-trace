# VibeTrace Dev Log

## 20260506

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