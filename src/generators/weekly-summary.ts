import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import {
	VaultInsightsSettings,
	GeneratedNote,
	SummaryStats,
	DailyActivity,
} from '../types';
import {
	topicDistributionChart,
	dailyActivityChart,
	emptyStateMessage,
} from '../visualizations';

/**
 * Generator for weekly summary notes
 */
export class WeeklySummaryGenerator extends BaseGenerator {
	private date: Date;

	constructor(app: App, settings: VaultInsightsSettings, date?: Date) {
		super(app, settings);
		this.date = date ?? new Date();
	}

	async generate(): Promise<GeneratedNote> {
		const startOfWeek = this.getStartOfWeek(this.date);
		const endOfWeek = this.getEndOfWeek(this.date);

		const stats = this.gatherWeeklyStats(startOfWeek, endOfWeek);
		const dailyActivity = this.calculateDailyActivity(
			stats.files,
			startOfWeek,
			endOfWeek
		);
		const content = this.buildContent(stats, dailyActivity, startOfWeek, endOfWeek);

		const startStr = this.formatDate(startOfWeek);
		const endStr = this.formatDate(endOfWeek);
		const title = `Weekly Summary - ${startStr} to ${endStr}`;
		const path = `${this.settings.summaryFolder}/Weekly/${title}.md`;

		const note: GeneratedNote = {
			title,
			path,
			content,
			frontmatter: {
				title,
				generated: this.getISOTimestamp(),
				generator: 'weekly-summary',
				period: 'weekly',
				startDate: startStr,
				endDate: endStr,
				tags: ['vault-insights', 'weekly-summary'],
			},
		};

		await this.save(note);
		this.notify('Weekly summary created!');

		return note;
	}

	private gatherWeeklyStats(startOfWeek: Date, endOfWeek: Date): SummaryStats {
		const startTime = startOfWeek.getTime();
		const endTime = endOfWeek.getTime();

		const createdFiles = this.getFilesCreatedBetween(startTime, endTime);
		const modifiedFiles = this.getFilesModifiedBetween(startTime, endTime);

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

	private calculateDailyActivity(
		files: TFile[],
		startOfWeek: Date,
		endOfWeek: Date
	): DailyActivity[] {
		const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const counts = new Array(7).fill(0);

		for (const file of files) {
			const mtime = new Date(file.stat.mtime);
			if (mtime >= startOfWeek && mtime <= endOfWeek) {
				counts[mtime.getDay()]++;
			}
		}

		return dayNames.map((day, index) => ({ day, count: counts[index] }));
	}

	private buildContent(
		stats: SummaryStats,
		dailyActivity: DailyActivity[],
		startOfWeek: Date,
		endOfWeek: Date
	): string {
		const sections: string[] = [];

		sections.push(
			`# Weekly Summary - ${this.formatDateDisplay(startOfWeek)} to ${this.formatDateDisplay(endOfWeek)}`
		);
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

		sections.push('## Daily Activity');
		sections.push('');
		sections.push(dailyActivityChart(dailyActivity));
		sections.push('');

		sections.push('## Topic Distribution');
		sections.push('');
		if (stats.topTopics.length === 0) {
			sections.push(emptyStateMessage('topics'));
		} else {
			sections.push(
				topicDistributionChart(stats.topTopics, this.settings.maxChartItems)
			);
		}
		sections.push('');

		sections.push('## Top Topics');
		sections.push('');
		if (stats.topTopics.length === 0) {
			sections.push(emptyStateMessage('topics'));
		} else {
			sections.push('| Rank | Topic | Count | Source |');
			sections.push('|------|-------|-------|--------|');
			stats.topTopics.slice(0, 10).forEach((topic, index) => {
				sections.push(
					`| ${index + 1} | ${topic.name} | ${topic.count} | ${topic.source} |`
				);
			});
		}
		sections.push('');

		sections.push('## Notes Touched This Week');
		sections.push('');
		if (stats.files.length === 0) {
			sections.push(emptyStateMessage('notes'));
		} else {
			for (const file of stats.files.slice(0, 50)) {
				sections.push(`- ${this.wikilink(file.path)}`);
			}
			if (stats.files.length > 50) {
				sections.push(`- ...and ${stats.files.length - 50} more`);
			}
		}
		sections.push('');

		return sections.join('\n');
	}
}
