import { App, Notice, TFile, TFolder } from 'obsidian';
import { VaultInsightsSettings, GeneratedNote, NoteFrontmatter } from '../types';

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
	private buildFrontmatter(frontmatter: NoteFrontmatter): string {
		const lines: string[] = [];

		lines.push(`title: "${frontmatter.title}"`);
		lines.push(`generated: ${frontmatter.generated}`);
		lines.push(`generator: ${frontmatter.generator}`);

		if (frontmatter.period) {
			lines.push(`period: ${frontmatter.period}`);
		}

		if (frontmatter.startDate) {
			lines.push(`startDate: ${frontmatter.startDate}`);
		}

		if (frontmatter.endDate) {
			lines.push(`endDate: ${frontmatter.endDate}`);
		}

		if (frontmatter.tags && frontmatter.tags.length > 0) {
			lines.push(`tags: [${frontmatter.tags.join(', ')}]`);
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
		const months = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		];
		return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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
}
