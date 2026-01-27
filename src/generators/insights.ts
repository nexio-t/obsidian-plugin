import { App, TFile } from 'obsidian';
import { BaseGenerator } from './base';
import { VaultInsightsSettings, GeneratedNote, TopicData } from '../types';
import {
	topicDistributionChart,
	topicFrequencyChart,
	folderDistributionChart,
	emptyStateMessage,
} from '../visualizations';

/**
 * Generator for vault insights and topic analysis
 */
export class InsightsGenerator extends BaseGenerator {
	constructor(app: App, settings: VaultInsightsSettings) {
		super(app, settings);
	}

	async generate(): Promise<GeneratedNote> {
		const vaultStats = this.getVaultStats();
		const allTopics = await this.extractAllTopics();
		const folderDistribution = this.getFolderDistribution();
		const content = this.buildContent(vaultStats, allTopics, folderDistribution);

		const dateStr = this.formatDate(new Date());
		const title = `Vault Insights - ${dateStr}`;
		const path = `${this.settings.summaryFolder}/${title}.md`;

		const note: GeneratedNote = {
			title,
			path,
			content,
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

	private getVaultStats(): { totalNotes: number; totalFolders: number } {
		const files = this.getAllMarkdownFiles();
		const folders = new Set<string>();

		for (const file of files) {
			const folderPath = this.extractFolderPath(file.path);
			if (folderPath) {
				folders.add(folderPath);
			}
		}

		return {
			totalNotes: files.length,
			totalFolders: folders.size,
		};
	}

	private extractFolderPath(filePath: string): string {
		const lastSlash = filePath.lastIndexOf('/');
		return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
	}

	private getFolderDistribution(): Map<string, number> {
		const files = this.getAllMarkdownFiles();
		const distribution = new Map<string, number>();

		for (const file of files) {
			const folderPath = this.extractFolderPath(file.path);
			const folder = folderPath || '(root)';
			const topLevel = folder.split('/')[0];

			const current = distribution.get(topLevel) ?? 0;
			distribution.set(topLevel, current + 1);
		}

		return distribution;
	}

	private async extractAllTopics(): Promise<{
		all: TopicData[];
		bySource: Map<'tags' | 'headings' | 'links', TopicData[]>;
	}> {
		const files = this.getAllMarkdownFiles();
		const allTopics = new Map<string, { count: number; source: 'tags' | 'headings' | 'links' }>();
		const topicsBySource: Map<'tags' | 'headings' | 'links', Map<string, number>> = new Map([
			['tags', new Map()],
			['headings', new Map()],
			['links', new Map()],
		]);

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			if (this.settings.topicSources.includes('tags')) {
				const tags = cache.tags ?? [];
				const tagMap = topicsBySource.get('tags')!;
				for (const tag of tags) {
					const current = tagMap.get(tag.tag) ?? 0;
					tagMap.set(tag.tag, current + 1);

					const existing = allTopics.get(tag.tag);
					if (!existing || existing.source === 'tags') {
						allTopics.set(tag.tag, {
							count: (existing?.count ?? 0) + 1,
							source: 'tags',
						});
					}
				}
			}

			if (this.settings.topicSources.includes('headings')) {
				const headings = cache.headings ?? [];
				const headingMap = topicsBySource.get('headings')!;
				for (const heading of headings) {
					if (heading.level <= 2) {
						const key = heading.heading;
						const current = headingMap.get(key) ?? 0;
						headingMap.set(key, current + 1);

						const existing = allTopics.get(key);
						if (!existing) {
							allTopics.set(key, {
								count: 1,
								source: 'headings',
							});
						} else if (existing.source === 'headings') {
							allTopics.set(key, {
								count: existing.count + 1,
								source: 'headings',
							});
						}
					}
				}
			}

			if (this.settings.topicSources.includes('links')) {
				const links = cache.links ?? [];
				const linkMap = topicsBySource.get('links')!;
				for (const link of links) {
					const key = link.link;
					const current = linkMap.get(key) ?? 0;
					linkMap.set(key, current + 1);

					const existing = allTopics.get(key);
					if (!existing) {
						allTopics.set(key, {
							count: 1,
							source: 'links',
						});
					} else if (existing.source === 'links') {
						allTopics.set(key, {
							count: existing.count + 1,
							source: 'links',
						});
					}
				}
			}
		}

		const sortedAll: TopicData[] = Array.from(allTopics.entries())
			.map(([name, data]) => ({
				name,
				count: data.count,
				source: data.source,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, this.settings.maxTopics);

		const bySource = new Map<'tags' | 'headings' | 'links', TopicData[]>();

		for (const [source, counts] of topicsBySource) {
			const topics: TopicData[] = Array.from(counts.entries())
				.map(([name, count]) => ({
					name,
					count,
					source,
				}))
				.sort((a, b) => b.count - a.count)
				.slice(0, this.settings.maxTopics);
			bySource.set(source, topics);
		}

		return { all: sortedAll, bySource };
	}

	private buildContent(
		vaultStats: { totalNotes: number; totalFolders: number },
		topics: { all: TopicData[]; bySource: Map<'tags' | 'headings' | 'links', TopicData[]> },
		folderDistribution: Map<string, number>
	): string {
		const sections: string[] = [];

		sections.push('# Vault Insights');
		sections.push('');

		sections.push('## Vault Overview');
		sections.push('');
		sections.push(`- **Total Notes:** ${vaultStats.totalNotes}`);
		sections.push(`- **Folders:** ${vaultStats.totalFolders}`);
		sections.push('');

		sections.push('## Content Distribution');
		sections.push('');
		sections.push(folderDistributionChart(folderDistribution, this.settings.maxChartItems));
		sections.push('');

		sections.push('## Topic Distribution');
		sections.push('');
		if (topics.all.length === 0) {
			sections.push(emptyStateMessage('topics'));
		} else {
			sections.push(topicDistributionChart(topics.all, this.settings.maxChartItems));
		}
		sections.push('');

		sections.push('## Topic Frequency');
		sections.push('');
		if (topics.all.length === 0) {
			sections.push(emptyStateMessage('topics'));
		} else {
			sections.push(topicFrequencyChart(topics.all, this.settings.maxChartItems));
		}
		sections.push('');

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

		sections.push('## Topics by Source');
		sections.push('');

		if (this.settings.topicSources.includes('tags')) {
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

		if (this.settings.topicSources.includes('headings')) {
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

		if (this.settings.topicSources.includes('links')) {
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

	private escapeTableCell(text: string): string {
		return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
	}
}
