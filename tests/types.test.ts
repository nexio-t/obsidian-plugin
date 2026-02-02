/**
 * Tests for src/types.ts
 *
 * Tests the DEFAULT_SETTINGS object to ensure all required keys are present
 * with correct default values and appropriate types.
 */

import {
  DEFAULT_SETTINGS,
  VaultInsightsSettings,
  TopicSource,
  ChartType,
  GroupBy,
} from '../src/types';

describe('DEFAULT_SETTINGS', () => {
  // ============================================================================
  // Structure Tests
  // ============================================================================

  describe('structure validation', () => {
    it('should have all required keys', () => {
      const requiredKeys: (keyof VaultInsightsSettings)[] = [
        // Summary settings
        'summaryFolder',
        'dailySummaryEnabled',
        'weeklySummaryEnabled',
        'summaryTime',
        'dailyLookbackDays',
        'weeklyLookbackDays',
        // Todo settings
        'todoSourceFolders',
        'todoExcludeFolders',
        'todoGroupBy',
        'todoIncludeCompleted',
        // Topic settings
        'topicSources',
        'maxTopics',
        'excludedTags',
        // Ollama settings
        'ollamaEnabled',
        'ollamaUrl',
        'ollamaModel',
        // Visualization settings
        'chartType',
        'maxChartItems',
        // Section visibility settings
        'showAISummary',
        'showCharts',
        'showFileList',
        'showTopicTable',
      ];

      for (const key of requiredKeys) {
        expect(DEFAULT_SETTINGS).toHaveProperty(key);
      }
    });

    it('should not have any unexpected keys', () => {
      const expectedKeys: (keyof VaultInsightsSettings)[] = [
        'summaryFolder',
        'dailySummaryEnabled',
        'weeklySummaryEnabled',
        'summaryTime',
        'dailyLookbackDays',
        'weeklyLookbackDays',
        'todoSourceFolders',
        'todoExcludeFolders',
        'todoGroupBy',
        'todoIncludeCompleted',
        'topicSources',
        'maxTopics',
        'excludedTags',
        'ollamaEnabled',
        'ollamaUrl',
        'ollamaModel',
        'chartType',
        'maxChartItems',
        'showAISummary',
        'showCharts',
        'showFileList',
        'showTopicTable',
      ];

      const actualKeys = Object.keys(DEFAULT_SETTINGS);
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  // ============================================================================
  // Summary Settings Tests
  // ============================================================================

  describe('summary settings', () => {
    it('should have correct summaryFolder default', () => {
      expect(DEFAULT_SETTINGS.summaryFolder).toBe('Insights');
    });

    it('should have summaryFolder as a string', () => {
      expect(typeof DEFAULT_SETTINGS.summaryFolder).toBe('string');
    });

    it('should enable daily summaries by default', () => {
      expect(DEFAULT_SETTINGS.dailySummaryEnabled).toBe(true);
    });

    it('should enable weekly summaries by default', () => {
      expect(DEFAULT_SETTINGS.weeklySummaryEnabled).toBe(true);
    });

    it('should have dailySummaryEnabled as boolean', () => {
      expect(typeof DEFAULT_SETTINGS.dailySummaryEnabled).toBe('boolean');
    });

    it('should have weeklySummaryEnabled as boolean', () => {
      expect(typeof DEFAULT_SETTINGS.weeklySummaryEnabled).toBe('boolean');
    });

    it('should have correct summaryTime default (09:00)', () => {
      expect(DEFAULT_SETTINGS.summaryTime).toBe('09:00');
    });

    it('should have summaryTime in valid HH:MM format', () => {
      expect(DEFAULT_SETTINGS.summaryTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should have correct dailyLookbackDays default', () => {
      expect(DEFAULT_SETTINGS.dailyLookbackDays).toBe(1);
    });

    it('should have dailyLookbackDays as positive number', () => {
      expect(typeof DEFAULT_SETTINGS.dailyLookbackDays).toBe('number');
      expect(DEFAULT_SETTINGS.dailyLookbackDays).toBeGreaterThan(0);
    });

    it('should have correct weeklyLookbackDays default', () => {
      expect(DEFAULT_SETTINGS.weeklyLookbackDays).toBe(7);
    });

    it('should have weeklyLookbackDays as positive number', () => {
      expect(typeof DEFAULT_SETTINGS.weeklyLookbackDays).toBe('number');
      expect(DEFAULT_SETTINGS.weeklyLookbackDays).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Todo Settings Tests
  // ============================================================================

  describe('todo settings', () => {
    it('should have empty todoSourceFolders array by default', () => {
      expect(DEFAULT_SETTINGS.todoSourceFolders).toEqual([]);
      expect(Array.isArray(DEFAULT_SETTINGS.todoSourceFolders)).toBe(true);
    });

    it('should have sensible todoExcludeFolders defaults', () => {
      expect(DEFAULT_SETTINGS.todoExcludeFolders).toContain('templates');
      expect(DEFAULT_SETTINGS.todoExcludeFolders).toContain('archive');
    });

    it('should have todoExcludeFolders as array', () => {
      expect(Array.isArray(DEFAULT_SETTINGS.todoExcludeFolders)).toBe(true);
    });

    it('should have correct todoGroupBy default', () => {
      expect(DEFAULT_SETTINGS.todoGroupBy).toBe('file');
    });

    it('should have valid todoGroupBy value', () => {
      const validValues: GroupBy[] = ['file', 'date', 'tag'];
      expect(validValues).toContain(DEFAULT_SETTINGS.todoGroupBy);
    });

    it('should not include completed tasks by default', () => {
      expect(DEFAULT_SETTINGS.todoIncludeCompleted).toBe(false);
    });

    it('should have todoIncludeCompleted as boolean', () => {
      expect(typeof DEFAULT_SETTINGS.todoIncludeCompleted).toBe('boolean');
    });
  });

  // ============================================================================
  // Topic Settings Tests
  // ============================================================================

  describe('topic settings', () => {
    it('should have sensible topicSources defaults', () => {
      expect(DEFAULT_SETTINGS.topicSources).toContain('tags');
      expect(DEFAULT_SETTINGS.topicSources).toContain('headings');
    });

    it('should have topicSources as array', () => {
      expect(Array.isArray(DEFAULT_SETTINGS.topicSources)).toBe(true);
    });

    it('should only contain valid topicSources values', () => {
      const validSources: TopicSource[] = ['tags', 'headings', 'links'];
      for (const source of DEFAULT_SETTINGS.topicSources) {
        expect(validSources).toContain(source);
      }
    });

    it('should have correct maxTopics default', () => {
      expect(DEFAULT_SETTINGS.maxTopics).toBe(20);
    });

    it('should have maxTopics as positive number', () => {
      expect(typeof DEFAULT_SETTINGS.maxTopics).toBe('number');
      expect(DEFAULT_SETTINGS.maxTopics).toBeGreaterThan(0);
    });

    it('should have empty excludedTags array by default', () => {
      expect(DEFAULT_SETTINGS.excludedTags).toEqual([]);
      expect(Array.isArray(DEFAULT_SETTINGS.excludedTags)).toBe(true);
    });
  });

  // ============================================================================
  // Ollama Settings Tests
  // ============================================================================

  describe('ollama settings', () => {
    it('should have Ollama disabled by default', () => {
      expect(DEFAULT_SETTINGS.ollamaEnabled).toBe(false);
    });

    it('should have ollamaEnabled as boolean', () => {
      expect(typeof DEFAULT_SETTINGS.ollamaEnabled).toBe('boolean');
    });

    it('should have correct default Ollama URL', () => {
      expect(DEFAULT_SETTINGS.ollamaUrl).toBe('http://localhost:11434');
    });

    it('should have ollamaUrl as valid URL string', () => {
      expect(typeof DEFAULT_SETTINGS.ollamaUrl).toBe('string');
      expect(DEFAULT_SETTINGS.ollamaUrl).toMatch(/^https?:\/\//);
    });

    it('should have correct default Ollama model', () => {
      expect(DEFAULT_SETTINGS.ollamaModel).toBe('llama3');
    });

    it('should have ollamaModel as non-empty string', () => {
      expect(typeof DEFAULT_SETTINGS.ollamaModel).toBe('string');
      expect(DEFAULT_SETTINGS.ollamaModel.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Visualization Settings Tests
  // ============================================================================

  describe('visualization settings', () => {
    it('should have correct default chartType', () => {
      expect(DEFAULT_SETTINGS.chartType).toBe('mermaid');
    });

    it('should have valid chartType value', () => {
      const validTypes: ChartType[] = ['mermaid', 'chartjs'];
      expect(validTypes).toContain(DEFAULT_SETTINGS.chartType);
    });

    it('should have correct maxChartItems default', () => {
      expect(DEFAULT_SETTINGS.maxChartItems).toBe(10);
    });

    it('should have maxChartItems as positive number', () => {
      expect(typeof DEFAULT_SETTINGS.maxChartItems).toBe('number');
      expect(DEFAULT_SETTINGS.maxChartItems).toBeGreaterThan(0);
    });

    it('should have reasonable maxChartItems limit', () => {
      // Should not be so high that charts become unreadable
      expect(DEFAULT_SETTINGS.maxChartItems).toBeLessThanOrEqual(50);
    });
  });

  // ============================================================================
  // Section Visibility Settings Tests
  // ============================================================================

  describe('section visibility settings', () => {
    it('should show AI summary by default', () => {
      expect(DEFAULT_SETTINGS.showAISummary).toBe(true);
    });

    it('should show charts by default', () => {
      expect(DEFAULT_SETTINGS.showCharts).toBe(true);
    });

    it('should show file list by default', () => {
      expect(DEFAULT_SETTINGS.showFileList).toBe(true);
    });

    it('should show topic table by default', () => {
      expect(DEFAULT_SETTINGS.showTopicTable).toBe(true);
    });

    it('should have all visibility settings as booleans', () => {
      expect(typeof DEFAULT_SETTINGS.showAISummary).toBe('boolean');
      expect(typeof DEFAULT_SETTINGS.showCharts).toBe('boolean');
      expect(typeof DEFAULT_SETTINGS.showFileList).toBe('boolean');
      expect(typeof DEFAULT_SETTINGS.showTopicTable).toBe('boolean');
    });
  });

  // ============================================================================
  // Type Safety Tests
  // ============================================================================

  describe('type safety', () => {
    it('should satisfy VaultInsightsSettings interface', () => {
      // This test ensures compile-time type checking
      const settings: VaultInsightsSettings = DEFAULT_SETTINGS;
      expect(settings).toBeDefined();
    });

    it('should be usable as initial state for settings', () => {
      // Simulate how the plugin would use defaults
      const userSettings: VaultInsightsSettings = {
        ...DEFAULT_SETTINGS,
        summaryFolder: 'My Insights',
      };

      expect(userSettings.summaryFolder).toBe('My Insights');
      expect(userSettings.dailySummaryEnabled).toBe(true);
    });

    it('should allow partial overrides', () => {
      const partialUpdate: Partial<VaultInsightsSettings> = {
        ollamaEnabled: true,
        ollamaModel: 'mistral',
      };

      const merged: VaultInsightsSettings = {
        ...DEFAULT_SETTINGS,
        ...partialUpdate,
      };

      expect(merged.ollamaEnabled).toBe(true);
      expect(merged.ollamaModel).toBe('mistral');
      expect(merged.summaryFolder).toBe('Insights'); // Unchanged
    });
  });

  // ============================================================================
  // Default Values Consistency Tests
  // ============================================================================

  describe('default values consistency', () => {
    it('should have maxTopics greater than or equal to maxChartItems', () => {
      // maxTopics should allow at least as many items as we display in charts
      expect(DEFAULT_SETTINGS.maxTopics).toBeGreaterThanOrEqual(DEFAULT_SETTINGS.maxChartItems);
    });

    it('should have weeklyLookbackDays equal to 7', () => {
      // Weekly should cover 7 days
      expect(DEFAULT_SETTINGS.weeklyLookbackDays).toBe(7);
    });

    it('should have mermaid as default chart type (native Obsidian support)', () => {
      // Mermaid is preferred because it has native Obsidian support
      expect(DEFAULT_SETTINGS.chartType).toBe('mermaid');
    });

    it('should have Ollama disabled to respect local-first philosophy', () => {
      // Ollama should be opt-in
      expect(DEFAULT_SETTINGS.ollamaEnabled).toBe(false);
    });

    it('should exclude common non-note folders by default', () => {
      // Templates and archive are commonly excluded
      expect(DEFAULT_SETTINGS.todoExcludeFolders).toContain('templates');
      expect(DEFAULT_SETTINGS.todoExcludeFolders).toContain('archive');
    });
  });

  // ============================================================================
  // Immutability Tests
  // ============================================================================

  describe('immutability considerations', () => {
    it('should not be mutated when spreading', () => {
      const original = DEFAULT_SETTINGS.summaryFolder;

      const modified: VaultInsightsSettings = {
        ...DEFAULT_SETTINGS,
        summaryFolder: 'Changed',
      };

      expect(DEFAULT_SETTINGS.summaryFolder).toBe(original);
      expect(modified.summaryFolder).toBe('Changed');
    });

    it('should have array properties that are safe to copy', () => {
      // Ensure arrays can be safely copied without affecting defaults
      const copy = [...DEFAULT_SETTINGS.todoExcludeFolders];
      copy.push('new-folder');

      expect(copy).toContain('new-folder');
      expect(DEFAULT_SETTINGS.todoExcludeFolders).not.toContain('new-folder');
    });
  });
});
