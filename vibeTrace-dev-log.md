# VibeTrace Dev Log

## 20260523 — v0.3.0

### 1. Feature — i18n Multi-Language Support

- Implemented three-layer i18n architecture covering extension, webview dashboard, and `package.json`.
- Default language auto-follows the VS Code editor display language.
- Added `vibetrace.language` configuration (Settings page) for manual override: Auto / English / 简体中文.
- Added `VibeTrace: Switch Language` command to cycle through language options quickly.

### 2. Feature — Webview Dashboard Theme Switching

- Designed 12 semantic CSS design tokens (`--vt-bg`, `--vt-text`, `--vt-border`, etc.) shared across all dashboard views.
- Dashboard theme auto-follows the VS Code editor theme by default.
- Added `vibetrace.theme` configuration: Auto / Light / Dark.
- Added `VibeTrace: Switch Theme` command to cycle through theme options.
- Inline theme detection script in `index.html` prevents flash of unstyled content (FOUC).

### 3. Feature — Settings Page

- Added `vibetrace.language` and `vibetrace.theme` configuration properties under the VibeTrace settings section.
- Accessible via `File > Preferences > Settings > Extensions > VibeTrace` or the gear icon on the extension sidebar.

### 4. Feature — Export Vibe Data

- Added `vibetrace.export` command accessible from the Global Timeline view title bar.
- Packs the entire `.vibe/` folder into a `.zip` file.
- User can choose the save location via native file dialog; defaults to the workspace root.

### 5. Feature — Collapse / Expand All Buttons

- Added collapse/expand toggle buttons (`$(collapse-all)` icon) to all three sidebar views: Global Timeline, Business Features, and Window Sessions.
- Click once to collapse all groups, click again to expand all.

### 6. Refactor — UI Improvements

- **Business Features**: Compact metadata nodes, now display per-file `description` for each impacted file.
- **Global Timeline & Window Sessions**: Cards now highlight the original prompt, AI-generated summary, and change summary. Impact file lists are collapsed by default (dropdown toggle). File entries show their `description` field. `unresolved_issues` content is now displayed inline in an amber-highlighted box instead of hidden behind a tooltip.
- **Consistency**: Both Global Timeline and Window Sessions now show the same "⚠ Unresolved" label format for unresolved issues.

### 7. Fix — Activity Bar Icon

- Replaced PNG-in-SVG workaround with a real vector SVG using `fill="currentColor"` for proper theme color adaptation.
- Cropped and scaled the viewBox so the icon renders at the correct size matching other activity bar icons.

---

## 20260506 — v0.2.0

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
