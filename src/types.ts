/**
 * Core metadata unit — one per conversation turn.
 * AI writes these as individual JSON files into .vibe/events/.
 */

export type FileAction = 'create' | 'modify' | 'delete' | 'read';

export interface ImpactFile {
  /** Relative path from workspace root */
  path: string;
  /** What was done to this file */
  action: FileAction;
  /** One-line summary of the change (for hover / quick scan) */
  description: string;
}

export interface VibeEvent {
  /** Unique ID: <timestamp>-<session_short_id>-<random> */
  id: string;
  /** ISO-8601 timestamp for chronological ordering */
  timestamp: string;
  /** Window / agent session identifier (AI-maintained across turns) */
  session_id: string;
  /** Business feature / module this turn belongs to */
  module: string;
  /** Condensed user intent — the node label on graphs */
  intent: string;
  /** AI-perspective summary — shown in hover tooltips */
  summary: string;
  /** Files touched this turn, with action & description */
  impactFiles: ImpactFile[];
  /** Optional: things left undone that need follow-up */
  unresolved_issues?: string;
}

/** Events grouped by a common key */
export interface EventGroup {
  key: string;
  label: string;
  events: VibeEvent[];
}

/** Status shown in tree views */
export type ViewStatus = 'empty' | 'ready';
