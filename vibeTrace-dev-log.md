# VibeTrace Dev Log

## 20260506

### 1. Fix

* **Issue**: AI generated JSON files encoded as **UTF-8 with BOM**, causing the extension to fail parsing the file — the conversation record would not appear.

* **Root cause**: The metadata generation prompt did not explicitly specify the encoding format for the generated JSON.

* **Fix**:

  * Added an encoding specification in the prompt:

  ```
  Write the JSON to the following path. The file MUST be encoded as **UTF-8 without BOM**:
  ```

  * Added a fallback in the code — `loadFile` now explicitly detects and strips the UTF-8 BOM

### 2. Feature

* **Issue**: How to silently sync the metadata generation rules prompt when the extension is updated.
* **Solution**: Added a `config.json` to track which editor the project is using. **Each time the project is opened, the extension automatically overwrites the metadata generation rules with the latest version.** If the rules file (e.g. `.cursor/rules/vibetrace-core.mdc`) has been deleted, the extension prompts the user to manually regenerate it.

### 3. Feature

* **Description**: Redesigned the Global Timeline to use a date-grouped drawer/accordion layout, with per-date collapse/expand toggles.

### 4. Feature

* **Description**: Optimized the Business Features flow graph — removed unnecessary interaction handles from certain React Flow nodes, and added support for reconnecting child nodes to a different parent module (with full data persistence).

### 5. Refactor

* **Description**: Restructured pages in the Web Dashboard:
  * **Global Timeline**: Changed to date-grouped drawer-style display.
  * **Business Features**: Improved layout from horizontal to vertical, and added sequence numbering to intent nodes.

### 6. Feature

* **Description**: Enhanced the metadata JSON generation prompt by adding the `original_prompt` field, which records the user's raw input prompt verbatim for full traceability.
