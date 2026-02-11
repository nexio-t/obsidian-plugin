import { App, PluginSettingTab, Setting } from 'obsidian';
import type { TopicSource, ChartType, GroupBy } from './types';
import VaultInsightsPlugin from '../main';

/**
 * Settings tab for Vault Insights plugin.
 * Organized into sections: Summary, Todo, Topics, Ollama, Visualization.
 */
export class VaultInsightsSettingTab extends PluginSettingTab {
  plugin: VaultInsightsPlugin;
  private testButtonTimeoutId: number | null = null;

  constructor(app: App, plugin: VaultInsightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide(): void {
    // Clean up any pending timeouts when settings tab is closed
    if (this.testButtonTimeoutId !== null) {
      window.clearTimeout(this.testButtonTimeoutId);
      this.testButtonTimeoutId = null;
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.addSummarySettings(containerEl);
    this.addTodoSettings(containerEl);
    this.addTopicSettings(containerEl);
    this.addOllamaSettings(containerEl);
    this.addVisualizationSettings(containerEl);
  }

  /**
   * Summary generation settings section.
   */
  private addSummarySettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Summary').setHeading();

    new Setting(containerEl)
      .setName('Summary folder')
      .setDesc('Folder where generated summaries will be saved.')
      .addText((text) =>
        text
          .setPlaceholder('Insights')
          .setValue(this.plugin.settings.summaryFolder)
          .onChange(async (value) => {
            this.plugin.settings.summaryFolder = value || 'Insights';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Enable daily summary')
      .setDesc('Generate daily summary notes.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.dailySummaryEnabled)
          .onChange(async (value) => {
            this.plugin.settings.dailySummaryEnabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Enable weekly summary')
      .setDesc('Generate weekly summary notes.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.weeklySummaryEnabled)
          .onChange(async (value) => {
            this.plugin.settings.weeklySummaryEnabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Daily lookback days')
      .setDesc('Number of days to include in daily summary.')
      .addSlider((slider) =>
        slider
          .setLimits(1, 7, 1)
          .setValue(this.plugin.settings.dailyLookbackDays)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.dailyLookbackDays = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Weekly lookback days')
      .setDesc('Number of days to include in weekly summary (rolling mode).')
      .addSlider((slider) =>
        slider
          .setLimits(7, 14, 1)
          .setValue(this.plugin.settings.weeklyLookbackDays)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.weeklyLookbackDays = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Use calendar weeks')
      .setDesc('When enabled, weekly summaries cover sunday-saturday. When disabled, uses rolling lookback days.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.weeklyUseCalendarWeeks)
          .onChange(async (value) => {
            this.plugin.settings.weeklyUseCalendarWeeks = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Scheduled generation time')
      .setDesc('Time to auto-generate summaries. Leave empty to disable.')
      .addText((text) =>
        text
          .setPlaceholder('09:00')
          .setValue(this.plugin.settings.summaryTime)
          .onChange(async (value) => {
            this.plugin.settings.summaryTime = value || '09:00';
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Todo aggregation settings section.
   */
  private addTodoSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Todo').setHeading();

    new Setting(containerEl)
      .setName('Source folders')
      .setDesc('Folders to scan for tasks. Leave empty to scan all folders.')
      .addText((text) =>
        text
          .setPlaceholder('Example folder path')
          .setValue(this.plugin.settings.todoSourceFolders.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.todoSourceFolders = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Exclude folders')
      .setDesc('Folders to exclude from task scanning.')
      .addText((text) =>
        text
          .setPlaceholder('Example excluded folder')
          .setValue(this.plugin.settings.todoExcludeFolders.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.todoExcludeFolders = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Group tasks by')
      .setDesc('How to organize aggregated tasks.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('file', 'Source file')
          .addOption('date', 'Due date')
          .addOption('tag', 'Tag')
          .setValue(this.plugin.settings.todoGroupBy)
          .onChange(async (value) => {
            this.plugin.settings.todoGroupBy = value as GroupBy;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Include completed tasks')
      .setDesc('Include completed tasks in the aggregated list.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.todoIncludeCompleted)
          .onChange(async (value) => {
            this.plugin.settings.todoIncludeCompleted = value;
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Topic analysis settings section.
   */
  private addTopicSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Topics').setHeading();

    new Setting(containerEl)
      .setName('Topic sources')
      .setDesc('Sources for topic extraction. Select multiple.')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('tags', 'Tags')
          .addOption('headings', 'Headings')
          .addOption('links', 'Links');

        // Show current selection
        const current = this.plugin.settings.topicSources;
        dropdown.setValue(current[0] || 'tags');

        dropdown.onChange(async (value) => {
          // Toggle the selected source
          const sources = this.plugin.settings.topicSources;
          const index = sources.indexOf(value as TopicSource);
          if (index >= 0) {
            sources.splice(index, 1);
          } else {
            sources.push(value as TopicSource);
          }
          if (sources.length === 0) {
            sources.push('tags'); // Always have at least one
          }
          await this.plugin.saveSettings();
        });
      });

    // Display current topic sources
    new Setting(containerEl)
      .setName('Active topic sources')
      .setDesc('Currently selected: ' + this.plugin.settings.topicSources.join(', '));

    new Setting(containerEl)
      .setName('Max topics')
      .setDesc('Maximum number of topics to show in analysis.')
      .addSlider((slider) =>
        slider
          .setLimits(5, 50, 5)
          .setValue(this.plugin.settings.maxTopics)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxTopics = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Excluded tags')
      .setDesc('Tags to exclude from topic analysis (comma-separated).')
      .addText((text) =>
        text
          .setPlaceholder('Example excluded tag')
          .setValue(this.plugin.settings.excludedTags.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.excludedTags = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Ollama integration settings section.
   */
  private addOllamaSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Ollama (desktop only)').setHeading();

    new Setting(containerEl)
      .setName('Enable ollama')
      .setDesc('Use ollama for AI-powered topic extraction and summarization. Requires ollama running locally.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ollamaEnabled)
          .onChange(async (value) => {
            this.plugin.settings.ollamaEnabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Ollama URL')
      .setDesc('URL of your local ollama instance.')
      .addText((text) =>
        text
          .setPlaceholder('Enter endpoint URL')
          .setValue(this.plugin.settings.ollamaUrl)
          .onChange(async (value) => {
            this.plugin.settings.ollamaUrl = value || 'http://localhost:11434';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Ollama model')
      .setDesc('Model to use for AI features.')
      .addText((text) =>
        text
          .setPlaceholder('Example: llama3')
          .setValue(this.plugin.settings.ollamaModel)
          .onChange(async (value) => {
            this.plugin.settings.ollamaModel = value || 'llama3';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Test connection')
      .setDesc('Test if ollama is available and the configured model exists.')
      .addButton((button) =>
        button.setButtonText('Test').onClick(async () => {
          button.setButtonText('Testing...');
          try {
            this.plugin.ollamaClient.resetAvailabilityCache();
            const ok = await this.plugin.ollamaClient.isAvailable();
            if (!ok) {
              button.setButtonText('Failed');
            } else {
              const hasModel = await this.plugin.ollamaClient.hasModel(
                this.plugin.settings.ollamaModel
              );
              button.setButtonText(hasModel ? 'Connected!' : 'Model not found');
            }
          } catch {
            button.setButtonText('Failed');
          }
          this.testButtonTimeoutId = window.setTimeout(() => {
            button.setButtonText('Test');
            this.testButtonTimeoutId = null;
          }, 2000);
        })
      );
  }

  /**
   * Visualization settings section.
   */
  private addVisualizationSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Visualization').setHeading();

    new Setting(containerEl)
      .setName('Chart type')
      .setDesc('Rendering engine for charts.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('mermaid', 'Mermaid (native)')
          .addOption('chartjs', 'Chart js (interactive)')
          .setValue(this.plugin.settings.chartType)
          .onChange(async (value) => {
            this.plugin.settings.chartType = value as ChartType;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Max chart items')
      .setDesc('Maximum items to display in charts.')
      .addSlider((slider) =>
        slider
          .setLimits(5, 25, 1)
          .setValue(this.plugin.settings.maxChartItems)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxChartItems = value;
            await this.plugin.saveSettings();
          })
      );

    this.addSectionVisibilitySettings(containerEl);
  }

  /**
   * Section visibility settings section.
   */
  private addSectionVisibilitySettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Section visibility').setHeading();

    new Setting(containerEl)
      .setName('Show AI summary')
      .setDesc('Include AI-generated summary section (requires ollama).')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showAISummary)
          .onChange(async (value) => {
            this.plugin.settings.showAISummary = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show charts')
      .setDesc('Include charts and visualizations in generated notes.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showCharts)
          .onChange(async (value) => {
            this.plugin.settings.showCharts = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show file list')
      .setDesc('Include list of notes touched in the period.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFileList)
          .onChange(async (value) => {
            this.plugin.settings.showFileList = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show topic table')
      .setDesc('Include topic rankings table.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showTopicTable)
          .onChange(async (value) => {
            this.plugin.settings.showTopicTable = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
