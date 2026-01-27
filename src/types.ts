import type { TFile } from 'obsidian';

// ============================================================================
// Type Aliases
// ============================================================================

/**
 * Sources for topic extraction
 */
export type TopicSource = 'tags' | 'headings' | 'links';

/**
 * Chart rendering engine
 */
export type ChartType = 'mermaid' | 'chartjs';

/**
 * How to group aggregated items
 */
export type GroupBy = 'file' | 'date' | 'tag';

/**
 * Task completion status
 */
export type TaskStatus = 'pending' | 'completed';

/**
 * Task marker characters
 */
export type TaskMarker = ' ' | 'x' | 'X' | '-' | '/' | '>' | '!' | '?';

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low';

// ============================================================================
// Settings Interface
// ============================================================================

/**
 * Plugin settings stored in data.json
 */
export interface VaultInsightsSettings {
  // Summary settings
  summaryFolder: string;
  dailySummaryEnabled: boolean;
  weeklySummaryEnabled: boolean;
  summaryTime: string;
  dailyLookbackDays: number;
  weeklyLookbackDays: number;

  // Todo settings
  todoSourceFolders: string[];
  todoExcludeFolders: string[];
  todoGroupBy: GroupBy;
  todoIncludeCompleted: boolean;

  // Topic settings
  topicSources: TopicSource[];
  maxTopics: number;
  excludedTags: string[];

  // Ollama settings
  ollamaEnabled: boolean;
  ollamaUrl: string;
  ollamaModel: string;

  // Visualization settings
  chartType: ChartType;
  maxChartItems: number;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: VaultInsightsSettings = {
  // Summary settings
  summaryFolder: 'Insights',
  dailySummaryEnabled: true,
  weeklySummaryEnabled: true,
  summaryTime: '09:00',
  dailyLookbackDays: 1,
  weeklyLookbackDays: 7,

  // Todo settings
  todoSourceFolders: [],
  todoExcludeFolders: ['templates', 'archive'],
  todoGroupBy: 'file',
  todoIncludeCompleted: false,

  // Topic settings
  topicSources: ['tags', 'headings'],
  maxTopics: 20,
  excludedTags: [],

  // Ollama settings
  ollamaEnabled: false,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',

  // Visualization settings
  chartType: 'mermaid',
  maxChartItems: 10,
};

// ============================================================================
// Extraction Result Interfaces
// ============================================================================

/**
 * A task extracted from a note
 */
export interface ExtractedTask {
  text: string;
  completed: boolean;
  status: TaskStatus;
  line: number;
  filePath: string;
  fileName: string;
  tags: string[];
  dueDate?: Date;
  priority?: TaskPriority;
  taskMarker: TaskMarker;
}

/**
 * Task item for generators (simplified)
 */
export interface TaskItem {
  text: string;
  completed: boolean;
  file: TFile;
  line: number;
  tags?: string[];
  dueDate?: string;
}

/**
 * A topic identified from vault analysis
 */
export interface ExtractedTopic {
  name: string;
  displayName: string;
  source: TopicSource;
  count: number;
  files: string[];
}

/**
 * Topic data for analysis (simplified)
 */
export interface TopicData {
  name: string;
  count: number;
  source: TopicSource;
}

/**
 * Topics grouped by source
 */
export interface TopicsBySource {
  tags: ExtractedTopic[];
  headings: ExtractedTopic[];
  links: ExtractedTopic[];
}

/**
 * Full topic analysis result
 */
export interface TopicAnalysis {
  topics: ExtractedTopic[];
  uniqueCount: number;
  totalOccurrences: number;
  bySource: TopicsBySource;
}

/**
 * Content summary extracted from a note
 */
export interface ContentSummary {
  title: string;
  excerpt: string;
  wordCount: number;
  file: TFile;
  modifiedAt: number;
}

/**
 * Content extraction result (extended)
 */
export interface ExtractedContent {
  filePath: string;
  fileName: string;
  headings: string[];
  firstParagraph: string;
  wordCount: number;
  createdAt: number;
  modifiedAt: number;
}

// ============================================================================
// Metadata Interfaces
// ============================================================================

/**
 * Metadata extracted from frontmatter
 */
export interface ExtractedMetadata {
  title?: string;
  date?: Date;
  tags: string[];
  aliases: string[];
  created?: Date;
  modified?: Date;
  customFields: Record<string, unknown>;
}

/**
 * Information about a heading in a note
 */
export interface HeadingInfo {
  text: string;
  level: number;
  line: number;
}

/**
 * Information about a task in a note
 */
export interface TaskInfo {
  text: string;
  completed: boolean;
  line: number;
}

/**
 * Full metadata extracted from a note using MetadataCache
 */
export interface NoteMetadata {
  filePath: string;
  fileName: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  links: string[];
  headings: HeadingInfo[];
  tasks: TaskInfo[];
  createdAt: number;
  modifiedAt: number;
}

// ============================================================================
// Scanner Interfaces
// ============================================================================

/**
 * Filters for scanning the vault
 */
export interface ScanFilters {
  folders?: string[];
  excludeFolders?: string[];
  modifiedAfter?: number;
  modifiedBefore?: number;
}

/**
 * Result of a vault scan operation
 */
export interface ScanResult {
  files: TFile[];
  totalCount: number;
  scannedAt: number;
  filters: ScanFilters;
}

// ============================================================================
// Generated Output Interfaces
// ============================================================================

/**
 * Frontmatter for generated notes
 */
export interface NoteFrontmatter {
  title: string;
  generated: string;
  generator: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

/**
 * A note generated by the plugin
 */
export interface GeneratedNote {
  title: string;
  path: string;
  content: string;
  frontmatter: NoteFrontmatter | Record<string, unknown>;
  generatedAt?: number;
}

/**
 * Summary statistics
 */
export interface SummaryStats {
  notesCreated: number;
  notesModified: number;
  totalTasks: number;
  completedTasks: number;
  topTopics: TopicData[];
  files: TFile[];
}

// ============================================================================
// Cache Interfaces
// ============================================================================

/**
 * A cached entry with metadata for invalidation
 */
export interface CacheEntry<T> {
  data: T;
  mtime: number;
  cachedAt: number;
}

// ============================================================================
// Ollama Integration Interfaces
// ============================================================================

/**
 * Ollama connection configuration
 */
export interface OllamaConfig {
  url: string;
  model: string;
  timeout: number;
}

/**
 * Result from Ollama topic extraction
 */
export interface OllamaTopicResult {
  topics: string[];
  confidence: number;
  model: string;
}

/**
 * Result from Ollama summarization
 */
export interface OllamaSummaryResult {
  summary: string;
  model: string;
}

/**
 * Ollama model information
 */
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

// ============================================================================
// Visualization Interfaces
// ============================================================================

/**
 * Chart data point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
}

/**
 * Timeline event for timeline charts
 */
export interface TimelineEvent {
  date: Date;
  label: string;
  section?: string;
}

/**
 * Connection for flowchart diagrams
 */
export interface Connection {
  from: string;
  to: string;
  label?: string;
}

/**
 * Daily activity data
 */
export interface DailyActivity {
  day: string;
  count: number;
}
