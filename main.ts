import { Notice, Plugin } from 'obsidian';
import { VaultInsightsSettings, DEFAULT_SETTINGS } from './src/types';
import { VaultInsightsSettingTab } from './src/settings';
import { OllamaClient } from './src/integrations/ollama';
import {
  DailySummaryGenerator,
  WeeklySummaryGenerator,
  TodoListGenerator,
  PendingTodoListGenerator,
  InsightsGenerator,
} from './src/generators';
import { registerChartJsProcessor } from './src/visualizations/chartjs-renderer';

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
  ollamaClient!: OllamaClient;
  private isRunningScheduledTasks = false;

  async onload(): Promise<void> {
    console.log('[VaultInsights] Loading plugin...');

    // Load settings
    await this.loadSettings();

    // Initialize Ollama client
    this.ollamaClient = new OllamaClient({
      url: this.settings.ollamaUrl,
      model: this.settings.ollamaModel,
    });

    // Add settings tab
    this.addSettingTab(new VaultInsightsSettingTab(this.app, this));

    // Register Chart.js code block renderer
    registerChartJsProcessor(this);

    // Register commands
    this.registerCommands();

    // Register scheduled generation check (runs every minute)
    this.registerInterval(
      window.setInterval(() => {
        void this.runScheduledTasks();
      }, 60 * 1000)
    );

    // Run once on load to catch missed schedules
    void this.runScheduledTasks();

    console.log('[VaultInsights] Plugin loaded successfully');
  }

  async onunload(): Promise<void> {
    console.log('[VaultInsights] Unloading plugin...');

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
    // Update Ollama client with new settings
    if (this.ollamaClient) {
      this.ollamaClient.setConfig({
        url: this.settings.ollamaUrl,
        model: this.settings.ollamaModel,
      });
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
        const generator = new DailySummaryGenerator(this.app, this.settings, this.ollamaClient);
        return generator.generate();
      }),
    });

    // Generate weekly summary
    this.addCommand({
      id: 'generate-weekly-summary',
      name: 'Generate weekly summary',
      callback: () => this.runGenerator('weekly summary', () => {
        const generator = new WeeklySummaryGenerator(this.app, this.settings, this.ollamaClient);
        return generator.generate();
      }),
    });

    // Generate todo list
    this.addCommand({
      id: 'generate-todo-list',
      name: 'Generate todo list',
      callback: () => this.runGenerator('todo list', () => {
        const generator = new TodoListGenerator(this.app, this.settings, this.ollamaClient);
        return generator.generate();
      }),
    });

    // Generate pending-only todo list
    this.addCommand({
      id: 'generate-pending-todo-list',
      name: 'Generate pending todo list',
      callback: () => this.runGenerator('pending todo list', () => {
        const generator = new PendingTodoListGenerator(this.app, this.settings, this.ollamaClient);
        return generator.generate();
      }),
    });

    // Generate topic analysis
    this.addCommand({
      id: 'generate-topic-analysis',
      name: 'Analyze vault topics',
      callback: () => this.runGenerator('topic analysis', () => {
        const generator = new InsightsGenerator(this.app, this.settings, this.ollamaClient);
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
  private async runGenerator(name: string, fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn();
      return true;
    } catch (error) {
      console.error(`[VaultInsights] ${name} generation failed:`, error);
      new Notice(`Failed to generate ${name}. Check console for details.`);
      return false;
    }
  }

  /**
   * Refresh all insights with proper error handling.
   * Uses Promise.allSettled to continue even if some generators fail.
   */
  private async refreshAllInsights(): Promise<void> {
    new Notice('Refreshing all insights...');

    const generators = [
      ...(this.settings.dailySummaryEnabled
        ? [{ name: 'daily summary', gen: new DailySummaryGenerator(this.app, this.settings, this.ollamaClient) }]
        : []),
      ...(this.settings.weeklySummaryEnabled
        ? [{ name: 'weekly summary', gen: new WeeklySummaryGenerator(this.app, this.settings, this.ollamaClient) }]
        : []),
      { name: 'todo list', gen: new TodoListGenerator(this.app, this.settings, this.ollamaClient) },
      { name: 'insights', gen: new InsightsGenerator(this.app, this.settings, this.ollamaClient) },
    ];

    if (generators.length === 0) {
      new Notice('No insights are enabled to refresh.');
      return;
    }

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

  /**
   * Run scheduled tasks if time has passed and tasks haven't run yet.
   */
  private async runScheduledTasks(): Promise<void> {
    if (this.isRunningScheduledTasks) return;
    this.isRunningScheduledTasks = true;
    try {
      const scheduleMinutes = this.parseScheduleMinutes(this.settings.summaryTime);
      if (scheduleMinutes === null) {
        return;
      }

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes < scheduleMinutes) {
        return;
      }

      const todayKey = this.formatDate(now);

      if (this.settings.dailySummaryEnabled && this.settings.lastDailyRun !== todayKey) {
        const ok = await this.runGenerator('daily summary', () => {
          const generator = new DailySummaryGenerator(this.app, this.settings, this.ollamaClient, now);
          return generator.generate();
        });
        if (ok) {
          this.settings.lastDailyRun = todayKey;
          await this.saveSettings();
        }
      }

      if (this.settings.weeklySummaryEnabled) {
        const weekKey = this.settings.weeklyUseCalendarWeeks
          ? this.formatDate(this.getStartOfWeek(now))
          : this.formatDate(
              this.getRollingPeriodStart(
                this.getEndOfDay(now),
                Math.max(1, this.settings.weeklyLookbackDays)
              )
            );
        if (this.settings.lastWeeklyRun !== weekKey) {
          const ok = await this.runGenerator('weekly summary', () => {
            const generator = new WeeklySummaryGenerator(this.app, this.settings, this.ollamaClient, now);
            return generator.generate();
          });
          if (ok) {
            this.settings.lastWeeklyRun = weekKey;
            await this.saveSettings();
          }
        }
      }
    } finally {
      this.isRunningScheduledTasks = false;
    }
  }

  /**
   * Parse summaryTime (HH:mm) to minutes since midnight.
   */
  private parseScheduleMinutes(time: string): number | null {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getEndOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getRollingPeriodStart(endOfPeriod: Date, lookbackDays: number): Date {
    return new Date(
      this.getStartOfDay(new Date(endOfPeriod.getTime() - (lookbackDays - 1) * 24 * 60 * 60 * 1000))
    );
  }
}
