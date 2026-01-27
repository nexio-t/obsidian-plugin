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
      callback: () => this.runGenerator('daily summary', () => {
        const generator = new DailySummaryGenerator(this.app, this.settings);
        return generator.generate();
      }),
    });

    // Generate weekly summary
    this.addCommand({
      id: 'generate-weekly-summary',
      name: 'Generate weekly summary',
      callback: () => this.runGenerator('weekly summary', () => {
        const generator = new WeeklySummaryGenerator(this.app, this.settings);
        return generator.generate();
      }),
    });

    // Generate todo list
    this.addCommand({
      id: 'generate-todo-list',
      name: 'Generate todo list',
      callback: () => this.runGenerator('todo list', () => {
        const generator = new TodoListGenerator(this.app, this.settings);
        return generator.generate();
      }),
    });

    // Generate topic analysis
    this.addCommand({
      id: 'generate-topic-analysis',
      name: 'Analyze vault topics',
      callback: () => this.runGenerator('topic analysis', () => {
        const generator = new InsightsGenerator(this.app, this.settings);
        return generator.generate();
      }),
    });

    // Refresh all insights
    this.addCommand({
      id: 'refresh-insights',
      name: 'Refresh all insights',
      callback: () => this.refreshAllInsights(),
    });
  }

  /**
   * Run a generator with error handling.
   */
  private async runGenerator(name: string, fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      console.error(`[VaultInsights] ${name} generation failed:`, error);
      new Notice(`Failed to generate ${name}. Check console for details.`);
    }
  }

  /**
   * Refresh all insights with proper error handling.
   * Uses Promise.allSettled to continue even if some generators fail.
   */
  private async refreshAllInsights(): Promise<void> {
    new Notice('Refreshing all insights...');

    const generators = [
      { name: 'daily summary', gen: new DailySummaryGenerator(this.app, this.settings) },
      { name: 'weekly summary', gen: new WeeklySummaryGenerator(this.app, this.settings) },
      { name: 'todo list', gen: new TodoListGenerator(this.app, this.settings) },
      { name: 'insights', gen: new InsightsGenerator(this.app, this.settings) },
    ];

    const results = await Promise.allSettled(
      generators.map(({ gen }) => gen.generate())
    );

    // Check for failures
    const failures: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const name = generators[index].name;
        failures.push(name);
        console.error(`[VaultInsights] ${name} failed:`, result.reason);
      }
    });

    if (failures.length === 0) {
      new Notice('All insights refreshed!');
    } else if (failures.length === generators.length) {
      new Notice('All insights failed to generate. Check console for details.');
    } else {
      new Notice(`Insights refreshed with ${failures.length} failure(s): ${failures.join(', ')}`);
    }
  }
}
