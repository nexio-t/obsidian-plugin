import { TodoListGenerator } from './todo-list';
import { GeneratedNote, TaskItem } from '../types';
import { emptyStateMessage } from '../visualizations';

/**
 * Generator for a clean pending-only todo list
 */
export class PendingTodoListGenerator extends TodoListGenerator {
	async generate(): Promise<GeneratedNote> {
		const tasks = await this.extractAllTasks();
		const pendingTasks = tasks.filter(t => !t.completed);
		const content = this.buildPendingContent(pendingTasks);

		const dateStr = this.formatDate(new Date());
		const title = `Pending Todo List - ${dateStr}`;
		const path = `${this.settings.summaryFolder}/Todos/${title}.md`;

		const note: GeneratedNote = {
			title,
			path,
			content,
			frontmatter: {
				title,
				generated: this.getISOTimestamp(),
				generator: 'pending-todo-list',
				tags: ['vault-insights', 'todo-list', 'pending'],
			},
		};

		await this.save(note);
		this.notify('Pending todo list generated!');

		return note;
	}

	private buildPendingContent(tasks: TaskItem[]): string {
		const sections: string[] = ['# Pending Todo List', ''];
		if (tasks.length === 0) {
			sections.push(emptyStateMessage('tasks'), '');
			return sections.join('\n');
		}

		const grouped = this.groupTasks(tasks);
		sections.push(this.formatGroupedTasks(grouped, false));
		return sections.join('\n');
	}
}
