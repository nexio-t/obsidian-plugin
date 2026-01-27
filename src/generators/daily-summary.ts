import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import {
	VaultInsightsSettings,
	GeneratedNote,
	TopicData,
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
		const stats = await this.gatherDailyStats();
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

	private async gatherDailyStats(): Promise<SummaryStats> {
		const startOfDay = this.getStartOfDay(this.date);
		const endOfDay = this.getEndOfDay(this.date);

		const createdFiles = this.getFilesCreatedBetween(startOfDay, endOfDay);
		const modifiedFiles = this.getFilesModifiedBetween(startOfDay, endOfDay);

		const allTouchedFiles = new Set<TFile>([
			...createdFiles,
			...modifiedFiles,
		]);

		const topics = await this.extractTopics(Array.from(allTouchedFiles));
		const taskStats = await this.countTasks(Array.from(allTouchedFiles));

		return {
			notesCreated: createdFiles.length,
			notesModified: modifiedFiles.length - createdFiles.length,
			totalTasks: taskStats.total,
			completedTasks: taskStats.completed,
			topTopics: topics,
			files: Array.from(allTouchedFiles),
		};
	}

	private async extractTopics(files: TFile[]): Promise<TopicData[]> {
		const topicCounts = new Map<string, { count: number; source: 'tags' | 'headings' | 'links' }>();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			if (this.settings.topicSources.includes('tags')) {
				const tags = cache.tags ?? [];
				for (const tag of tags) {
					const existing = topicCounts.get(tag.tag) ?? { count: 0, source: 'tags' as const };
					topicCounts.set(tag.tag, {
						count: existing.count + 1,
						source: 'tags',
					});
				}
			}

			if (this.settings.topicSources.includes('headings')) {
				const headings = cache.headings ?? [];
				for (const heading of headings) {
					if (heading.level <= 2) {
						const key = heading.heading;
						const existing = topicCounts.get(key) ?? { count: 0, source: 'headings' as const };
						topicCounts.set(key, {
							count: existing.count + 1,
							source: 'headings',
						});
					}
				}
			}

			if (this.settings.topicSources.includes('links')) {
				const links = cache.links ?? [];
				for (const link of links) {
					const key = link.link;
					const existing = topicCounts.get(key) ?? { count: 0, source: 'links' as const };
					topicCounts.set(key, {
						count: existing.count + 1,
						source: 'links',
					});
				}
			}
		}

		const topics: TopicData[] = Array.from(topicCounts.entries())
			.map(([name, data]) => ({
				name,
				count: data.count,
				source: data.source,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, this.settings.maxTopics);

		return topics;
	}

	private async countTasks(
		files: TFile[]
	): Promise<{ total: number; completed: number }> {
		let total = 0;
		let completed = 0;

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.listItems) continue;

			for (const item of cache.listItems) {
				if (item.task !== undefined) {
					total++;
					if (item.task !== ' ') {
						completed++;
					}
				}
			}
		}

		return { total, completed };
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
