import type { TFile } from 'obsidian';

// Task extraction types
export type TaskMarker = ' ' | 'x' | 'X' | '-' | '/' | '>' | '!' | '?';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface ExtractedTask {
  text: string;
  completed: boolean;
  line: number;
  filePath: string;
  dueDate?: Date;
  tags: string[];
  priority?: TaskPriority;
  taskMarker: TaskMarker;
}

// Topic extraction types
export type TopicSource = 'tag' | 'heading' | 'link';

export interface ExtractedTopic {
  name: string;        // normalized (lowercase, no # prefix)
  count: number;
  source: TopicSource;
  displayName: string; // original case preserved
}

export interface TopicsBySource {
  tags: ExtractedTopic[];
  headings: ExtractedTopic[];
  links: ExtractedTopic[];
}

export interface TopicAnalysis {
  topics: ExtractedTopic[];
  uniqueCount: number;
  totalOccurrences: number;
  bySource: TopicsBySource;
}

// Content extraction types
export interface ContentSummary {
  title: string;
  excerpt: string;
  wordCount: number;
  file: TFile;
  modifiedAt: number;
}

// Metadata extraction types
export interface ExtractedMetadata {
  title?: string;
  date?: Date;
  tags: string[];
  aliases: string[];
  created?: Date;
  modified?: Date;
  customFields: Record<string, unknown>;
}

// Ollama integration types
export interface OllamaConfig {
  url: string;
  model: string;
  timeout: number;
}

export interface OllamaTopicResult {
  topics: string[];
  confidence: number;
  model: string;
}

export interface OllamaSummaryResult {
  summary: string;
  model: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

// Settings types (for reference by extractors)
export interface VaultInsightsSettings {
  summaryFolder: string;
  dailySummaryEnabled: boolean;
  weeklySummaryEnabled: boolean;
  summaryTime: string;

  todoSourceFolders: string[];
  todoExcludeFolders: string[];
  todoGroupBy: 'file' | 'date' | 'tag';

  topicSources: TopicSource[];
  maxTopics: number;

  ollamaEnabled: boolean;
  ollamaUrl: string;
  ollamaModel: string;

  chartType: 'mermaid' | 'chartjs';
  maxChartItems: number;
}

export const DEFAULT_SETTINGS: VaultInsightsSettings = {
  summaryFolder: 'Insights',
  dailySummaryEnabled: true,
  weeklySummaryEnabled: true,
  summaryTime: '09:00',

  todoSourceFolders: [],
  todoExcludeFolders: ['templates', 'archive'],
  todoGroupBy: 'file',

  topicSources: ['tag', 'heading'],
  maxTopics: 20,

  ollamaEnabled: false,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',

  chartType: 'mermaid',
  maxChartItems: 10,
};
