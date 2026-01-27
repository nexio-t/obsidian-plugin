import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import {
	VaultInsightsSettings,
	GeneratedNote,
	TopicData,
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

		const stats = await this.gatherWeeklyStats(startOfWeek, endOfWeek);
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

	private async gatherWeeklyStats(
		startOfWeek: Date,
		endOfWeek: Date
	): Promise<SummaryStats> {
		const startTime = startOfWeek.getTime();
		const endTime = endOfWeek.getTime();

		const createdFiles = this.getFilesCreatedBetween(startTime, endTime);
		const modifiedFiles = this.getFilesModifiedBetween(startTime, endTime);

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

	private calculateDailyActivity(
		files: TFile[],
		startOfWeek: Date,
		endOfWeek: Date
	): DailyActivity[] {
		const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const counts: number[] = [0, 0, 0, 0, 0, 0, 0];

		for (const file of files) {
			const mtime = new Date(file.stat.mtime);
			if (
				mtime >= startOfWeek &&
				mtime <= endOfWeek
			) {
				counts[mtime.getDay()]++;
			}
		}

		return dayNames.map((day, index) => ({
			day,
			count: counts[index],
		}));
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
