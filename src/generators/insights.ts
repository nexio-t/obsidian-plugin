import { App } from 'obsidian';
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
		const allTopics = this.extractAllTopics();
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

	private extractAllTopics(): {
		all: TopicData[];
		bySource: Map<'tags' | 'headings' | 'links', TopicData[]>;
	} {
		type Source = 'tags' | 'headings' | 'links';
		const files = this.getAllMarkdownFiles();
		const sourceCounts = new Map<Source, Map<string, number>>([
			['tags', new Map()],
			['headings', new Map()],
			['links', new Map()],
		]);

		// Helper to increment count in a map
		const increment = (map: Map<string, number>, key: string) => {
			map.set(key, (map.get(key) ?? 0) + 1);
		};

		// Collect counts by source
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			if (this.settings.topicSources.includes('tags')) {
				for (const tag of cache.tags ?? []) {
					increment(sourceCounts.get('tags')!, tag.tag);
				}
			}

			if (this.settings.topicSources.includes('headings')) {
				for (const heading of cache.headings ?? []) {
					if (heading.level <= 2) {
						increment(sourceCounts.get('headings')!, heading.heading);
					}
				}
			}

			if (this.settings.topicSources.includes('links')) {
				for (const link of cache.links ?? []) {
					increment(sourceCounts.get('links')!, link.link);
				}
			}
		}

		// Helper to convert counts map to sorted TopicData array
		const toTopicData = (counts: Map<string, number>, source: Source): TopicData[] =>
			Array.from(counts.entries())
				.map(([name, count]) => ({ name, count, source }))
				.sort((a, b) => b.count - a.count)
				.slice(0, this.settings.maxTopics);

		// Build bySource map
		const bySource = new Map<Source, TopicData[]>();
		for (const [source, counts] of sourceCounts) {
			bySource.set(source, toTopicData(counts, source));
		}

		// Build combined "all" list (merge all sources, keeping first source encountered)
		const allCounts = new Map<string, { count: number; source: Source }>();
		for (const [source, counts] of sourceCounts) {
			for (const [name, count] of counts) {
				const existing = allCounts.get(name);
				if (!existing) {
					allCounts.set(name, { count, source });
				} else if (existing.source === source) {
					allCounts.set(name, { count: existing.count + count, source });
				}
			}
		}

		const all: TopicData[] = Array.from(allCounts.entries())
			.map(([name, data]) => ({ name, count: data.count, source: data.source }))
			.sort((a, b) => b.count - a.count)
			.slice(0, this.settings.maxTopics);

		return { all, bySource };
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
