import { Plugin } from 'obsidian';
import { VaultInsightsSettings, DEFAULT_SETTINGS } from './src/types';
import {
	DailySummaryGenerator,
	WeeklySummaryGenerator,
	TodoListGenerator,
	InsightsGenerator,
} from './src/generators';

export default class VaultInsightsPlugin extends Plugin {
	settings: VaultInsightsSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'generate-daily-summary',
			name: 'Generate daily summary',
			callback: async () => {
				const generator = new DailySummaryGenerator(this.app, this.settings);
				await generator.generate();
			},
		});

		this.addCommand({
			id: 'generate-weekly-summary',
			name: 'Generate weekly summary',
			callback: async () => {
				const generator = new WeeklySummaryGenerator(this.app, this.settings);
				await generator.generate();
			},
		});

		this.addCommand({
			id: 'generate-todo-list',
			name: 'Generate todo list',
			callback: async () => {
				const generator = new TodoListGenerator(this.app, this.settings);
				await generator.generate();
			},
		});

		this.addCommand({
			id: 'generate-topic-analysis',
			name: 'Analyze vault topics',
			callback: async () => {
				const generator = new InsightsGenerator(this.app, this.settings);
				await generator.generate();
			},
		});

		this.addCommand({
			id: 'refresh-insights',
			name: 'Refresh all insights',
			callback: async () => {
				const daily = new DailySummaryGenerator(this.app, this.settings);
				const weekly = new WeeklySummaryGenerator(this.app, this.settings);
				const todo = new TodoListGenerator(this.app, this.settings);
				const insights = new InsightsGenerator(this.app, this.settings);

				await Promise.all([
					daily.generate(),
					weekly.generate(),
					todo.generate(),
					insights.generate(),
				]);
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
