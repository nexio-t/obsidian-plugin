import { Notice, Plugin } from 'obsidian';
import { VaultInsightsSettings, DEFAULT_SETTINGS } from './src/types';
import { VaultInsightsSettingTab } from './src/settings';
import { VaultScanner } from './src/core/scanner';
import { InsightsCache } from './src/core/cache';
import {
  DailySummaryGenerator,
  WeeklySummaryGenerator,
  TodoListGenerator,
  InsightsGenerator,
} from './src/generators';

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
      callback: async () => {
        const generator = new DailySummaryGenerator(this.app, this.settings);
        await generator.generate();
      },
    });

    // Generate weekly summary
    this.addCommand({
      id: 'generate-weekly-summary',
      name: 'Generate weekly summary',
      callback: async () => {
        const generator = new WeeklySummaryGenerator(this.app, this.settings);
        await generator.generate();
      },
    });

    // Generate todo list
    this.addCommand({
      id: 'generate-todo-list',
      name: 'Generate todo list',
      callback: async () => {
        const generator = new TodoListGenerator(this.app, this.settings);
        await generator.generate();
      },
    });

    // Generate topic analysis
    this.addCommand({
      id: 'generate-topic-analysis',
      name: 'Analyze vault topics',
      callback: async () => {
        const generator = new InsightsGenerator(this.app, this.settings);
        await generator.generate();
      },
    });

    // Refresh all insights
    this.addCommand({
      id: 'refresh-insights',
      name: 'Refresh all insights',
      callback: async () => {
        new Notice('Refreshing all insights...');
        const daily = new DailySummaryGenerator(this.app, this.settings);
        const weekly = new WeeklySummaryGenerator(this.app, this.settings);
        const todo = new TodoListGenerator(this.app, this.settings);
        const insights = new InsightsGenerator(this.app, this.settings);

        await Promise.all([
          daily.generate(),
          weekly.generate(),
          todo.generate(),
          insights.generate(),
        ]);
        new Notice('All insights refreshed!');
      },
    });
  }
}
