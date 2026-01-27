import { TFile } from 'obsidian';

/**
 * Plugin settings interface
 */
export interface VaultInsightsSettings {
	summaryFolder: string;
	dailySummaryEnabled: boolean;
	weeklySummaryEnabled: boolean;
	summaryTime: string;
	todoSourceFolders: string[];
	todoExcludeFolders: string[];
	todoGroupBy: 'file' | 'date' | 'tag';
	topicSources: ('tags' | 'headings' | 'links')[];
	maxTopics: number;
	ollamaEnabled: boolean;
	ollamaUrl: string;
	ollamaModel: string;
	chartType: 'mermaid' | 'chartjs';
	maxChartItems: number;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: VaultInsightsSettings = {
	summaryFolder: 'Insights',
	dailySummaryEnabled: true,
	weeklySummaryEnabled: true,
	summaryTime: '09:00',
	todoSourceFolders: [],
	todoExcludeFolders: ['templates', 'archive'],
	todoGroupBy: 'file',
	topicSources: ['tags', 'headings'],
	maxTopics: 20,
	ollamaEnabled: false,
	ollamaUrl: 'http://localhost:11434',
	ollamaModel: 'llama3',
	chartType: 'mermaid',
	maxChartItems: 10,
};

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
 * Generated note structure
 */
export interface GeneratedNote {
	title: string;
	path: string;
	content: string;
	frontmatter: NoteFrontmatter;
}

/**
 * Task item extracted from vault
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
 * Topic data for analysis
 */
export interface TopicData {
	name: string;
	count: number;
	source: 'tags' | 'headings' | 'links';
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
