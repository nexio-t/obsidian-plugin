import { App, PluginSettingTab, Setting, TFolder } from 'obsidian';
import { VaultInsightsSettings, TopicSource, ChartType, GroupBy } from './types';
import VaultInsightsPlugin from '../main';

/**
 * Settings tab for Vault Insights plugin.
 * Organized into sections: Summary, Todo, Topics, Ollama, Visualization.
 */
export class VaultInsightsSettingTab extends PluginSettingTab {
  plugin: VaultInsightsPlugin;

  constructor(app: App, plugin: VaultInsightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: 'Vault Insights Settings' });

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
    containerEl.createEl('h2', { text: 'Summary Settings' });

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
      .setDesc('Number of days to include in weekly summary.')
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
  }

  /**
   * Todo aggregation settings section.
   */
  private addTodoSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Todo Settings' });

    new Setting(containerEl)
      .setName('Source folders')
      .setDesc('Folders to scan for tasks. Leave empty to scan all folders.')
      .addText((text) =>
        text
          .setPlaceholder('folder1, folder2')
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
          .setPlaceholder('templates, archive')
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
    containerEl.createEl('h2', { text: 'Topic Settings' });

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
          .setPlaceholder('daily, template')
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
    containerEl.createEl('h2', { text: 'Ollama Settings (Desktop Only)' });

    const descEl = containerEl.createEl('p', {
      text: 'Ollama provides optional AI-powered topic extraction and summarization. It runs locally on your machine.',
      cls: 'setting-item-description',
    });
    descEl.style.marginBottom = '1em';

    new Setting(containerEl)
      .setName('Enable Ollama')
      .setDesc('Use Ollama for AI-powered features. Requires Ollama running locally.')
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
      .setDesc('URL of your local Ollama instance.')
      .addText((text) =>
        text
          .setPlaceholder('http://localhost:11434')
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
          .setPlaceholder('llama3')
          .setValue(this.plugin.settings.ollamaModel)
          .onChange(async (value) => {
            this.plugin.settings.ollamaModel = value || 'llama3';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Test connection')
      .setDesc('Test if Ollama is available.')
      .addButton((button) =>
        button.setButtonText('Test').onClick(async () => {
          button.setButtonText('Testing...');
          try {
            const response = await fetch(
              `${this.plugin.settings.ollamaUrl}/api/tags`
            );
            if (response.ok) {
              button.setButtonText('Connected!');
            } else {
              button.setButtonText('Failed');
            }
          } catch {
            button.setButtonText('Failed');
          }
          setTimeout(() => button.setButtonText('Test'), 2000);
        })
      );
  }

  /**
   * Visualization settings section.
   */
  private addVisualizationSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Visualization Settings' });

    new Setting(containerEl)
      .setName('Chart type')
      .setDesc('Rendering engine for charts.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('mermaid', 'Mermaid (Native)')
          .addOption('chartjs', 'Chart.js (Richer)')
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
  }
}
