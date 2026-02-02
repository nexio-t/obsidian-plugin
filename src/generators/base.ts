import { App, Notice, TFile } from 'obsidian';
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
		await this.ensureFolder(this.getFolderPath(note.path));

		const fullContent = this.buildNoteContent(note);

		const existingFile = this.app.vault.getAbstractFileByPath(note.path);

		let file: TFile;
		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, fullContent);
			file = existingFile;
		} else {
			file = await this.app.vault.create(note.path, fullContent);
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
		const formatValue = (key: string, value: unknown): string => {
			if (typeof value === 'string') {
				return key === 'title' ? `${key}: "${value}"` : `${key}: ${value}`;
			}
			if (Array.isArray(value)) {
				return `${key}: [${value.join(', ')}]`;
			}
			return `${key}: ${value}`;
		};

		const isNoteFrontmatter = 'title' in frontmatter && 'generated' in frontmatter && 'generator' in frontmatter;

		if (isNoteFrontmatter) {
			const { title, generated, generator, period, startDate, endDate, tags } = frontmatter as NoteFrontmatter;
			const lines = [
				`title: "${title}"`,
				`generated: ${generated}`,
				`generator: ${generator}`,
			];

			if (period) lines.push(`period: ${period}`);
			if (startDate) lines.push(`startDate: ${startDate}`);
			if (endDate) lines.push(`endDate: ${endDate}`);
			if (tags?.length) lines.push(`tags: [${tags.join(', ')}]`);

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
		const { topicSources, maxTopics } = this.settings;

		const increment = (name: string, source: 'tags' | 'headings' | 'links') => {
			const existing = topicCounts.get(name);
			topicCounts.set(name, { count: (existing?.count ?? 0) + 1, source });
		};

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			if (topicSources.includes('tags')) {
				cache.tags?.forEach(tag => increment(tag.tag, 'tags'));
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
	 */
	protected async summarizeWithOllamaFallback(content: string): Promise<string | null> {
		if (!(await this.isOllamaAvailable())) {
			return null;
		}

		try {
			const result = await this.ollamaClient!.summarize(content);
			return result.summary || null;
		} catch (error) {
			console.warn('[VaultInsights] Ollama summarization failed:', error);
			return null;
		}
	}

	/**
	 * Extract topics using Ollama with graceful fallback.
	 * Returns extracted topics or empty array if unavailable.
	 */
	protected async extractTopicsWithOllamaFallback(content: string): Promise<string[]> {
		if (!(await this.isOllamaAvailable())) {
			return [];
		}

		try {
			const result = await this.ollamaClient!.extractTopics(content);
			return result.topics;
		} catch (error) {
			console.warn('[VaultInsights] Ollama topic extraction failed:', error);
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

		for (const file of filesToProcess) {
			try {
				const content = await this.app.vault.cachedRead(file);
				const truncated = content.slice(0, maxCharsPerFile);
				contentParts.push(`## ${file.basename}\n${truncated}`);
			} catch {
				// Skip files that can't be read
			}
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
		let totalWords = 0;
		let mostActiveNote: TFile | null = null;
		let mostActiveWordCount = 0;

		for (const file of files) {
			const wordCount = await this.getWordCount(file);
			totalWords += wordCount;
			if (wordCount > mostActiveWordCount) {
				mostActiveWordCount = wordCount;
				mostActiveNote = file;
			}
		}

		return { totalWords, mostActiveNote, mostActiveWordCount };
	}
}
