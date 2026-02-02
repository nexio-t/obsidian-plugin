import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import { VaultInsightsSettings, GeneratedNote, TaskItem } from '../types';
import { OllamaClient } from '../integrations/ollama';
import { taskCompletionChart, emptyStateMessage } from '../visualizations';

const TASK_REGEX = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/gm;
const DUE_DATE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})|due::\s*(\d{4}-\d{2}-\d{2})/;
const TAG_REGEX = /#[\w-]+/g;

/**
 * Generator for aggregated todo lists
 */
export class TodoListGenerator extends BaseGenerator {
	constructor(app: App, settings: VaultInsightsSettings, ollamaClient?: OllamaClient) {
		super(app, settings, ollamaClient);
	}

	async generate(): Promise<GeneratedNote> {
		const tasks = await this.extractAllTasks();
		const content = this.buildContent(tasks);

		const dateStr = this.formatDate(new Date());
		const title = `Todo List - ${dateStr}`;
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

	private async extractAllTasks(): Promise<TaskItem[]> {
		const { todoSourceFolders, todoExcludeFolders } = this.settings;

		const targetFiles = this.getAllMarkdownFiles().filter(file => {
			if (this.isFileExcluded(file, todoExcludeFolders)) return false;
			if (todoSourceFolders.length > 0) return this.isFileInFolders(file, todoSourceFolders);
			return true;
		});

		const taskArrays = await Promise.all(targetFiles.map(file => this.extractTasksFromFile(file)));
		return taskArrays.flat();
	}

	private async extractTasksFromFile(file: TFile): Promise<TaskItem[]> {
		const content = await this.app.vault.cachedRead(file);
		const lines = content.split('\n');

		return lines.reduce<TaskItem[]>((tasks, line, index) => {
			TASK_REGEX.lastIndex = 0;
			const match = TASK_REGEX.exec(line);
			if (!match) return tasks;

			const text = match[2].trim();
			const dueDateMatch = DUE_DATE_REGEX.exec(text);

			tasks.push({
				text,
				completed: match[1].toLowerCase() === 'x',
				file,
				line: index + 1,
				tags: text.match(TAG_REGEX) ?? undefined,
				dueDate: dueDateMatch ? (dueDateMatch[1] || dueDateMatch[2]) : undefined,
			});
			return tasks;
		}, []);
	}

	private buildContent(tasks: TaskItem[]): string {
		const pendingTasks = tasks.filter(t => !t.completed);
		const completedTasks = tasks.filter(t => t.completed);
		const { todoIncludeCompleted } = this.settings;

		const sections: string[] = [
			'# Aggregated Todo List',
			'',
			'## Summary',
			'',
			`- **Total Tasks:** ${tasks.length}`,
			`- **Pending:** ${pendingTasks.length}`,
			`- **Completed:** ${completedTasks.length}`,
			'',
		];

		if (tasks.length > 0) {
			sections.push(taskCompletionChart(completedTasks.length, pendingTasks.length), '');
		}

		sections.push(
			'## Pending Tasks',
			'',
			pendingTasks.length === 0
				? emptyStateMessage('tasks')
				: this.formatGroupedTasks(this.groupTasks(pendingTasks), false),
			''
		);

		// Only show completed tasks section if setting is enabled
		if (todoIncludeCompleted) {
			sections.push(
				'## Completed Tasks',
				'',
				completedTasks.length === 0
					? '> [!info] No completed tasks found.'
					: this.formatGroupedTasks(this.groupTasks(completedTasks), true),
				''
			);
		}

		return sections.join('\n');
	}

	private groupTasks(tasks: TaskItem[]): Map<string, TaskItem[]> {
		const { todoGroupBy } = this.settings;

		const getGroupKey = (task: TaskItem): string => {
			switch (todoGroupBy) {
				case 'date': return task.dueDate ?? 'No Due Date';
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
	private isOverdue(dueDate: string): boolean {
		const today = this.formatDate(new Date());
		return dueDate < today;
	}

	private formatGroupedTasks(grouped: Map<string, TaskItem[]>, completed: boolean): string {
		const { todoGroupBy } = this.settings;
		const checkbox = completed ? '[x]' : '[ ]';

		const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
			if (todoGroupBy === 'date') {
				if (a[0] === 'No Due Date') return 1;
				if (b[0] === 'No Due Date') return -1;
			}
			return a[0].localeCompare(b[0]);
		});

		return sortedGroups.flatMap(([groupKey, tasks]) => {
			const header = todoGroupBy === 'file' ? this.wikilink(groupKey) : groupKey;
			const lines: string[] = [];

			// Add overdue warning for date groups
			if (todoGroupBy === 'date' && !completed && groupKey !== 'No Due Date' && this.isOverdue(groupKey)) {
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
