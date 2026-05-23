import { useState, useMemo, useCallback, memo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
  Handle,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { VibeEvent, openFile, updateEventModule } from '../api';
import { filterBusinessFiles } from '../utils/filter';
import { actionBadge, actionDot } from '../utils/theme';
import { cn } from '../utils/cn';
import { t } from '../i18n';
import dagre from '@dagrejs/dagre';
import {
  Package,
  FileCode,
  Clock,
  FolderGit2,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

// ── Dagre auto-layout ──────────────────────────────────

const NODE_WIDTH = 230;
const NODE_HEIGHT = 70;
const MODULE_WIDTH = 200;
const MODULE_HEIGHT = 70;
const ROOT_WIDTH = 220;
const ROOT_HEIGHT = 80;

function layoutTree(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  const structuralIds = new Set(
    nodes.filter((n) => n.type !== 'intentNode').map((n) => n.id)
  );

  for (const node of nodes) {
    if (!structuralIds.has(node.id)) continue;
    let w = NODE_WIDTH;
    let h = NODE_HEIGHT;
    if (node.type === 'rootNode') {
      w = ROOT_WIDTH;
      h = ROOT_HEIGHT;
    } else if (node.type === 'moduleNode') {
      w = MODULE_WIDTH;
      h = MODULE_HEIGHT;
    }
    g.setNode(node.id, { width: w, height: h });
  }

  for (const edge of edges) {
    if (structuralIds.has(edge.source) && structuralIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) {
      return node;
    }
    return {
      ...node,
      position: {
        x: pos.x - (node.type === 'rootNode' ? ROOT_WIDTH : MODULE_WIDTH) / 2,
        y: pos.y - (node.type === 'rootNode' ? ROOT_HEIGHT : MODULE_HEIGHT) / 2,
      },
    };
  });
}

// ── Custom nodes with Handle anchors ────────────────────

const RootNode = memo(function RootNode({ data }: NodeProps) {
  const hasChildren = data.hasChildren as boolean;
  const isCollapsed = data.isCollapsed as boolean;
  const onToggleCollapse = data.onToggleCollapse as (() => void) | undefined;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 shadow-lg shadow-emerald-500/5 backdrop-blur-sm text-center min-w-[200px] relative">
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-emerald-800" />
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(); }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-vt-surface-alt border border-vt-border-alt hover:bg-vt-border-alt flex items-center justify-center transition-colors"
          title={isCollapsed ? t('features.expandModules') : t('features.collapseModules')}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </button>
      )}
      <span className="text-base font-bold text-emerald-300">
        {data.label as string}
      </span>
      <p className="text-xs text-emerald-500/60 mt-1">
        {data.subtitle as string}
      </p>
    </div>
  );
});

const ModuleNode = memo(function ModuleNode({ data }: NodeProps) {
  const hasChildren = data.hasChildren as boolean;
  const isCollapsed = data.isCollapsed as boolean;
  const onToggleCollapse = data.onToggleCollapse as (() => void) | undefined;

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/8 px-5 py-3 shadow-lg backdrop-blur-sm min-w-[180px] text-center relative">
      <Handle type="target" position={Position.Top} isConnectable={false} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-blue-800" />
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(); }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-vt-surface-alt border border-vt-border-alt hover:bg-vt-border-alt flex items-center justify-center transition-colors"
          title={isCollapsed ? t('features.expandEvents') : t('features.collapseEvents')}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
          )}
        </button>
      )}
      <div className="flex items-center justify-center gap-2">
        <Package className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-semibold text-sm text-blue-200">
          {data.label as string}
        </span>
      </div>
      <p className="text-[11px] text-blue-400/50 mt-1">
        {data.subtitle as string}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-blue-800" />
    </div>
  );
});

const CompactIntentNode = memo(function CompactIntentNode({ data }: NodeProps) {
  const event = data.event as VibeEvent;
  const fileCount = event.impactFiles.length;
  const seq = data.seq as number | undefined;
  const baseLabel = (data.label as string).replace(/^#\d+\s+/, '');

  return (
    <div
      className={cn(
        'rounded-lg border border-vt-border-alt/50 bg-vt-bg-alt/90 px-3 py-2.5 shadow-lg backdrop-blur-sm',
        'w-[230px] cursor-pointer transition-all duration-200',
        'hover:border-emerald-500/50 hover:scale-105 hover:shadow-emerald-500/5'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-vt-text-muted !w-3 !h-3 !border-2 !border-vt-border-alt" />
      <div className="flex items-center gap-1.5">
        {seq !== undefined && (
          <span className="text-[11px] font-bold text-cyan-400 shrink-0">#{seq}</span>
        )}
        <FileCode className="w-3.5 h-3.5 text-vt-text-muted shrink-0" />
        <span className="font-semibold text-xs text-vt-text truncate leading-tight">
          {baseLabel}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[10px] text-vt-text-muted bg-vt-surface/70 px-1.5 py-0.5 rounded">
          {t('features.filesChanged', { count: fileCount })}
        </span>
        {event.unresolved_issues && (
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
        )}
      </div>
    </div>
  );
});

const nodeTypes = {
  rootNode: RootNode,
  moduleNode: ModuleNode,
  intentNode: CompactIntentNode,
};

// ── Data transform ──────────────────────────────────────

function eventsToTree(events: VibeEvent[], projectName: string): { nodes: Node[]; edges: Edge[] } {
  const rawNodes: Node[] = [];
  const edges: Edge[] = [];

  if (events.length === 0) {
    rawNodes.push({
      id: 'root',
      type: 'rootNode',
      position: { x: 0, y: 0 },
      data: { label: projectName, subtitle: t('features.empty.subtitle') },
    });
    return { nodes: rawNodes, edges };
  }

  rawNodes.push({
    id: 'root',
    type: 'rootNode',
    position: { x: 0, y: 0 },
    data: {
      label: projectName,
      subtitle: t('features.subtitle', { count: events.length }),
    },
  });

  const moduleMap = new Map<string, VibeEvent[]>();
  for (const e of events) {
    const list = moduleMap.get(e.module) ?? [];
    list.push(e);
    moduleMap.set(e.module, list);
  }

  const moduleNames = Array.from(moduleMap.keys()).sort();

  moduleNames.forEach((mod) => {
    const modEvents = moduleMap.get(mod)!;
    const modId = `module-${mod}`;

    rawNodes.push({
      id: modId,
      type: 'moduleNode',
      position: { x: 0, y: 0 },
      data: {
        label: mod,
        subtitle: t('features.moduleSubtitle', { count: modEvents.length }),
      },
    });

    edges.push({
      id: `edge-root-${modId}`,
      source: 'root',
      target: modId,
    });

    const sortedEvents = [...modEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedEvents.forEach((ev) => {
      const evId = ev.id;

      rawNodes.push({
        id: evId,
        type: 'intentNode',
        position: { x: 0, y: 0 },
        data: {
          label:
            ev.intent.length > 48 ? ev.intent.slice(0, 48) + '…' : ev.intent,
          event: ev,
        },
      });

      edges.push({
        id: `edge-${modId}-${evId}`,
        source: modId,
        target: evId,
      });
    });
  });

  const parentIds = new Set(edges.map((e) => e.source));
  for (const node of rawNodes) {
    if (parentIds.has(node.id)) {
      node.data = { ...node.data, hasChildren: true };
    }
  }

  const nodes = layoutTree(rawNodes, edges);

  const moduleIntentMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.source.startsWith('module-')) {
      const list = moduleIntentMap.get(edge.source) ?? [];
      list.push(edge.target);
      moduleIntentMap.set(edge.source, list);
    }
  }

  const nodeLookup = new Map(nodes.map((n) => [n.id, n]));

  for (const [moduleId, intentIds] of moduleIntentMap) {
    const moduleNode = nodeLookup.get(moduleId);
    if (!moduleNode) continue;

    const mx = moduleNode.position.x;
    const my = moduleNode.position.y;
    const intentX = mx + (MODULE_WIDTH - NODE_WIDTH) / 2;

    intentIds.forEach((intentId, idx) => {
      const node = nodeLookup.get(intentId);
      if (!node) return;

      node.position = {
        x: intentX,
        y: my + MODULE_HEIGHT + 30 + idx * (NODE_HEIGHT + 30),
      };

      const baseLabel = (node.data.label as string).replace(/^#\d+\s+/, '');
      node.data = { ...node.data, label: `#${idx + 1} ${baseLabel}`, seq: idx + 1, seqTotal: intentIds.length };
    });
  }

  return { nodes, edges };
}

// ── Side drawer ────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 25);
    return d.toLocaleString(undefined, {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 25);
  }
}

interface DrawerProps {
  event: VibeEvent;
  onClose: () => void;
}

function EventDrawer({ event, onClose }: DrawerProps) {
  const files = filterBusinessFiles(event.impactFiles);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[420px] bg-vt-bg border-l border-vt-border shadow-2xl z-50 flex flex-col animate-slide-in">
      <div className="flex items-center justify-between px-5 py-4 border-b border-vt-border shrink-0">
        <h3 className="font-bold text-sm text-vt-text truncate pr-2">
          {t('features.drawer.title')}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-vt-surface text-vt-text-muted hover:text-vt-text-alt transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <h2 className="font-bold text-base text-vt-text leading-snug">
            {event.intent}
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
              <FolderGit2 className="w-3 h-3" />
              {event.module}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-vt-text-muted">
              <Clock className="w-3 h-3" />
              {formatTime(event.timestamp)}
            </span>
          </div>
        </div>

        {event.original_prompt && (
          <div>
            <h4 className="text-[11px] font-semibold text-vt-text-muted uppercase tracking-wider mb-1.5">
              {t('features.drawer.originalPrompt')}
            </h4>
            <p className="text-sm text-vt-text-alt/80 italic leading-relaxed">
              &ldquo;{event.original_prompt}&rdquo;
            </p>
          </div>
        )}
        <div>
          <h4 className="text-[11px] font-semibold text-vt-text-muted uppercase tracking-wider mb-1.5">
            {t('features.drawer.summary')}
          </h4>
          <p className="text-sm text-vt-text-alt leading-relaxed">
            {event.summary}
          </p>
        </div>

        {files.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-vt-text-muted uppercase tracking-wider mb-2">
              {t('features.drawer.impactFiles', { count: files.length })}
            </h4>
            <div className="space-y-1.5">
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => openFile(f.path)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-vt-surface/60 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        actionDot(f.action)
                      )}
                    />
                    <FileCode className="w-3.5 h-3.5 text-vt-text-subtle group-hover:text-vt-text-alt shrink-0" />
                    <code className="text-xs text-vt-text-alt group-hover:text-vt-text font-mono truncate">
                      {f.path}
                    </code>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border font-mono ml-auto shrink-0',
                        actionBadge(f.action)
                      )}
                    >
                      {f.action}
                    </span>
                  </div>
                  {f.description && (
                    <p className="text-[11px] text-vt-text-muted mt-1 ml-7 leading-relaxed">
                      {f.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {event.unresolved_issues && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-400">
                {t('features.drawer.unresolved')}
              </span>
            </div>
            <p className="text-xs text-amber-500/80 leading-relaxed">
              {event.unresolved_issues}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────

interface Props {
  events: VibeEvent[];
  projectName: string;
}

export function BusinessTreeView({ events, projectName }: Props) {
  const tree = useMemo(() => eventsToTree(events, projectName), [events, projectName]);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<VibeEvent | null>(null);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else { next.add(id); }
      return next;
    });
  }, []);

  const { visibleNodes, visibleEdges } = useMemo(() => {
    const childMap = new Map<string, string[]>();
    for (const e of tree.edges) {
      const list = childMap.get(e.source) ?? [];
      list.push(e.target);
      childMap.set(e.source, list);
    }

    const hidden = new Set<string>();
    function collectHidden(id: string) {
      const children = childMap.get(id);
      if (!children) return;
      for (const child of children) {
        hidden.add(child);
        collectHidden(child);
      }
    }
    for (const id of collapsedIds) {
      collectHidden(id);
    }

    const visibleNodes = tree.nodes
      .filter((n) => !hidden.has(n.id))
      .map((n) => ({
        ...n,
        data: {
          ...n.data,
          ...(childMap.has(n.id) ? {
            hasChildren: true,
            isCollapsed: collapsedIds.has(n.id),
            onToggleCollapse: () => toggleCollapse(n.id),
          } : {}),
        },
      }));

    const visibleEdges = tree.edges.filter(
      (e) => !hidden.has(e.source) && !hidden.has(e.target)
    );

    return { visibleNodes, visibleEdges };
  }, [tree, collapsedIds, toggleCollapse]);

  const [nodes, setNodes] = useState<Node[]>(visibleNodes);
  const [edges, setEdges] = useState<Edge[]>(visibleEdges);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const dataKey = useMemo(() => {
    if (events.length === 0) return 'empty';
    return `${events.map((e) => `${e.id}:${e.module}`).sort().join('|')}--${[...collapsedIds].sort().join(',')}--r${refreshCounter}`;
  }, [events, collapsedIds, refreshCounter]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const ev = node.data?.event as VibeEvent | undefined;
    if (ev) {
      setSelectedEvent(ev);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const onConnect = useCallback((params: Connection) => {
    const sourceIsModule = params.source.startsWith('module-');
    const eventId = sourceIsModule ? params.target : params.source;
    const moduleId = sourceIsModule ? params.source : params.target;
    const newModule = moduleId.replace('module-', '');
    updateEventModule(eventId, newModule);
  }, []);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-vt-text-muted">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-vt-empty-icon" />
          <p className="text-lg font-medium">{t('features.empty.title')}</p>
          <p className="text-sm mt-1">{t('features.empty.desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-vt-bg relative">
      <ReactFlow
        key={dataKey}
        defaultNodes={visibleNodes}
        defaultEdges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'var(--vt-text-muted)', strokeWidth: 2.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'var(--vt-text-muted)',
            width: 20,
            height: 20,
          },
        }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--vt-border)" gap={24} size={0.5} />
        <Controls position="bottom-right">
          <button
            onClick={() => setRefreshCounter((c) => c + 1)}
            className="react-flow__controls-button"
            title={t('features.refresh')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </Controls>
        <MiniMap
          style={{ backgroundColor: 'var(--vt-bg-alt)' }}
          maskColor="var(--vt-bg)"
          nodeColor={(n) => {
            const t = n.type;
            if (t === 'rootNode') return '#10b981';
            if (t === 'moduleNode') return '#3b82f6';
            return '#71717a';
          }}
          position="bottom-left"
        />
      </ReactFlow>

      {selectedEvent && (
        <EventDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
