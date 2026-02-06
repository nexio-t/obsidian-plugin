import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import { VaultInsightsSettings, GeneratedNote, TopicData } from '../types';
import { OllamaClient } from '../integrations/ollama';
import { topicDistributionChart, topicFrequencyChart, folderDistributionChart, emptyStateMessage } from '../visualizations';

/**
 * Generator for vault insights and topic analysis
 */
export class InsightsGenerator extends BaseGenerator {
	constructor(app: App, settings: VaultInsightsSettings, ollamaClient?: OllamaClient) {
		super(app, settings, ollamaClient);
	}

	async generate(): Promise<GeneratedNote> {
		const allFiles = this.getUserMarkdownFiles();
		const { summaryFolder } = this.settings;

		const vaultStats = this.getVaultStats(allFiles);
		const allTopics = this.extractAllTopics(allFiles);
		const folderDistribution = this.getFolderDistribution(allFiles);
		const aiTopics = await this.extractAITopics(allFiles);

		const dateStr = this.formatDate(new Date());
		const title = `Vault Insights - ${dateStr}`;

		const note: GeneratedNote = {
			title,
			path: `${summaryFolder}/${title}.md`,
			content: this.buildContent(vaultStats, allTopics, folderDistribution, aiTopics),
			frontmatter: {
				title,
				generated: this.getISOTimestamp(),
				generator: 'insights',
				tags: ['vault-insights', 'analysis'],
			},
		};

		await this.save(note);
		this.notify('Vault insights generated!');
		return note;
	}

	private getVaultStats(files: TFile[]): { totalNotes: number; totalFolders: number } {
		const folders = new Set(
			files.map(file => this.extractFolderPath(file.path)).filter(Boolean)
		);
		return { totalNotes: files.length, totalFolders: folders.size };
	}

	private extractFolderPath(filePath: string): string {
		const lastSlash = filePath.lastIndexOf('/');
		return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
	}

	/**
	 * Extract topics using AI (Ollama) from a sample of vault files.
	 * Returns empty array if Ollama is unavailable or disabled.
	 */
	private async extractAITopics(files: TFile[]): Promise<string[]> {
		if (files.length === 0) return [];

		const content = await this.gatherContentForAI(files, 20, 300);
		return this.extractTopicsWithOllamaFallback(content);
	}

	private getFolderDistribution(files: TFile[]): Map<string, number> {
		return files.reduce((distribution, file) => {
			const folderPath = this.extractFolderPath(file.path) || '(root)';
			const topLevel = folderPath.split('/')[0];
			distribution.set(topLevel, (distribution.get(topLevel) ?? 0) + 1);
			return distribution;
		}, new Map<string, number>());
	}

	private extractAllTopics(files: TFile[]): {
		all: TopicData[];
		bySource: Map<'tags' | 'headings' | 'links', TopicData[]>;
	} {
		type Source = 'tags' | 'headings' | 'links';
		const { topicSources, maxTopics, excludedTags } = this.settings;
		const excluded = new Set(excludedTags.map(tag => this.normalizeTag(tag).toLowerCase()));

		const sourceCounts = new Map<Source, Map<string, number>>([
			['tags', new Map()],
			['headings', new Map()],
			['links', new Map()],
		]);

		const increment = (source: Source, key: string) => {
			const map = sourceCounts.get(source)!;
			map.set(key, (map.get(key) ?? 0) + 1);
		};

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			if (topicSources.includes('tags')) {
				cache.tags?.forEach(tag => {
					const normalized = this.normalizeTag(tag.tag);
					if (!excluded.has(normalized.toLowerCase())) {
						increment('tags', normalized);
					}
				});
			}
			if (topicSources.includes('headings')) {
				cache.headings?.filter(h => h.level <= 2).forEach(h => increment('headings', h.heading));
			}
			if (topicSources.includes('links')) {
				cache.links?.forEach(link => increment('links', link.link));
			}
		}

		const toTopicData = (counts: Map<string, number>, source: Source): TopicData[] =>
			Array.from(counts.entries())
				.map(([name, count]) => ({ name, count, source }))
				.sort((a, b) => b.count - a.count)
				.slice(0, maxTopics);

		const bySource = new Map<Source, TopicData[]>(
			Array.from(sourceCounts.entries()).map(([source, counts]) => [source, toTopicData(counts, source)])
		);

		// Merge all sources, accumulating counts and keeping the highest-count source
		const allCounts = new Map<string, { count: number; source: Source }>();
		for (const [source, counts] of sourceCounts) {
			for (const [name, count] of counts) {
				const existing = allCounts.get(name);
				if (!existing) {
					allCounts.set(name, { count, source });
				} else {
					const newCount = existing.count + count;
					// Keep the source that contributed more
					const newSource = count > existing.count ? source : existing.source;
					allCounts.set(name, { count: newCount, source: newSource });
				}
			}
		}

		const all = Array.from(allCounts.entries())
			.map(([name, { count, source }]) => ({ name, count, source }))
			.sort((a, b) => b.count - a.count)
			.slice(0, maxTopics);

		return { all, bySource };
	}

	private buildContent(
		vaultStats: { totalNotes: number; totalFolders: number },
		topics: { all: TopicData[]; bySource: Map<'tags' | 'headings' | 'links', TopicData[]> },
		folderDistribution: Map<string, number>,
		aiTopics: string[]
	): string {
		const { showAISummary, showCharts, showTopicTable, maxChartItems, topicSources, chartType } = this.settings;
		const chartsEnabled = showCharts && chartType === 'mermaid';
		const chartsUnavailable = showCharts && chartType !== 'mermaid';
		const sections: string[] = [];

		sections.push('# Vault Insights');
		sections.push('');

		// Add AI-Identified Topics section if available and enabled
		if (showAISummary && aiTopics.length > 0) {
			sections.push('## AI-Identified Topics');
			sections.push('');
			sections.push('> [!note] Generated by Ollama');
			sections.push('> These topics were identified by analyzing a sample of your vault content.');
			sections.push('');
			for (const topic of aiTopics) {
				sections.push(`- ${topic}`);
			}
			sections.push('');
		}

		sections.push('## Vault Overview');
		sections.push('');
		sections.push(`- **Total Notes:** ${vaultStats.totalNotes}`);
		sections.push(`- **Folders:** ${vaultStats.totalFolders}`);
		sections.push('');

		if (chartsUnavailable) {
			sections.push('> [!info] Chart.js rendering is not available yet. Switch to Mermaid in settings.');
			sections.push('');
		}

		if (chartsEnabled) {
			sections.push('## Content Distribution');
			sections.push('');
			sections.push(folderDistributionChart(folderDistribution, maxChartItems));
			sections.push('');

			sections.push('## Topic Distribution');
			sections.push('');
			if (topics.all.length === 0) {
				sections.push(emptyStateMessage('topics'));
			} else {
				sections.push(topicDistributionChart(topics.all, maxChartItems));
			}
			sections.push('');

			sections.push('## Topic Frequency');
			sections.push('');
			if (topics.all.length === 0) {
				sections.push(emptyStateMessage('topics'));
			} else {
				sections.push(topicFrequencyChart(topics.all, maxChartItems));
			}
			sections.push('');
		}

		if (showTopicTable) {
			sections.push('## Topic Rankings');
			sections.push('');
			if (topics.all.length === 0) {
				sections.push(emptyStateMessage('topics'));
			} else {
				sections.push('| Rank | Topic | Count | Source |');
				sections.push('|------|-------|-------|--------|');
				topics.all.forEach((topic, index) => {
					sections.push(
						`| ${index + 1} | ${this.escapeTableCell(topic.name)} | ${topic.count} | ${topic.source} |`
					);
				});
			}
			sections.push('');
		}

		sections.push('## Topics by Source');
		sections.push('');

		if (topicSources.includes('tags')) {
			sections.push('### Tags');
			sections.push('');
			const tagTopics = topics.bySource.get('tags') ?? [];
			if (tagTopics.length === 0) {
				sections.push('> [!info] No tags found in vault.');
			} else {
				for (const topic of tagTopics.slice(0, 15)) {
					sections.push(`- ${topic.name} (${topic.count})`);
				}
			}
			sections.push('');
		}

		if (topicSources.includes('headings')) {
			sections.push('### Headings');
			sections.push('');
			const headingTopics = topics.bySource.get('headings') ?? [];
			if (headingTopics.length === 0) {
				sections.push('> [!info] No headings found in vault.');
			} else {
				for (const topic of headingTopics.slice(0, 15)) {
					sections.push(`- ${topic.name} (${topic.count})`);
				}
			}
			sections.push('');
		}

		if (topicSources.includes('links')) {
			sections.push('### Links');
			sections.push('');
			const linkTopics = topics.bySource.get('links') ?? [];
			if (linkTopics.length === 0) {
				sections.push('> [!info] No internal links found in vault.');
			} else {
				for (const topic of linkTopics.slice(0, 15)) {
					sections.push(`- ${this.wikilink(topic.name)} (${topic.count})`);
				}
			}
			sections.push('');
		}

		return sections.join('\n');
	}

}
