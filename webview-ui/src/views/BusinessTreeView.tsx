import { useState, useMemo, useCallback } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { VibeEvent, openFile } from '../api';
import { filterBusinessFiles } from '../utils/filter';
import { cn } from '../utils/cn';
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
    nodesep: 80,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
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
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - (node.type === 'rootNode' ? ROOT_WIDTH : node.type === 'moduleNode' ? MODULE_WIDTH : NODE_WIDTH) / 2,
        y: pos.y - (node.type === 'rootNode' ? ROOT_HEIGHT : node.type === 'moduleNode' ? MODULE_HEIGHT : NODE_HEIGHT) / 2,
      },
    };
  });
}

// ── Custom nodes with Handle anchors ────────────────────

function RootNode({ data }: NodeProps) {
  const hasChildren = data.hasChildren as boolean;
  const isCollapsed = data.isCollapsed as boolean;
  const onToggleCollapse = data.onToggleCollapse as (() => void) | undefined;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 shadow-lg shadow-emerald-500/5 backdrop-blur-sm text-center min-w-[200px] relative">
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-emerald-800" />
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(); }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          title={isCollapsed ? 'Expand modules' : 'Collapse modules'}
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
}

function ModuleNode({ data }: NodeProps) {
  const hasChildren = data.hasChildren as boolean;
  const isCollapsed = data.isCollapsed as boolean;
  const onToggleCollapse = data.onToggleCollapse as (() => void) | undefined;

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/8 px-5 py-3 shadow-lg backdrop-blur-sm min-w-[180px] text-center relative">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-blue-800" />
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(); }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          title={isCollapsed ? 'Expand events' : 'Collapse events'}
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
}

function CompactIntentNode({ data }: NodeProps) {
  const event = data.event as VibeEvent;
  const fileCount = event.impactFiles.length;

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-700/50 bg-zinc-900/90 px-3 py-2.5 shadow-lg backdrop-blur-sm',
        'w-[230px] cursor-pointer transition-all duration-200',
        'hover:border-emerald-500/50 hover:scale-105 hover:shadow-emerald-500/5'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500 !w-3 !h-3 !border-2 !border-zinc-800" />
      <div className="flex items-center gap-1.5">
        <FileCode className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <span className="font-semibold text-xs text-zinc-100 truncate leading-tight">
          {data.label as string}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[10px] text-zinc-500 bg-zinc-800/70 px-1.5 py-0.5 rounded">
          {fileCount} file{fileCount !== 1 ? 's' : ''} changed
        </span>
        {event.unresolved_issues && (
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  rootNode: RootNode,
  moduleNode: ModuleNode,
  intentNode: CompactIntentNode,
};

// ── Data transform ──────────────────────────────────────

function eventsToTree(events: VibeEvent[]): { nodes: Node[]; edges: Edge[] } {
  const rawNodes: Node[] = [];
  const edges: Edge[] = [];

  if (events.length === 0) {
    rawNodes.push({
      id: 'root',
      type: 'rootNode',
      position: { x: 0, y: 0 },
      data: { label: 'VibeTrace Project', subtitle: 'No events recorded yet' },
    });
    return { nodes: rawNodes, edges };
  }

  rawNodes.push({
    id: 'root',
    type: 'rootNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'VibeTrace Project',
      subtitle: `${events.length} event${events.length > 1 ? 's' : ''} across multiple modules`,
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
        subtitle: `${modEvents.length} event${modEvents.length > 1 ? 's' : ''}`,
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

  // Mark parent nodes (nodes with outgoing edges)
  const parentIds = new Set(edges.map((e) => e.source));
  for (const node of rawNodes) {
    if (parentIds.has(node.id)) {
      node.data = { ...node.data, hasChildren: true };
    }
  }

  // Run dagre auto-layout
  const nodes = layoutTree(rawNodes, edges);

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

function actionBadge(action: string) {
  const map: Record<string, string> = {
    create: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    modify: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    delete: 'bg-red-500/20 text-red-400 border-red-500/30',
    read: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  return map[action] ?? map.read;
}

interface DrawerProps {
  event: VibeEvent;
  onClose: () => void;
}

function EventDrawer({ event, onClose }: DrawerProps) {
  const files = filterBusinessFiles(event.impactFiles);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[420px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col animate-slide-in">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
        <h3 className="font-bold text-sm text-zinc-100 truncate pr-2">
          Event Detail
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <h2 className="font-bold text-base text-zinc-100 leading-snug">
            {event.intent}
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
              <FolderGit2 className="w-3 h-3" />
              {event.module}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Clock className="w-3 h-3" />
              {formatTime(event.timestamp)}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Summary
          </h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {event.summary}
          </p>
        </div>

        {files.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Impact Files ({files.length})
            </h4>
            <div className="space-y-1">
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => openFile(f.path)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md hover:bg-zinc-800/60 transition-colors group"
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      f.action === 'create' && 'bg-emerald-500',
                      f.action === 'modify' && 'bg-yellow-500',
                      f.action === 'delete' && 'bg-red-500',
                      f.action === 'read' && 'bg-zinc-500'
                    )}
                  />
                  <FileCode className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                  <code className="text-xs text-zinc-400 group-hover:text-zinc-200 font-mono truncate">
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
                Unresolved Issues
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
}

export function BusinessTreeView({ events }: Props) {
  const tree = useMemo(() => eventsToTree(events), [events]);

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

  // Compute visible nodes/edges based on collapse state
  const { visibleNodes, visibleEdges } = useMemo(() => {
    // Build childMap from edges: source → [target, ...]
    const childMap = new Map<string, string[]>();
    for (const e of tree.edges) {
      const list = childMap.get(e.source) ?? [];
      list.push(e.target);
      childMap.set(e.source, list);
    }

    // Recursively collect hidden node IDs starting from collapsed parents
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

    // Augment node data with collapse info, filter out hidden
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

  const dataKey = useMemo(() => {
    if (events.length === 0) return 'empty';
    return `${events.map((e) => e.id).sort().join('|')}--${[...collapsedIds].sort().join(',')}`;
  }, [events, collapsedIds]);

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

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-lg font-medium">No business features yet</p>
          <p className="text-sm mt-1">
            AI will auto-classify conversations into feature modules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-950 relative">
      <ReactFlow
        key={dataKey}
        defaultNodes={visibleNodes}
        defaultEdges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#94a3b8', strokeWidth: 2.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
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
        <Background color="#27272a" gap={24} size={0.5} />
        <Controls position="bottom-right" />
        <MiniMap
          style={{ backgroundColor: '#18181b' }}
          maskColor="rgba(24,24,27,0.7)"
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
