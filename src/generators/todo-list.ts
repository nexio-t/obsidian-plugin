import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import { VaultInsightsSettings, GeneratedNote, TaskItem } from '../types';
import { OllamaClient } from '../integrations/ollama';
import { taskCompletionChart, emptyStateMessage } from '../visualizations';
import { TaskExtractor } from '../extractors/tasks';

/**
 * Generator for aggregated todo lists
 */
export class TodoListGenerator extends BaseGenerator {
	private taskExtractor = new TaskExtractor();

	constructor(app: App, settings: VaultInsightsSettings, ollamaClient?: OllamaClient) {
		super(app, settings, ollamaClient);
	}

	async generate(): Promise<GeneratedNote> {
		const tasks = await this.extractAllTasks();
		const content = this.buildContent(tasks);

		const dateStr = this.formatDate(new Date());
		const title = `Todo list - ${dateStr}`;
		const path = `${this.settings.summaryFolder}/Todos/${title}.md`;

		const note: GeneratedNote = {
			title,
			path,
			content,
			frontmatter: {
				title,
				generated: this.getISOTimestamp(),
				generator: 'todo-list',
				tags: ['vault-insights', 'todo-list'],
			},
		};

		await this.save(note);
		this.notify('Todo list generated!');

		return note;
	}

	protected async extractAllTasks(): Promise<TaskItem[]> {
		const { todoSourceFolders, todoExcludeFolders, summaryFolder } = this.settings;

		// Always exclude the Insights folder to avoid scanning our own generated files
		const allExcludeFolders = [...todoExcludeFolders, summaryFolder];

		const targetFiles = this.getAllMarkdownFiles().filter(file => {
			if (this.isFileExcluded(file, allExcludeFolders)) return false;
			if (todoSourceFolders.length > 0) return this.isFileInFolders(file, todoSourceFolders);
			return true;
		});

		// Process files with concurrency limit to avoid memory pressure on large vaults
		const allTasks: TaskItem[] = [];
		const batchSize = 10;
		for (let i = 0; i < targetFiles.length; i += batchSize) {
			const batch = targetFiles.slice(i, i + batchSize);
			const batchResults = await Promise.all(batch.map(file => this.extractTasksFromFile(file)));
			allTasks.push(...batchResults.flat());
		}
		return allTasks;
	}

	protected async extractTasksFromFile(file: TFile): Promise<TaskItem[]> {
		const content = await this.app.vault.cachedRead(file);
		const tasks = this.taskExtractor.extractWithText(file, content);

		return tasks.map((task) => ({
			text: task.text,
			completed: task.completed,
			file,
			line: task.line + 1,
			tags: task.tags.length > 0 ? task.tags : undefined,
			dueDate: task.dueDate ? this.formatDate(task.dueDate) : undefined,
		}));
	}

	protected buildContent(tasks: TaskItem[]): string {
		const pendingTasks = tasks.filter(t => !t.completed);
		const completedTasks = tasks.filter(t => t.completed);
		const { todoIncludeCompleted, showCharts, chartType } = this.settings;
		const chartsEnabled = showCharts;

		const sections: string[] = [
			'# Aggregated todo list',
			'',
			'## Summary',
			'',
			`- **Total tasks:** ${tasks.length}`,
			`- **Pending:** ${pendingTasks.length}`,
			`- **Completed:** ${completedTasks.length}`,
			'',
		];

		if (chartsEnabled && tasks.length > 0) {
			sections.push(taskCompletionChart(completedTasks.length, pendingTasks.length, chartType), '');
		}

		sections.push(
			'## Pending tasks',
			'',
			pendingTasks.length === 0
				? emptyStateMessage('tasks')
				: this.formatGroupedTasks(this.groupTasks(pendingTasks), false),
			''
		);

		// Only show completed tasks section if setting is enabled
		if (todoIncludeCompleted) {
			sections.push(
				'## Completed tasks',
				'',
				completedTasks.length === 0
					? '> [!info] No completed tasks found.'
					: this.formatGroupedTasks(this.groupTasks(completedTasks), true),
				''
			);
		}

		return sections.join('\n');
	}

	protected groupTasks(tasks: TaskItem[]): Map<string, TaskItem[]> {
		const { todoGroupBy } = this.settings;

		const getGroupKey = (task: TaskItem): string => {
			switch (todoGroupBy) {
				case 'date': return task.dueDate ?? 'No due date';
				case 'tag': return task.tags?.[0] ?? 'Untagged';
				default: return task.file.path;
			}
		};

		// Sort tasks by due date before grouping (earliest first, no due date last)
		const sortedTasks = [...tasks].sort((a, b) => {
			if (!a.dueDate && !b.dueDate) return 0;
			if (!a.dueDate) return 1;
			if (!b.dueDate) return -1;
			return a.dueDate.localeCompare(b.dueDate);
		});

		return sortedTasks.reduce((grouped, task) => {
			const key = getGroupKey(task);
			grouped.set(key, [...(grouped.get(key) ?? []), task]);
			return grouped;
		}, new Map<string, TaskItem[]>());
	}

	/**
	 * Check if a due date is in the past (overdue)
	 */
	protected isOverdue(dueDate: string): boolean {
		const today = this.formatDate(new Date());
		return dueDate < today;
	}

	protected formatGroupedTasks(grouped: Map<string, TaskItem[]>, completed: boolean): string {
		const { todoGroupBy } = this.settings;
		const checkbox = completed ? '[x]' : '[ ]';

		const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
			if (todoGroupBy === 'date') {
				if (a[0] === 'No due date') return 1;
				if (b[0] === 'No due date') return -1;
			}
			return a[0].localeCompare(b[0]);
		});

		return sortedGroups.flatMap(([groupKey, tasks]) => {
			const header = todoGroupBy === 'file' ? this.wikilink(groupKey) : groupKey;
			const lines: string[] = [];

			// Add overdue warning for date groups
			if (todoGroupBy === 'date' && !completed && groupKey !== 'No due date' && this.isOverdue(groupKey)) {
				lines.push(`### ${header}`, '', '> [!warning] Overdue', '');
			} else {
				lines.push(`### ${header}`, '');
			}

			const taskLines = tasks.map(task => {
				const taskText = `- ${checkbox} ${task.text} (${this.wikilink(task.file.path, this.getFileName(task.file))})`;
				// Add overdue indicator for individual tasks when not grouping by date
				if (!completed && todoGroupBy !== 'date' && task.dueDate && this.isOverdue(task.dueDate)) {
					return `${taskText} ⚠️ Overdue`;
				}
				return taskText;
			});

			lines.push(...taskLines, '');
			return lines;
		}).join('\n');
	}
}
