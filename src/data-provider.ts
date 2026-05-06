import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VibeEvent } from './types';
import type { EditorType } from './rules';

const EVENTS_DIR = '.vibe';
const EVENTS_GLOB = '**/.vibe/events/*.json';

/**
 * Check whether a workspace has been initialized for VibeTrace.
 */
export function isProjectInitialized(workspaceRoot: string): boolean {
  const eventsDir = path.join(workspaceRoot, EVENTS_DIR, 'events');
  return fs.existsSync(eventsDir);
}

/**
 * Save the editor type chosen during initialization so we can auto-update rules later.
 */
export async function saveEditorType(workspaceRoot: string, editorType: EditorType): Promise<void> {
  const configPath = path.join(workspaceRoot, EVENTS_DIR, 'config.json');
  const config = { editorType };
  await vscode.workspace.fs.writeFile(
    vscode.Uri.file(configPath),
    Buffer.from(JSON.stringify(config, null, 2), 'utf-8')
  );
}

/**
 * Read the saved editor type from .vibe/config.json.
 * Returns undefined if the file doesn't exist or is malformed.
 */
export function getEditorType(workspaceRoot: string): EditorType | undefined {
  const configPath = path.join(workspaceRoot, EVENTS_DIR, 'config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    const t = config?.editorType;
    if (t === 'cursor' || t === 'codex' || t === 'trae') { return t; }
  } catch { /* ignore */ }
  return undefined;
}

/**
 * Reads & watches the .vibe/events/ directory.
 * Maintains an in-memory cache of all parsed events.
 * Fires onDidChange when files are added / removed / changed.
 */
export class DataProvider {
  private events: Map<string, VibeEvent> = new Map();
  private watcher: vscode.FileSystemWatcher | null = null;
  private _stamping = false;

  private _onDidChange = new vscode.EventEmitter<VibeEvent[]>();
  readonly onDidChange = this._onDidChange.event;

  private workspaceRoot: string | undefined;

  constructor() {
    const folders = vscode.workspace.workspaceFolders;
    this.workspaceRoot = folders?.[0]?.uri.fsPath;
  }

  /** Full rescan + start watching */
  async initialize(): Promise<void> {
    await this.scanAll();
    this.startWatching();
  }

  /** Return all events sorted by timestamp descending (newest first) */
  getAll(): VibeEvent[] {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /** Events for a single session */
  getBySession(sessionId: string): VibeEvent[] {
    return this.getAll().filter(e => e.session_id === sessionId);
  }

  /** Events for a single module */
  getByModule(module: string): VibeEvent[] {
    return this.getAll().filter(e => e.module === module);
  }

  /** Unique session IDs */
  getSessions(): string[] {
    const set = new Set<string>();
    for (const e of this.events.values()) {
      set.add(e.session_id);
    }
    return Array.from(set).sort();
  }

  /** Unique module names */
  getModules(): string[] {
    const set = new Set<string>();
    for (const e of this.events.values()) {
      set.add(e.module);
    }
    return Array.from(set).sort();
  }

  /** Get a single event by id */
  getById(id: string): VibeEvent | undefined {
    return this.events.get(id);
  }

  /** Get the events directory path */
  getEventsDir(): string | undefined {
    if (!this.workspaceRoot) { return undefined; }
    return path.join(this.workspaceRoot, EVENTS_DIR, 'events');
  }

  /** Get workspace root */
  getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onDidChange.dispose();
  }

  // ── internal ────────────────────────────────────────

  private async scanAll(): Promise<void> {
    if (!this.workspaceRoot) { return; }

    const pattern = new vscode.RelativePattern(this.workspaceRoot, EVENTS_GLOB);
    const files = await vscode.workspace.findFiles(pattern);

    for (const uri of files) {
      await this.loadFile(uri);
    }
  }

  private async loadFile(uri: vscode.Uri): Promise<void> {
    try {
      const raw = await vscode.workspace.fs.readFile(uri);
      // Strip UTF-8 BOM (some tools write EF BB BF at file start)
      const decoded = raw.toString();
      const text = decoded.startsWith('﻿') ? decoded.slice(1) : decoded;
      const obj = JSON.parse(text) as Record<string, unknown>;

      // Guard against empty / partially-written files
      if (!obj.id) {
        console.warn(`[VibeTrace] Skipping file with no id: ${uri.fsPath}`);
        return;
      }

      // If AI omitted the timestamp (new format), stamp it with the current time
      // and write it back to disk so the file is self-contained.
      if (!obj.timestamp) {
        obj.timestamp = new Date().toISOString();
        const content = Buffer.from(JSON.stringify(obj, null, 2), 'utf-8');
        // Write back to disk (suppress watcher re-trigger via flag)
        this._stamping = true;
        await vscode.workspace.fs.writeFile(uri, content);
        this._stamping = false;
      }

      if (this.isValidEvent(obj)) {
        this.events.set(obj.id, obj);
      } else {
        console.warn(`[VibeTrace] Invalid event schema: ${obj.id ?? 'unknown'}`);
      }
    } catch (err) {
      console.error(`[VibeTrace] Failed to load ${uri.fsPath}:`, err);
    }
  }

  private removeFile(uri: vscode.Uri): void {
    // We need to find which event this file corresponds to.
    // Since we can't know the ID from the filename alone,
    // we re-read all files on delete to stay consistent.
    // Actually, let's just invalidate and re-scan on delete.
  }

  private startWatching(): void {
    if (!this.workspaceRoot) { return; }

    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, EVENTS_GLOB)
    );

    // New event file created by AI
    this.watcher.onDidCreate(async (uri) => {
      if (this._stamping) { return; }
      await this.loadFile(uri);
      this._onDidChange.fire(this.getAll());
    });

    // Existing event file modified (e.g. user edit)
    this.watcher.onDidChange(async (uri) => {
      if (this._stamping) { return; }
      await this.loadFile(uri);
      this._onDidChange.fire(this.getAll());
    });

    // Event file deleted
    this.watcher.onDidDelete((uri) => {
      // Re-scan to stay consistent
      this.events.clear();
      this.scanAll().then(() => this._onDidChange.fire(this.getAll()));
    });
  }

  private isValidEvent(e: unknown): e is VibeEvent {
    if (!e || typeof e !== 'object') { return false; }
    const obj = e as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.session_id === 'string' &&
      typeof obj.module === 'string' &&
      typeof obj.intent === 'string' &&
      typeof obj.summary === 'string' &&
      Array.isArray(obj.impactFiles)
    );
  }

  /** Rename a session — updates all events + writes back to JSON files */
  async renameSession(oldId: string, newId: string): Promise<void> {
    if (!this.workspaceRoot || oldId === newId) { return; }

    const affected = this.getBySession(oldId);
    const eventsDir = path.join(this.workspaceRoot, EVENTS_DIR, 'events');

    for (const event of affected) {
      const oldEventId = event.id;
      event.session_id = newId;

      // Update the id field too if it contained the old session_id
      if (event.id.includes(oldId)) {
        event.id = event.id.replace(oldId, newId);
      }

      this.events.delete(oldEventId);
      this.events.set(event.id, event);

      // Write back to original file (delete old, write new if id changed)
      const oldPath = path.join(eventsDir, `${oldEventId}.json`);
      const newPath = path.join(eventsDir, `${event.id}.json`);
      const content = Buffer.from(JSON.stringify(event, null, 2), 'utf-8');

      if (oldEventId !== event.id) {
        try { await vscode.workspace.fs.delete(vscode.Uri.file(oldPath)); } catch { /* ok */ }
      }
      await vscode.workspace.fs.writeFile(vscode.Uri.file(newPath), content);
    }

    this._onDidChange.fire(this.getAll());
  }

  /** Update an event's module (user correction) — writes back to the JSON file */
  async updateModule(eventId: string, newModule: string): Promise<void> {
    const event = this.events.get(eventId);
    if (!event || !this.workspaceRoot) { return; }

    event.module = newModule;
    this.events.set(eventId, event);

    // Write back to the original file
    const eventsDir = path.join(this.workspaceRoot, EVENTS_DIR, 'events');
    const filePath = path.join(eventsDir, `${eventId}.json`);
    const uri = vscode.Uri.file(filePath);
    const content = Buffer.from(JSON.stringify(event, null, 2), 'utf-8');
    await vscode.workspace.fs.writeFile(uri, content);

    this._onDidChange.fire(this.getAll());
  }
}
