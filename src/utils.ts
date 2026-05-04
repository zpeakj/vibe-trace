/**
 * Shared utilities for formatting and display.
 */

/**
 * Safely format a timestamp string into a human-readable string.
 * Falls back gracefully if the timestamp is malformed (e.g., garbled shell output).
 */
export function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      // Timestamp is garbled — return as-is but truncated
      return isoString.length > 30 ? isoString.slice(0, 30) + '…' : isoString;
    }
    return d.toLocaleString(undefined, { hour12: false });
  } catch {
    return isoString.slice(0, 30);
  }
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
