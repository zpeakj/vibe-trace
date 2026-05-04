import { VibeEvent } from '../types';

/**
 * Generates HTML content for Webview panels.
 * Three modes: event detail, feature flowchart, session chain.
 */

const STYLE = `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, system-ui);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 16px;
  }
  h1 { font-size: 1.3em; margin-bottom: 8px; }
  h2 { font-size: 1.1em; margin: 16px 0 8px; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 4px; }
  .meta { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin-bottom: 16px; }
  .meta dt { font-weight: 600; color: var(--vscode-descriptionForeground); }
  .meta dd { }
  .summary-box {
    background: var(--vscode-textBlockQuote-background);
    border-left: 3px solid var(--vscode-textBlockQuote-border);
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: 0 4px 4px 0;
  }
  .unresolved {
    background: var(--vscode-inputValidation-warningBackground);
    border: 1px solid var(--vscode-inputValidation-warningBorder);
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: 4px;
  }
  .unresolved h3 { font-size: 1em; color: var(--vscode-inputValidation-warningForeground); }
  .file-list { list-style: none; }
  .file-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; margin: 2px 0;
    border-radius: 4px; cursor: pointer;
  }
  .file-item:hover { background: var(--vscode-list-hoverBackground); }
  .badge {
    display: inline-block; padding: 1px 6px; border-radius: 3px;
    font-size: 0.85em; font-weight: 600; text-transform: uppercase;
  }
  .badge-create { background: #2ea04344; color: #3fb950; }
  .badge-modify { background: #d2992244; color: #d29922; }
  .badge-delete { background: #f8514944; color: #f85149; }
  .badge-read { background: #58a6ff44; color: #58a6ff; }
  .flowchart { margin: 16px 0; overflow-x: auto; }
  .node rect { fill: var(--vscode-editor-background); stroke: var(--vscode-widget-border); stroke-width: 1.5; rx: 6; }
  .node text { fill: var(--vscode-foreground); font-size: 11px; }
  .edge line { stroke: var(--vscode-widget-border); stroke-width: 1; }
  .edge polygon { fill: var(--vscode-widget-border); }
</style>`;

const SCRIPT = `
<script>
  const vscode = acquireVsCodeApi();
  function openFile(path) {
    vscode.postMessage({ command: 'openFile', path: path });
  }
</script>`;

function badgeClass(action: string): string {
  switch (action) {
    case 'create': return 'badge-create';
    case 'modify': return 'badge-modify';
    case 'delete': return 'badge-delete';
    default: return 'badge-read';
  }
}

function formatDate(ts: string): string {
  try { const d = new Date(ts); if (!isNaN(d.getTime())) return d.toLocaleString(undefined, { hour12: false }); } catch(e) {}
  return ts.length > 25 ? ts.slice(0,25)+'…' : ts;
}

// ── Event detail page ─────────────────────────────────

export function eventDetailHtml(event: VibeEvent): string {
  const files = event.impactFiles.map(f => `
    <li class="file-item" onclick="openFile('${escapeAttr(f.path)}')" title="Click to open">
      <span class="badge ${badgeClass(f.action)}">${f.action}</span>
      <span><code>${escapeHtml(f.path)}</code></span>
      <span style="color:var(--vscode-descriptionForeground)">${escapeHtml(f.description)}</span>
    </li>
  `).join('');

  const unresolved = event.unresolved_issues ? `
    <div class="unresolved">
      <h3>Unresolved Issues</h3>
      <p>${escapeHtml(event.unresolved_issues)}</p>
    </div>
  ` : '';

  return `<!DOCTYPE html><html><head>${STYLE}</head><body>
    <h1>${escapeHtml(event.intent)}</h1>

    <dl class="meta">
      <dt>ID</dt><dd><code>${escapeHtml(event.id)}</code></dd>
      <dt>Time</dt><dd>${formatDate(event.timestamp)}</dd>
      <dt>Session</dt><dd>${escapeHtml(event.session_id)}</dd>
      <dt>Module</dt><dd><strong>${escapeHtml(event.module)}</strong></dd>
    </dl>

    <div class="summary-box">
      <strong>AI Summary</strong>
      <p>${escapeHtml(event.summary)}</p>
    </div>

    ${unresolved}

    <h2>Impact Files (${event.impactFiles.length})</h2>
    <ul class="file-list">${files}</ul>

    ${SCRIPT}
  </body></html>`;
}

// ── Feature flowchart page ────────────────────────────

export function featureFlowHtml(module: string, events: VibeEvent[]): string {
  // Sort chronologically (oldest first for flowchart reading)
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const nodeW = 240;
  const nodeH = 60;
  const gapY = 24;
  const startX = 40;
  const paddingX = 40;

  const totalH = sorted.length * (nodeH + gapY) + 40;
  const svgW = nodeW + paddingX * 2;

  const nodes = sorted.map((e, i) => {
    const y = 30 + i * (nodeH + gapY);
    const hasIssue = !!e.unresolved_issues;
    const color = hasIssue ? '#d29922' : 'var(--vscode-widget-border)';
    return { event: e, x: startX, y, color };
  });

  let svgNodes = '';
  let svgEdges = '';

  nodes.forEach((n, i) => {
    svgNodes += `
      <g class="node">
        <rect x="${n.x}" y="${n.y}" width="${nodeW}" height="${nodeH}" stroke="${n.color}" />
        <text x="${n.x + 8}" y="${n.y + 18}" font-weight="bold">${escapeHtml(truncate(n.event.intent, 35))}</text>
        <text x="${n.x + 8}" y="${n.y + 36}" fill="var(--vscode-descriptionForeground)" font-size="10">
          ${formatDate(n.event.timestamp)} · ${escapeHtml(n.event.session_id)}
        </text>
      </g>`;

    if (i < nodes.length - 1) {
      const nextY = nodes[i + 1].y;
      const arrowX = n.x + nodeW / 2;
      svgEdges += `
        <g class="edge">
          <line x1="${arrowX}" y1="${n.y + nodeH}" x2="${arrowX}" y2="${nextY - 3}" />
          <polygon points="${arrowX - 4},${nextY - 6} ${arrowX + 4},${nextY - 6} ${arrowX},${nextY - 1}" />
        </g>`;
    }
  });

  return `<!DOCTYPE html><html><head>${STYLE}</head><body>
    <h1>${escapeHtml(module)}</h1>
    <p style="color:var(--vscode-descriptionForeground)">${events.length} event${events.length > 1 ? 's' : ''} in this feature</p>

    <div class="flowchart">
      <svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}">
        ${svgEdges}
        ${svgNodes}
      </svg>
    </div>

    <h2>Details</h2>
    ${sorted.map(e => `
      <div class="summary-box" style="margin:8px 0;">
        <strong>${escapeHtml(e.intent)}</strong>
        <span style="color:var(--vscode-descriptionForeground);margin-left:8px;">${formatDate(e.timestamp)}</span>
        <p style="margin-top:4px;">${escapeHtml(e.summary)}</p>
        ${e.unresolved_issues ? `<p style="color:var(--vscode-inputValidation-warningForeground);margin-top:4px;">Unresolved: ${escapeHtml(e.unresolved_issues)}</p>` : ''}
      </div>
    `).join('')}

    ${SCRIPT}
  </body></html>`;
}

// ── Session chain page ────────────────────────────────

export function sessionChainHtml(sessionId: string, events: VibeEvent[]): string {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const nodeW = 260;
  const nodeH = 70;
  const gapY = 20;
  const startX = 40;
  const paddingX = 40;

  const totalH = sorted.length * (nodeH + gapY) + 40;
  const svgW = nodeW + paddingX * 2;

  const nodes = sorted.map((e, i) => {
    const y = 30 + i * (nodeH + gapY);
    return { event: e, x: startX, y };
  });

  let svgNodes = '';
  let svgEdges = '';

  nodes.forEach((n, i) => {
    const modColor = stringToColor(n.event.module);
    svgNodes += `
      <g class="node">
        <rect x="${n.x}" y="${n.y}" width="${nodeW}" height="${nodeH}" stroke="${modColor}" stroke-width="2" />
        <rect x="${n.x}" y="${n.y}" width="${nodeW}" height="6" fill="${modColor}" rx="2" />
        <text x="${n.x + 8}" y="${n.y + 22}" font-weight="bold" font-size="11">${escapeHtml(truncate(n.event.intent, 38))}</text>
        <text x="${n.x + 8}" y="${n.y + 38}" fill="var(--vscode-descriptionForeground)" font-size="10">
          ${escapeHtml(n.event.module)} · ${n.event.impactFiles.length} file${n.event.impactFiles.length !== 1 ? 's' : ''}
        </text>
        <text x="${n.x + 8}" y="${n.y + 52}" fill="var(--vscode-descriptionForeground)" font-size="10">
          ${formatDate(n.event.timestamp)}
        </text>
      </g>`;

    if (i < nodes.length - 1) {
      const nextY = nodes[i + 1].y;
      const arrowX = n.x + nodeW / 2;
      svgEdges += `
        <g class="edge">
          <line x1="${arrowX}" y1="${n.y + nodeH}" x2="${arrowX}" y2="${nextY - 3}" />
          <polygon points="${arrowX - 4},${nextY - 6} ${arrowX + 4},${nextY - 6} ${arrowX},${nextY - 1}" />
        </g>`;
    }
  });

  return `<!DOCTYPE html><html><head>${STYLE}</head><body>
    <h1>${escapeHtml(sessionId)}</h1>
    <p style="color:var(--vscode-descriptionForeground)">${events.length} conversation turn${events.length > 1 ? 's' : ''} in this session</p>

    <div class="flowchart">
      <svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}">
        ${svgEdges}
        ${svgNodes}
      </svg>
    </div>

    <h2>Conversation Log</h2>
    ${sorted.map((e, i) => `
      <div class="summary-box" style="margin:8px 0;">
        <strong>#${i + 1} · ${escapeHtml(e.intent)}</strong>
        <span style="color:var(--vscode-descriptionForeground);margin-left:8px;">[${escapeHtml(e.module)}]</span>
        <p style="margin-top:4px;">${escapeHtml(e.summary)}</p>
        ${e.unresolved_issues ? `<p style="color:var(--vscode-inputValidation-warningForeground);margin-top:4px;">Unresolved: ${escapeHtml(e.unresolved_issues)}</p>` : ''}
      </div>
    `).join('')}

    ${SCRIPT}
  </body></html>`;
}

// ── Helpers ───────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** Generate a consistent color from a string (for module color coding) */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 50%)`;
}
