import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import { VaultInsightsSettings, GeneratedNote, SummaryStats, DailyActivity } from '../types';
import { OllamaClient } from '../integrations/ollama';
import { topicDistributionChart, dailyActivityChart, emptyStateMessage } from '../visualizations';

/**
 * Generator for weekly summary notes
 */
export class WeeklySummaryGenerator extends BaseGenerator {
	private date: Date;

	constructor(
		app: App,
		settings: VaultInsightsSettings,
		ollamaClient?: OllamaClient,
		date?: Date
	) {
		super(app, settings, ollamaClient);
		this.date = date ?? new Date();
	}

	async generate(): Promise<GeneratedNote> {
		const { weeklyUseCalendarWeeks } = this.settings;
		const endOfPeriod = weeklyUseCalendarWeeks
			? this.getEndOfWeek(this.date)
			: this.getEndOfDay(this.date);
		const startOfPeriod = weeklyUseCalendarWeeks
			? this.getStartOfWeek(this.date)
			: this.getRollingPeriodStart(endOfPeriod);

		const stats = this.gatherWeeklyStats(startOfPeriod, endOfPeriod);
		const dailyActivity = this.calculateDailyActivity(stats.files, startOfPeriod, endOfPeriod);
		const aiSummary = await this.generateAISummary(stats.files);
		const wordCountStats = await this.getWordCountStats(stats.files);

		const [startStr, endStr] = [this.formatDate(startOfPeriod), this.formatDate(endOfPeriod)];
		const title = `Weekly Summary - ${startStr} to ${endStr}`;
		const { summaryFolder } = this.settings;

		const note: GeneratedNote = {
			title,
			path: `${summaryFolder}/Weekly/${title}.md`,
			content: this.buildContent(stats, dailyActivity, startOfPeriod, endOfPeriod, aiSummary, wordCountStats),
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
		const [startTime, endTime] = [startOfWeek.getTime(), endOfWeek.getTime()];
		const createdFiles = this.getFilesCreatedBetween(startTime, endTime);
		const modifiedFiles = this.getFilesModifiedBetween(startTime, endTime);
		const files = [...new Set([...createdFiles, ...modifiedFiles])];
		const { total, completed } = this.countTasksInFiles(files);
		const createdPaths = new Set(createdFiles.map(file => file.path));
		const modifiedOnlyCount = modifiedFiles.filter(file => !createdPaths.has(file.path)).length;

		return {
			notesCreated: createdFiles.length,
			notesModified: modifiedOnlyCount,
			totalTasks: total,
			completedTasks: completed,
			topTopics: this.extractTopicsFromFiles(files),
			files,
		};
	}

	private calculateDailyActivity(files: TFile[], startOfWeek: Date, endOfWeek: Date): DailyActivity[] {
		const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const counts = new Array(7).fill(0);

		files
			.map(file => new Date(file.stat.mtime))
			.filter(mtime => mtime >= startOfWeek && mtime <= endOfWeek)
			.forEach(mtime => counts[mtime.getDay()]++);

		return dayNames.map((day, index) => ({ day, count: counts[index] }));
	}

	private getRollingPeriodStart(endOfPeriod: Date): Date {
		const lookbackDays = Math.max(1, this.settings.weeklyLookbackDays);
		return this.getStartOfDay(
			new Date(endOfPeriod.getTime() - (lookbackDays - 1) * 24 * 60 * 60 * 1000)
		);
	}

	/**
	 * Generate an AI summary from modified files using Ollama.
	 * Returns null if Ollama is unavailable or disabled.
	 */
	private async generateAISummary(files: TFile[]): Promise<string | null> {
		if (files.length === 0) return null;
		const content = await this.gatherContentForAI(files, 15, 400);
		return this.summarizeWithOllamaFallback(content);
	}

	/**
	 * Get links to existing daily summaries within the week
	 */
	private getDailySummaryLinks(startOfWeek: Date, endOfWeek: Date): string[] {
		const links: string[] = [];
		const current = new Date(startOfWeek);

		while (current <= endOfWeek) {
			const dateStr = this.formatDate(current);
			const dailyTitle = `Daily Summary - ${dateStr}`;
			const dailyPath = `${this.settings.summaryFolder}/Daily/${dailyTitle}.md`;

			const exists = this.app.vault.getAbstractFileByPath(dailyPath);
			if (exists) {
				links.push(this.wikilink(dailyPath, dateStr));
			}
			current.setDate(current.getDate() + 1);
		}

		return links;
	}

	private buildContent(
		stats: SummaryStats,
		dailyActivity: DailyActivity[],
		startOfWeek: Date,
		endOfWeek: Date,
		aiSummary: string | null,
		wordCountStats: { totalWords: number; mostActiveNote: TFile | null; mostActiveWordCount: number }
	): string {
		const { notesCreated, notesModified, totalTasks, completedTasks, files, topTopics } = stats;
		const { totalWords, mostActiveNote, mostActiveWordCount } = wordCountStats;
		const { maxChartItems, showAISummary, showCharts, showFileList, showTopicTable, chartType, weeklyLookbackDays, weeklyUseCalendarWeeks } = this.settings;
		const chartsEnabled = showCharts && chartType === 'mermaid';
		const chartsUnavailable = showCharts && chartType !== 'mermaid';
		const notesSectionTitle =
			weeklyUseCalendarWeeks || weeklyLookbackDays === 7
				? 'Notes Touched This Week'
				: 'Notes Touched in Period';
		const sections: string[] = [
			`# Weekly Summary - ${this.formatDateDisplay(startOfWeek)} to ${this.formatDateDisplay(endOfWeek)}`,
			'',
		];

		// Add navigation to daily summaries if any exist
		const dailyLinks = this.getDailySummaryLinks(startOfWeek, endOfWeek);
		if (dailyLinks.length > 0) {
			sections.push(`**Daily Summaries:** ${dailyLinks.join(' | ')}`, '');
		}

		if (showAISummary && aiSummary) {
			sections.push('## AI Summary', '', '> [!note] Generated by Ollama', `> ${aiSummary}`, '');
		}

		sections.push(
			'## Overview',
			'',
			'| Metric | Value |',
			'|--------|-------|',
			`| Notes Created | ${notesCreated} |`,
			`| Notes Modified | ${notesModified} |`,
			`| Words Written | ${totalWords.toLocaleString()} |`,
			`| Total Tasks | ${totalTasks} |`,
			`| Completed Tasks | ${completedTasks} |`,
			''
		);

		// Add most active note if available
		if (mostActiveNote && mostActiveWordCount > 0) {
			sections.push(
				`**Most Active Note:** ${this.wikilink(mostActiveNote.path)} (${mostActiveWordCount.toLocaleString()} words)`,
				''
			);
		}

		if (chartsUnavailable) {
			sections.push('> [!info] Chart.js rendering is not available yet. Switch to Mermaid in settings.', '');
		}

		if (chartsEnabled) {
			sections.push(
				'## Daily Activity',
				'',
				dailyActivityChart(dailyActivity),
				'',
				'## Topic Distribution',
				'',
				topTopics.length === 0
					? emptyStateMessage('topics')
					: topicDistributionChart(topTopics, maxChartItems),
				''
			);
		}

		// Top Topics table
		if (showTopicTable) {
			sections.push('## Top Topics', '');
			if (topTopics.length === 0) {
				sections.push(emptyStateMessage('topics'));
			} else {
				sections.push(
					'| Rank | Topic | Count | Source |',
					'|------|-------|-------|--------|',
					...topTopics.slice(0, 10).map((topic, i) =>
						`| ${i + 1} | ${this.escapeTableCell(topic.name)} | ${topic.count} | ${topic.source} |`
					)
				);
			}
			sections.push('');
		}

		// Notes section
		if (showFileList) {
			sections.push(`## ${notesSectionTitle}`, '');
			if (files.length === 0) {
				sections.push(emptyStateMessage('notes'));
			} else {
				sections.push(...files.slice(0, 50).map(file => `- ${this.wikilink(file.path)}`));
				if (files.length > 50) {
					sections.push(`- ...and ${files.length - 50} more`);
				}
			}
			sections.push('');
		}

		return sections.join('\n');
	}
}
