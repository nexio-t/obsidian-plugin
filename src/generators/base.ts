import { App, Notice, TFile, normalizePath } from 'obsidian';
import { VaultInsightsSettings, GeneratedNote, NoteFrontmatter, TopicData } from '../types';
import { OllamaClient } from '../integrations/ollama';

/**
 * Abstract base class for all generators
 */
export abstract class BaseGenerator {
	protected app: App;
	protected settings: VaultInsightsSettings;
	protected ollamaClient?: OllamaClient;

	constructor(app: App, settings: VaultInsightsSettings, ollamaClient?: OllamaClient) {
		this.app = app;
		this.settings = settings;
		this.ollamaClient = ollamaClient;
	}

	/**
	 * Generate the note - implemented by each generator
	 */
	abstract generate(): Promise<GeneratedNote>;

	/**
	 * Save a generated note to the vault and optionally open it
	 */
	protected async save(note: GeneratedNote, openAfterSave: boolean = true): Promise<TFile> {
		const safePath = normalizePath(note.path);
		await this.ensureFolder(this.getFolderPath(safePath));

		const fullContent = this.buildNoteContent(note);

		const existingFile = this.app.vault.getAbstractFileByPath(safePath);

		let file: TFile;
		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, fullContent);
			file = existingFile;
		} else {
			file = await this.app.vault.create(safePath, fullContent);
		}

		if (openAfterSave) {
			await this.openFile(file);
		}

		return file;
	}

	/**
	 * Open a file in the editor
	 */
	protected async openFile(file: TFile): Promise<void> {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
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
		const escapeYamlString = (str: string): string => {
			if (/[:#\]{}&*!|>'"%@`\n\r]|\[/.test(str) || str.startsWith(' ') || str.endsWith(' ')) {
				return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
			}
			return str;
		};

		const formatValue = (key: string, value: unknown): string => {
			if (typeof value === 'string') {
				return `${key}: ${escapeYamlString(value)}`;
			}
			if (Array.isArray(value)) {
				const items = value.map(v => typeof v === 'string' ? escapeYamlString(v) : String(v));
				return `${key}: [${items.join(', ')}]`;
			}
			return `${key}: ${String(value)}`;
		};

		const isNoteFrontmatter = 'title' in frontmatter && 'generated' in frontmatter && 'generator' in frontmatter;

		if (isNoteFrontmatter) {
			const { title, generated, generator, period, startDate, endDate, tags } = frontmatter as NoteFrontmatter;
			const lines = [
				`title: ${escapeYamlString(title)}`,
				`generated: ${generated}`,
				`generator: ${generator}`,
			];

			if (period) lines.push(`period: ${period}`);
			if (startDate) lines.push(`startDate: ${startDate}`);
			if (endDate) lines.push(`endDate: ${endDate}`);
			if (tags?.length) {
				const escapedTags = tags.map(t => escapeYamlString(t));
				lines.push(`tags: [${escapedTags.join(', ')}]`);
			}

			return lines.join('\n') + '\n';
		}

		const lines = Object.entries(frontmatter).map(([key, value]) => formatValue(key, value));
		return lines.join('\n') + '\n';
	}

	/**
	 * Ensure a folder path exists, creating it if necessary
	 */
	protected async ensureFolder(folderPath: string): Promise<void> {
		if (!folderPath) return;
		const normalizedFolder = normalizePath(folderPath);

		const existing = this.app.vault.getAbstractFileByPath(normalizedFolder);
		if (existing) return;

		const parts = normalizedFolder.split('/').filter((p) => p.length > 0);
		let currentPath = '';

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const folder = this.app.vault.getAbstractFileByPath(currentPath);

			if (!folder) {
				try {
					await this.app.vault.createFolder(currentPath);
				} catch {
					// Folder may have been created by a concurrent generator
					if (!this.app.vault.getAbstractFileByPath(currentPath)) {
						throw new Error(`Failed to create folder: ${currentPath}`);
					}
				}
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
		const linkPath = (path.endsWith('.md') ? path.slice(0, -3) : path)
			.replace(/\]\]/g, '');

		if (displayText) {
			const safeDisplay = displayText.replace(/\]\]/g, '').replace(/\|/g, '-');
			return `[[${linkPath}|${safeDisplay}]]`;
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
	 * Get start of day (midnight)
	 */
	protected getStartOfDay(date: Date): Date {
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);
		return start;
	}

	/**
	 * Get end of day (23:59:59.999)
	 */
	protected getEndOfDay(date: Date): Date {
		const end = new Date(date);
		end.setHours(23, 59, 59, 999);
		return end;
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
	 * Get all markdown files in the vault, excluding generated files
	 */
	protected getAllMarkdownFiles(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	/**
	 * Get all markdown files excluding the Insights folder
	 */
	protected getUserMarkdownFiles(): TFile[] {
		const { summaryFolder } = this.settings;
		return this.getAllMarkdownFiles().filter(
			file => !this.isPathInFolder(file.path, summaryFolder)
		);
	}

	/**
	 * Get files modified within a time range (excludes generated files)
	 */
	protected getFilesModifiedBetween(
		startTime: number,
		endTime: number
	): TFile[] {
		return this.getUserMarkdownFiles().filter(
			(file) => file.stat.mtime >= startTime && file.stat.mtime <= endTime
		);
	}

	/**
	 * Get files created within a time range (excludes generated files)
	 */
	protected getFilesCreatedBetween(
		startTime: number,
		endTime: number
	): TFile[] {
		return this.getUserMarkdownFiles().filter(
			(file) => file.stat.ctime >= startTime && file.stat.ctime <= endTime
		);
	}

	/**
	 * Check if a file is in any of the specified folders
	 */
	protected isFileInFolders(file: TFile, folders: string[]): boolean {
		if (folders.length === 0) return true;
		return folders.some((folder) => this.isPathInFolder(file.path, folder));
	}

	/**
	 * Check if a file should be excluded based on folder patterns
	 */
	protected isFileExcluded(file: TFile, excludeFolders: string[]): boolean {
		if (excludeFolders.length === 0) return false;
		return excludeFolders.some((folder) => this.isPathInFolder(file.path, folder));
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
	 * Excludes files in the summaryFolder to avoid analyzing our own generated content.
	 */
	protected extractTopicsFromFiles(files: TFile[]): TopicData[] {
		const topicCounts = new Map<string, { count: number; source: 'tags' | 'headings' | 'links' }>();
		const { topicSources, maxTopics, summaryFolder, excludedTags } = this.settings;
		const excluded = new Set(excludedTags.map(tag => this.normalizeTag(tag).toLowerCase()));

		const increment = (name: string, source: 'tags' | 'headings' | 'links') => {
			const existing = topicCounts.get(name);
			topicCounts.set(name, { count: (existing?.count ?? 0) + 1, source });
		};

		for (const file of files) {
			// Skip files in the Insights folder to avoid analyzing generated content
			if (this.isPathInFolder(file.path, summaryFolder)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			if (topicSources.includes('tags')) {
				cache.tags?.forEach(tag => {
					const normalized = this.normalizeTag(tag.tag);
					if (!excluded.has(normalized.toLowerCase())) {
						increment(normalized, 'tags');
					}
				});
			}

			if (topicSources.includes('headings')) {
				cache.headings
					?.filter(h => h.level <= 2)
					.forEach(h => increment(h.heading, 'headings'));
			}

			if (topicSources.includes('links')) {
				cache.links?.forEach(link => increment(link.link, 'links'));
			}
		}

		return Array.from(topicCounts.entries())
			.map(([name, { count, source }]) => ({ name, count, source }))
			.sort((a, b) => b.count - a.count)
			.slice(0, maxTopics);
	}

	/**
	 * Count tasks in files using MetadataCache.
	 * Shared by daily and weekly summary generators.
	 */
	protected countTasksInFiles(files: TFile[]): { total: number; completed: number } {
		const tasks = files.flatMap(file => {
			const cache = this.app.metadataCache.getFileCache(file);
			return cache?.listItems?.filter(item => item.task !== undefined) ?? [];
		});

		return {
			total: tasks.length,
			completed: tasks.filter(item => item.task !== ' ').length,
		};
	}

	/**
	 * Check if Ollama is available and enabled.
	 */
	protected async isOllamaAvailable(): Promise<boolean> {
		if (!this.settings.ollamaEnabled || !this.ollamaClient) return false;
		return this.ollamaClient.isAvailable();
	}

	/**
	 * Generate a summary using Ollama with graceful fallback.
	 * Returns the summary string or null if unavailable.
	 * Notifies the user when Ollama is enabled but fails.
	 */
	protected async summarizeWithOllamaFallback(content: string): Promise<string | null> {
		if (!this.settings.ollamaEnabled || !this.ollamaClient) {
			return null;
		}

		const reachable = await this.ollamaClient.isAvailable();
		if (!reachable) {
			this.notify('Ollama is not reachable — AI summary skipped.');
			return null;
		}

		try {
			const result = await this.ollamaClient.summarize(content);
			if (!result.summary) {
				this.notify('Ollama returned an empty summary — AI summary skipped.');
				return null;
			}
			return this.sanitizeLLMResponse(result.summary);
		} catch (error) {
			console.warn('[VaultInsights] Ollama summarization failed:', error);
			this.notify('Ollama summarization failed — AI summary skipped.');
			return null;
		}
	}

	/**
	 * Extract topics using Ollama with graceful fallback.
	 * Returns extracted topics or empty array if unavailable.
	 * Notifies the user when Ollama is enabled but fails.
	 */
	protected async extractTopicsWithOllamaFallback(content: string): Promise<string[]> {
		if (!this.settings.ollamaEnabled || !this.ollamaClient) {
			return [];
		}

		const reachable = await this.ollamaClient.isAvailable();
		if (!reachable) {
			this.notify('Ollama is not reachable — AI topic extraction skipped.');
			return [];
		}

		try {
			const result = await this.ollamaClient.extractTopics(content);
			return result.topics.map(t => this.sanitizeLLMResponse(t));
		} catch (error) {
			console.warn('[VaultInsights] Ollama topic extraction failed:', error);
			this.notify('Ollama topic extraction failed — AI topics skipped.');
			return [];
		}
	}

	/**
	 * Gather content from files for AI processing.
	 * Limits content to prevent huge prompts.
	 */
	protected async gatherContentForAI(
		files: TFile[],
		maxFiles: number = 10,
		maxCharsPerFile: number = 500
	): Promise<string> {
		const contentParts: string[] = [];
		const filesToProcess = files.slice(0, maxFiles);
		const results = await this.mapWithConcurrency(
			filesToProcess,
			5,
			async (file) => {
				try {
					const content = await this.app.vault.cachedRead(file);
					const truncated = content.slice(0, maxCharsPerFile);
					return `## ${file.basename}\n${truncated}`;
				} catch {
					return '';
				}
			}
		);
		for (const part of results) {
			if (part) contentParts.push(part);
		}

		return contentParts.join('\n\n');
	}

	/**
	 * Get word count from file content
	 */
	protected async getWordCount(file: TFile): Promise<number> {
		try {
			const content = await this.app.vault.cachedRead(file);
			// Remove markdown syntax and count words
			const cleanContent = content
				.replace(/```[\s\S]*?```/g, '') // Remove code blocks
				.replace(/`[^`]+`/g, '') // Remove inline code
				.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
				.replace(/[#*_~`]/g, '') // Remove markdown symbols
				.replace(/\s+/g, ' ') // Normalize whitespace
				.trim();
			return cleanContent.split(/\s+/).filter(word => word.length > 0).length;
		} catch {
			return 0;
		}
	}

	/**
	 * Get total word count and most active note from a set of files
	 */
	protected async getWordCountStats(files: TFile[]): Promise<{
		totalWords: number;
		mostActiveNote: TFile | null;
		mostActiveWordCount: number;
	}> {
		const results = await this.mapWithConcurrency(
			files,
			5,
			async (file) => ({ file, wordCount: await this.getWordCount(file) })
		);

		let totalWords = 0;
		let mostActiveNote: TFile | null = null;
		let mostActiveWordCount = 0;

		for (const result of results) {
			totalWords += result.wordCount;
			if (result.wordCount > mostActiveWordCount) {
				mostActiveWordCount = result.wordCount;
				mostActiveNote = result.file;
			}
		}

		return { totalWords, mostActiveNote, mostActiveWordCount };
	}

	/**
	 * Sanitize LLM response text before embedding in generated markdown.
	 * Strips code fences, markdown links, image embeds, wikilinks, and headings
	 * to prevent injection of unexpected structure into generated notes.
	 */
	protected sanitizeLLMResponse(text: string): string {
		return text
			.replace(/```[\s\S]*?```/g, '')                      // Strip code fences
			.replace(/`[^`]*`/g, '')                              // Strip inline code
			.replace(/!\[[^\]]*\]\([^)]*\)/g, '')                 // Strip image embeds
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')              // Strip markdown links (keep text)
			.replace(/\[\[([^\]|]*?)(?:\|[^\]]*)?\]\]/g, '$1')    // Strip wikilinks (keep target)
			.replace(/^#{1,6}\s+/gm, '')                          // Strip heading markers
			.trim();
	}

	protected normalizeTag(tag: string): string {
		return tag.startsWith('#') ? tag.slice(1) : tag;
	}

	protected escapeTableCell(text: string): string {
		return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
	}

	protected isPathInFolder(path: string, folder: string): boolean {
		const normalized = folder.replace(/\/+$/, '');
		if (!normalized) return false;
		return path === normalized || path.startsWith(normalized + '/');
	}

	private async mapWithConcurrency<T, R>(
		items: T[],
		limit: number,
		fn: (item: T) => Promise<R>
	): Promise<R[]> {
		if (items.length === 0) return [];
		const results = new Array<R>(items.length);
		let index = 0;

		const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
			while (index < items.length) {
				const current = index++;
				results[current] = await fn(items[current]);
			}
		});

		await Promise.all(workers);
		return results;
	}
}
