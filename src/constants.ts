// ============================================================================
// Regex Patterns
// ============================================================================

/**
 * Matches markdown task items: - [ ] or - [x] or - [X]
 * Group 1: checkbox state (space, x, or X)
 * Group 2: task text
 */
export const TASK_REGEX = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/gm;

/**
 * Matches hashtags in content
 */
export const TAG_REGEX = /#[\w-/]+/g;

/**
 * Matches due date emoji format: 📅 2024-01-15
 * Group 1: the date string
 */
export const DUE_DATE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})/;

/**
 * Matches wiki-style links: [[note]] or [[note|display]]
 * Group 1: the link target
 */
export const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Matches frontmatter block at the start of a file
 */
export const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default folder for generated insight notes
 */
export const DEFAULT_SUMMARY_FOLDER = 'Insights';

/**
 * Maximum items to show in charts
 */
export const MAX_CHART_ITEMS = 10;

/**
 * Maximum topics to track
 */
export const MAX_TOPICS = 20;

// ============================================================================
// Time Constants
// ============================================================================

/**
 * One day in milliseconds
 */
export const DAILY_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/**
 * One week in milliseconds
 */
export const WEEKLY_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cache time-to-live: 5 minutes
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;

// ============================================================================
// File Naming
// ============================================================================

/**
 * Prefix for daily summary note titles
 */
export const DAILY_SUMMARY_PREFIX = 'Daily Summary';

/**
 * Prefix for weekly summary note titles
 */
export const WEEKLY_SUMMARY_PREFIX = 'Weekly Summary';

/**
 * Name for aggregated todo list note
 */
export const TODO_LIST_NAME = 'Aggregated Todos';

/**
 * Name for topic analysis note
 */
export const TOPIC_ANALYSIS_NAME = 'Topic Analysis';

// ============================================================================
// Ollama Configuration
// ============================================================================

/**
 * Default Ollama API URL
 */
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * Default Ollama model
 */
export const DEFAULT_OLLAMA_MODEL = 'llama3';

/**
 * Timeout for Ollama API requests
 */
export const OLLAMA_TIMEOUT_MS = 30000;

// ============================================================================
// View Types
// ============================================================================

/**
 * View type identifier for the insights dashboard
 */
export const VIEW_TYPE_INSIGHTS = 'vault-insights-view';

// ============================================================================
// Plugin Identifiers
// ============================================================================

/**
 * Plugin ID as defined in manifest.json
 */
export const PLUGIN_ID = 'vault-insights';
