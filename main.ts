import { Notice, Plugin } from 'obsidian';
import { VaultInsightsSettings, DEFAULT_SETTINGS } from './src/types';
import { VaultInsightsSettingTab } from './src/settings';
import { VaultScanner } from './src/core/scanner';
import { InsightsCache } from './src/core/cache';

/**
 * Vault Insights Plugin
 *
 * Generates actionable insights from your vault:
 * - Daily/weekly summaries
 * - Aggregated todo lists
 * - Topic analysis
 * - Content visualizations
 */
export default class VaultInsightsPlugin extends Plugin {
  settings: VaultInsightsSettings = DEFAULT_SETTINGS;
  scanner!: VaultScanner;
  cache!: InsightsCache;

  async onload(): Promise<void> {
    console.log('[VaultInsights] Loading plugin...');

    // Load settings
    await this.loadSettings();

    // Initialize cache
    this.cache = new InsightsCache();

    // Initialize scanner
    this.scanner = new VaultScanner(this.app, this.settings, this.cache);

    // Add settings tab
    this.addSettingTab(new VaultInsightsSettingTab(this.app, this));

    // Register commands
    this.registerCommands();

    console.log('[VaultInsights] Plugin loaded successfully');
  }

  async onunload(): Promise<void> {
    console.log('[VaultInsights] Unloading plugin...');

    // Clear cache
    this.cache.clear();

    console.log('[VaultInsights] Plugin unloaded');
  }

  /**
   * Load settings from data.json.
   */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * Save settings to data.json.
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Update scanner with new settings
    if (this.scanner) {
      this.scanner.updateSettings(this.settings);
    }
  }

  /**
   * Register all plugin commands.
   */
  private registerCommands(): void {
    // Generate daily summary
    this.addCommand({
      id: 'generate-daily-summary',
      name: 'Generate daily summary',
      callback: () => this.generateDailySummary(),
    });

    // Generate weekly summary
    this.addCommand({
      id: 'generate-weekly-summary',
      name: 'Generate weekly summary',
      callback: () => this.generateWeeklySummary(),
    });

    // Generate todo list
    this.addCommand({
      id: 'generate-todo-list',
      name: 'Generate todo list',
      callback: () => this.generateTodoList(),
    });

    // Generate topic analysis
    this.addCommand({
      id: 'generate-topic-analysis',
      name: 'Analyze vault topics',
      callback: () => this.generateTopicAnalysis(),
    });
  }

  /**
   * Generate daily summary note.
   * Stub implementation - will be completed by generators agent.
   */
  private async generateDailySummary(): Promise<void> {
    new Notice('Generating daily summary...');

    try {
      // Scan recent files
      const result = this.scanner.scanRecent(this.settings.dailyLookbackDays);
      console.log('[VaultInsights] Daily summary scan:', {
        files: result.totalCount,
        days: this.settings.dailyLookbackDays,
      });

      // Get metadata for scanned files
      const metadata = this.scanner.getMetadataBatch(result.files);
      console.log('[VaultInsights] Extracted metadata for', metadata.size, 'files');

      // TODO: Generate summary note (implement in generators/daily-summary.ts)
      new Notice(`Daily summary: Found ${result.totalCount} files modified in the last ${this.settings.dailyLookbackDays} day(s)`);
    } catch (error) {
      console.error('[VaultInsights] Daily summary failed:', error);
      new Notice('Failed to generate daily summary');
    }
  }

  /**
   * Generate weekly summary note.
   * Stub implementation - will be completed by generators agent.
   */
  private async generateWeeklySummary(): Promise<void> {
    new Notice('Generating weekly summary...');

    try {
      // Scan recent files
      const result = this.scanner.scanRecent(this.settings.weeklyLookbackDays);
      console.log('[VaultInsights] Weekly summary scan:', {
        files: result.totalCount,
        days: this.settings.weeklyLookbackDays,
      });

      // Get metadata for scanned files
      const metadata = this.scanner.getMetadataBatch(result.files);
      console.log('[VaultInsights] Extracted metadata for', metadata.size, 'files');

      // TODO: Generate summary note (implement in generators/weekly-summary.ts)
      new Notice(`Weekly summary: Found ${result.totalCount} files modified in the last ${this.settings.weeklyLookbackDays} day(s)`);
    } catch (error) {
      console.error('[VaultInsights] Weekly summary failed:', error);
      new Notice('Failed to generate weekly summary');
    }
  }

  /**
   * Generate aggregated todo list.
   * Stub implementation - will be completed by generators agent.
   */
  private async generateTodoList(): Promise<void> {
    new Notice('Generating todo list...');

    try {
      // Scan folders for tasks
      const result =
        this.settings.todoSourceFolders.length > 0
          ? this.scanner.scanFolders(
              this.settings.todoSourceFolders,
              this.settings.todoExcludeFolders
            )
          : this.scanner.scan({
              excludeFolders: this.settings.todoExcludeFolders,
            });

      console.log('[VaultInsights] Todo scan:', {
        files: result.totalCount,
        sourceFolders: this.settings.todoSourceFolders,
        excludeFolders: this.settings.todoExcludeFolders,
      });

      // Get metadata to count tasks
      const metadata = this.scanner.getMetadataBatch(result.files);
      let taskCount = 0;
      for (const meta of metadata.values()) {
        taskCount += meta.tasks.length;
      }

      console.log('[VaultInsights] Found', taskCount, 'tasks across', metadata.size, 'files');

      // TODO: Generate todo list note (implement in generators/todo-list.ts)
      new Notice(`Todo list: Found ${taskCount} tasks in ${metadata.size} files`);
    } catch (error) {
      console.error('[VaultInsights] Todo list failed:', error);
      new Notice('Failed to generate todo list');
    }
  }

  /**
   * Generate topic analysis note.
   * Stub implementation - will be completed by generators agent.
   */
  private async generateTopicAnalysis(): Promise<void> {
    new Notice('Analyzing vault topics...');

    try {
      // Scan all files
      const result = this.scanner.scanAll();
      console.log('[VaultInsights] Topic analysis scan:', {
        files: result.totalCount,
      });

      // Get metadata for all files
      const metadata = this.scanner.getMetadataBatch(result.files);

      // Count tags and headings
      const tagCounts = new Map<string, number>();
      const headingCounts = new Map<string, number>();

      for (const meta of metadata.values()) {
        for (const tag of meta.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
        for (const heading of meta.headings) {
          headingCounts.set(heading.text, (headingCounts.get(heading.text) || 0) + 1);
        }
      }

      console.log('[VaultInsights] Topic analysis:', {
        uniqueTags: tagCounts.size,
        uniqueHeadings: headingCounts.size,
        files: metadata.size,
      });

      // TODO: Generate analysis note (implement in generators/insights.ts)
      new Notice(`Topic analysis: Found ${tagCounts.size} unique tags and ${headingCounts.size} unique headings`);
    } catch (error) {
      console.error('[VaultInsights] Topic analysis failed:', error);
      new Notice('Failed to analyze topics');
    }
  }
}
