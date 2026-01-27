import { App } from 'obsidian';
import { BaseGenerator } from './base';
import {
	VaultInsightsSettings,
	GeneratedNote,
	SummaryStats,
} from '../types';
import { topicDistributionChart, emptyStateMessage } from '../visualizations';

/**
 * Generator for daily summary notes
 */
export class DailySummaryGenerator extends BaseGenerator {
	private date: Date;

	constructor(app: App, settings: VaultInsightsSettings, date?: Date) {
		super(app, settings);
		this.date = date ?? new Date();
	}

	async generate(): Promise<GeneratedNote> {
		const stats = this.gatherDailyStats();
		const content = this.buildContent(stats);

		const dateStr = this.formatDate(this.date);
		const title = `Daily Summary - ${dateStr}`;
		const path = `${this.settings.summaryFolder}/Daily/${title}.md`;

		const note: GeneratedNote = {
			title,
			path,
			content,
			frontmatter: {
				title,
				generated: this.getISOTimestamp(),
				generator: 'daily-summary',
				period: 'daily',
				startDate: dateStr,
				endDate: dateStr,
				tags: ['vault-insights', 'daily-summary'],
			},
		};

		await this.save(note);
		this.notify('Daily summary created!');

		return note;
	}

	private gatherDailyStats(): SummaryStats {
		const startOfDay = this.getStartOfDay(this.date);
		const endOfDay = this.getEndOfDay(this.date);

		const createdFiles = this.getFilesCreatedBetween(startOfDay, endOfDay);
		const modifiedFiles = this.getFilesModifiedBetween(startOfDay, endOfDay);

		const allTouchedFiles = [...new Set([...createdFiles, ...modifiedFiles])];

		const topics = this.extractTopicsFromFiles(allTouchedFiles);
		const taskStats = this.countTasksInFiles(allTouchedFiles);

		return {
			notesCreated: createdFiles.length,
			notesModified: modifiedFiles.length - createdFiles.length,
			totalTasks: taskStats.total,
			completedTasks: taskStats.completed,
			topTopics: topics,
			files: allTouchedFiles,
		};
	}

	private buildContent(stats: SummaryStats): string {
		const sections: string[] = [];

		sections.push(`# Daily Summary - ${this.formatDateDisplay(this.date)}`);
		sections.push('');

		sections.push('## Overview');
		sections.push('');
		sections.push('| Metric | Value |');
		sections.push('|--------|-------|');
		sections.push(`| Notes Created | ${stats.notesCreated} |`);
		sections.push(`| Notes Modified | ${stats.notesModified} |`);
		sections.push(`| Total Tasks | ${stats.totalTasks} |`);
		sections.push(`| Completed Tasks | ${stats.completedTasks} |`);
		sections.push('');

		sections.push('## Notes Touched Today');
		sections.push('');
		if (stats.files.length === 0) {
			sections.push(emptyStateMessage('notes'));
		} else {
			for (const file of stats.files) {
				sections.push(`- ${this.wikilink(file.path)}`);
			}
		}
		sections.push('');

		sections.push('## Topics');
		sections.push('');
		if (stats.topTopics.length === 0) {
			sections.push(emptyStateMessage('topics'));
		} else {
			sections.push(
				topicDistributionChart(stats.topTopics, this.settings.maxChartItems)
			);
		}
		sections.push('');

		return sections.join('\n');
	}
}
