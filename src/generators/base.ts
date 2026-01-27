import { App, Notice, TFile } from 'obsidian';
import { VaultInsightsSettings, GeneratedNote, NoteFrontmatter, TopicData } from '../types';

/**
 * Abstract base class for all generators
 */
export abstract class BaseGenerator {
	protected app: App;
	protected settings: VaultInsightsSettings;

	constructor(app: App, settings: VaultInsightsSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Generate the note - implemented by each generator
	 */
	abstract generate(): Promise<GeneratedNote>;

	/**
	 * Save a generated note to the vault
	 */
	protected async save(note: GeneratedNote): Promise<TFile> {
		await this.ensureFolder(this.getFolderPath(note.path));

		const fullContent = this.buildNoteContent(note);

		const existingFile = this.app.vault.getAbstractFileByPath(note.path);

		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, fullContent);
			return existingFile;
		}

		return await this.app.vault.create(note.path, fullContent);
	}

	/**
	 * Build the complete note content with frontmatter
	 */
	private buildNoteContent(note: GeneratedNote): string {
		const frontmatterYaml = this.buildFrontmatter(note.frontmatter);
		return `---\n${frontmatterYaml}---\n\n${note.content}`;
	}

	/**
	 * Build YAML frontmatter string
	 */
	private buildFrontmatter(frontmatter: NoteFrontmatter | Record<string, unknown>): string {
		const lines: string[] = [];

		// Handle NoteFrontmatter type
		if ('title' in frontmatter && 'generated' in frontmatter && 'generator' in frontmatter) {
			const fm = frontmatter as NoteFrontmatter;
			lines.push(`title: "${fm.title}"`);
			lines.push(`generated: ${fm.generated}`);
			lines.push(`generator: ${fm.generator}`);

			if (fm.period) {
				lines.push(`period: ${fm.period}`);
			}

			if (fm.startDate) {
				lines.push(`startDate: ${fm.startDate}`);
			}

			if (fm.endDate) {
				lines.push(`endDate: ${fm.endDate}`);
			}

			if (fm.tags && fm.tags.length > 0) {
				lines.push(`tags: [${fm.tags.join(', ')}]`);
			}
		} else {
			// Handle generic Record<string, unknown>
			for (const [key, value] of Object.entries(frontmatter)) {
				if (typeof value === 'string') {
					lines.push(`${key}: "${value}"`);
				} else if (Array.isArray(value)) {
					lines.push(`${key}: [${value.join(', ')}]`);
				} else {
					lines.push(`${key}: ${value}`);
				}
			}
		}

		return lines.join('\n') + '\n';
	}

	/**
	 * Ensure a folder path exists, creating it if necessary
	 */
	protected async ensureFolder(folderPath: string): Promise<void> {
		if (!folderPath) return;

		const existing = this.app.vault.getAbstractFileByPath(folderPath);
		if (existing) return;

		const parts = folderPath.split('/').filter((p) => p.length > 0);
		let currentPath = '';

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const folder = this.app.vault.getAbstractFileByPath(currentPath);

			if (!folder) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}

	/**
	 * Get the folder path from a file path
	 */
	private getFolderPath(filePath: string): string {
		const lastSlash = filePath.lastIndexOf('/');
		return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
	}

	/**
	 * Format date as YYYY-MM-DD
	 */
	protected formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * Format date for display (January 26, 2026)
	 */
	protected formatDateDisplay(date: Date): string {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	/**
	 * Create a wikilink
	 */
	protected wikilink(path: string, displayText?: string): string {
		const linkPath = path.endsWith('.md') ? path.slice(0, -3) : path;

		if (displayText) {
			return `[[${linkPath}|${displayText}]]`;
		}

		return `[[${linkPath}]]`;
	}

	/**
	 * Get filename without extension
	 */
	protected getFileName(file: TFile): string {
		return file.basename;
	}

	/**
	 * Get start of day timestamp (midnight)
	 */
	protected getStartOfDay(date: Date): number {
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);
		return start.getTime();
	}

	/**
	 * Get end of day timestamp (23:59:59.999)
	 */
	protected getEndOfDay(date: Date): number {
		const end = new Date(date);
		end.setHours(23, 59, 59, 999);
		return end.getTime();
	}

	/**
	 * Get start of week (Sunday)
	 */
	protected getStartOfWeek(date: Date): Date {
		const start = new Date(date);
		const day = start.getDay();
		start.setDate(start.getDate() - day);
		start.setHours(0, 0, 0, 0);
		return start;
	}

	/**
	 * Get end of week (Saturday)
	 */
	protected getEndOfWeek(date: Date): Date {
		const end = new Date(date);
		const day = end.getDay();
		end.setDate(end.getDate() + (6 - day));
		end.setHours(23, 59, 59, 999);
		return end;
	}

	/**
	 * Show a notice to the user
	 */
	protected notify(message: string): void {
		new Notice(message);
	}

	/**
	 * Get all markdown files in the vault
	 */
	protected getAllMarkdownFiles(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	/**
	 * Get files modified within a time range
	 */
	protected getFilesModifiedBetween(
		startTime: number,
		endTime: number
	): TFile[] {
		return this.getAllMarkdownFiles().filter(
			(file) => file.stat.mtime >= startTime && file.stat.mtime <= endTime
		);
	}

	/**
	 * Get files created within a time range
	 */
	protected getFilesCreatedBetween(
		startTime: number,
		endTime: number
	): TFile[] {
		return this.getAllMarkdownFiles().filter(
			(file) => file.stat.ctime >= startTime && file.stat.ctime <= endTime
		);
	}

	/**
	 * Check if a file is in any of the specified folders
	 */
	protected isFileInFolders(file: TFile, folders: string[]): boolean {
		if (folders.length === 0) return true;
		return folders.some((folder) => file.path.startsWith(folder));
	}

	/**
	 * Check if a file should be excluded based on folder patterns
	 */
	protected isFileExcluded(file: TFile, excludeFolders: string[]): boolean {
		if (excludeFolders.length === 0) return false;
		return excludeFolders.some((folder) => file.path.startsWith(folder));
	}

	/**
	 * Generate ISO timestamp for frontmatter
	 */
	protected getISOTimestamp(): string {
		return new Date().toISOString();
	}

	/**
	 * Extract topics from files based on configured sources.
	 * Shared by daily and weekly summary generators.
	 */
	protected extractTopicsFromFiles(files: TFile[]): TopicData[] {
		const topicCounts = new Map<string, { count: number; source: 'tags' | 'headings' | 'links' }>();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			// Extract tags
			if (this.settings.topicSources.includes('tags')) {
				for (const tag of cache.tags ?? []) {
					const existing = topicCounts.get(tag.tag);
					topicCounts.set(tag.tag, {
						count: (existing?.count ?? 0) + 1,
						source: 'tags',
					});
				}
			}

			// Extract headings (level 1-2 only)
			if (this.settings.topicSources.includes('headings')) {
				for (const heading of cache.headings ?? []) {
					if (heading.level <= 2) {
						const existing = topicCounts.get(heading.heading);
						topicCounts.set(heading.heading, {
							count: (existing?.count ?? 0) + 1,
							source: 'headings',
						});
					}
				}
			}

			// Extract links
			if (this.settings.topicSources.includes('links')) {
				for (const link of cache.links ?? []) {
					const existing = topicCounts.get(link.link);
					topicCounts.set(link.link, {
						count: (existing?.count ?? 0) + 1,
						source: 'links',
					});
				}
			}
		}

		return Array.from(topicCounts.entries())
			.map(([name, data]) => ({ name, count: data.count, source: data.source }))
			.sort((a, b) => b.count - a.count)
			.slice(0, this.settings.maxTopics);
	}

	/**
	 * Count tasks in files using MetadataCache.
	 * Shared by daily and weekly summary generators.
	 */
	protected countTasksInFiles(files: TFile[]): { total: number; completed: number } {
		let total = 0;
		let completed = 0;

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.listItems) continue;

			for (const item of cache.listItems) {
				if (item.task !== undefined) {
					total++;
					if (item.task !== ' ') completed++;
				}
			}
		}

		return { total, completed };
	}
}
