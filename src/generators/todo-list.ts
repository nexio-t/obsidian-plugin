import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import { VaultInsightsSettings, GeneratedNote, TaskItem } from '../types';
import { taskCompletionChart, emptyStateMessage } from '../visualizations';

const TASK_REGEX = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/gm;
const DUE_DATE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})|due::\s*(\d{4}-\d{2}-\d{2})/;
const TAG_REGEX = /#[\w-]+/g;

/**
 * Generator for aggregated todo lists
 */
export class TodoListGenerator extends BaseGenerator {
	constructor(app: App, settings: VaultInsightsSettings) {
		super(app, settings);
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
		const allFiles = this.getAllMarkdownFiles();
		const targetFiles = allFiles.filter((file) => {
			if (this.isFileExcluded(file, this.settings.todoExcludeFolders)) {
				return false;
			}

			if (this.settings.todoSourceFolders.length > 0) {
				return this.isFileInFolders(file, this.settings.todoSourceFolders);
			}

			return true;
		});

		const tasks: TaskItem[] = [];

		for (const file of targetFiles) {
			const fileTasks = await this.extractTasksFromFile(file);
			tasks.push(...fileTasks);
		}

		return tasks;
	}

	private async extractTasksFromFile(file: TFile): Promise<TaskItem[]> {
		const content = await this.app.vault.cachedRead(file);
		const tasks: TaskItem[] = [];
		let match: RegExpExecArray | null;

		TASK_REGEX.lastIndex = 0;

		let lineNumber = 0;
		const lines = content.split('\n');

		for (const line of lines) {
			lineNumber++;
			TASK_REGEX.lastIndex = 0;
			match = TASK_REGEX.exec(line);

			if (match) {
				const completed = match[1].toLowerCase() === 'x';
				const text = match[2].trim();

				const dueDateMatch = DUE_DATE_REGEX.exec(text);
				const dueDate = dueDateMatch
					? dueDateMatch[1] || dueDateMatch[2]
					: undefined;

				const tagMatches = text.match(TAG_REGEX);
				const tags = tagMatches ?? undefined;

				tasks.push({
					text,
					completed,
					file,
					line: lineNumber,
					tags,
					dueDate,
				});
			}
		}

		return tasks;
	}

	private buildContent(tasks: TaskItem[]): string {
		const sections: string[] = [];

		const pendingTasks = tasks.filter((t) => !t.completed);
		const completedTasks = tasks.filter((t) => t.completed);

		sections.push('# Aggregated Todo List');
		sections.push('');

		sections.push('## Summary');
		sections.push('');
		sections.push(`- **Total Tasks:** ${tasks.length}`);
		sections.push(`- **Pending:** ${pendingTasks.length}`);
		sections.push(`- **Completed:** ${completedTasks.length}`);
		sections.push('');

		if (tasks.length > 0) {
			sections.push(
				taskCompletionChart(completedTasks.length, pendingTasks.length)
			);
			sections.push('');
		}

		sections.push('## Pending Tasks');
		sections.push('');

		if (pendingTasks.length === 0) {
			sections.push(emptyStateMessage('tasks'));
		} else {
			const groupedPending = this.groupTasks(pendingTasks);
			sections.push(this.formatGroupedTasks(groupedPending, false));
		}
		sections.push('');

		sections.push('## Completed Tasks');
		sections.push('');

		if (completedTasks.length === 0) {
			sections.push('> [!info] No completed tasks found.');
		} else {
			const groupedCompleted = this.groupTasks(completedTasks);
			sections.push(this.formatGroupedTasks(groupedCompleted, true));
		}
		sections.push('');

		return sections.join('\n');
	}

	private groupTasks(tasks: TaskItem[]): Map<string, TaskItem[]> {
		const grouped = new Map<string, TaskItem[]>();

		const getGroupKey = (task: TaskItem): string => {
			const keyExtractors: Record<string, () => string> = {
				date: () => task.dueDate ?? 'No Due Date',
				tag: () => task.tags?.[0] ?? 'Untagged',
				file: () => task.file.path,
			};
			return (keyExtractors[this.settings.todoGroupBy] ?? keyExtractors.file)();
		};

		for (const task of tasks) {
			const groupKey = getGroupKey(task);
			const existing = grouped.get(groupKey) ?? [];
			grouped.set(groupKey, [...existing, task]);
		}

		return grouped;
	}

	private formatGroupedTasks(
		grouped: Map<string, TaskItem[]>,
		completed: boolean
	): string {
		const lines: string[] = [];
		const checkbox = completed ? '[x]' : '[ ]';

		const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
			// For date grouping, put "No Due Date" at the end
			if (this.settings.todoGroupBy === 'date') {
				if (a[0] === 'No Due Date') return 1;
				if (b[0] === 'No Due Date') return -1;
			}
			return a[0].localeCompare(b[0]);
		});

		for (const [groupKey, tasks] of sortedGroups) {
			// Format header based on grouping type
			const header = this.settings.todoGroupBy === 'file'
				? this.wikilink(groupKey)
				: groupKey;
			lines.push(`### ${header}`, '');

			for (const task of tasks) {
				const sourceLink = this.wikilink(task.file.path, this.getFileName(task.file));
				lines.push(`- ${checkbox} ${task.text} (${sourceLink})`);
			}
			lines.push('');
		}

		return lines.join('\n');
	}
}
