/**
 * Tests for src/visualizations/chartjs.ts
 *
 * Tests pure functions for Chart.js config generation.
 * These functions produce JSON configs in chartjs fenced code blocks.
 */

import {
	generateChartJsPieChart,
	generateChartJsBarChart,
	generateChartJsTimeline,
	wrapChartJsConfig,
} from '../../src/visualizations/chartjs';
import type { ChartDataPoint, TimelineEvent } from '../../src/types';

// ============================================================================
// Helper to extract JSON from chartjs code block
// ============================================================================

function extractConfig(output: string): Record<string, any> {
	const match = output.match(/```chartjs\n([\s\S]+?)\n```/);
	if (!match) throw new Error('No chartjs code block found');
	return JSON.parse(match[1]);
}

// ============================================================================
// wrapChartJsConfig Tests
// ============================================================================

describe('wrapChartJsConfig', () => {
	it('should wrap config in chartjs fenced code block', () => {
		const config = { type: 'bar' };
		const result = wrapChartJsConfig(config);

		expect(result).toContain('```chartjs');
		expect(result).toContain('```');
		expect(result).toContain('"type": "bar"');
	});

	it('should produce valid JSON inside the block', () => {
		const config = { type: 'pie', data: { labels: ['A', 'B'] } };
		const result = wrapChartJsConfig(config);
		const parsed = extractConfig(result);

		expect(parsed.type).toBe('pie');
		expect(parsed.data.labels).toEqual(['A', 'B']);
	});
});

// ============================================================================
// generateChartJsPieChart Tests
// ============================================================================

describe('generateChartJsPieChart', () => {
	describe('basic functionality', () => {
		it('should generate a doughnut chart config', () => {
			const data: ChartDataPoint[] = [
				{ label: 'Category A', value: 30 },
				{ label: 'Category B', value: 70 },
			];
			const result = generateChartJsPieChart(data, 'Test Chart');
			const config = extractConfig(result);

			expect(config.type).toBe('doughnut');
			expect(config.data.labels).toEqual(['Category B', 'Category A']);
			expect(config.data.datasets[0].data).toEqual([70, 30]);
		});

		it('should include title in options', () => {
			const data: ChartDataPoint[] = [{ label: 'A', value: 10 }];
			const result = generateChartJsPieChart(data, 'My Title');
			const config = extractConfig(result);

			expect(config.options.plugins.title.display).toBe(true);
			expect(config.options.plugins.title.text).toBe('My Title');
		});

		it('should set legend position to bottom', () => {
			const data: ChartDataPoint[] = [{ label: 'A', value: 10 }];
			const result = generateChartJsPieChart(data, 'Test');
			const config = extractConfig(result);

			expect(config.options.plugins.legend.position).toBe('bottom');
		});

		it('should sort data by value descending', () => {
			const data: ChartDataPoint[] = [
				{ label: 'Small', value: 10 },
				{ label: 'Large', value: 100 },
				{ label: 'Medium', value: 50 },
			];
			const result = generateChartJsPieChart(data, 'Sorted');
			const config = extractConfig(result);

			expect(config.data.labels).toEqual(['Large', 'Medium', 'Small']);
			expect(config.data.datasets[0].data).toEqual([100, 50, 10]);
		});
	});

	describe('empty data handling', () => {
		it('should return empty string for empty data array', () => {
			expect(generateChartJsPieChart([], 'Empty')).toBe('');
		});
	});

	describe('maxItems limiting', () => {
		it('should limit to default 10 items', () => {
			const data: ChartDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
				label: `Item ${i}`,
				value: 15 - i,
			}));
			const result = generateChartJsPieChart(data, 'Limited');
			const config = extractConfig(result);

			expect(config.data.labels.length).toBe(10);
			expect(config.data.datasets[0].data.length).toBe(10);
		});

		it('should respect custom maxItems parameter', () => {
			const data: ChartDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
				label: `Item ${i}`,
				value: 10 - i,
			}));
			const result = generateChartJsPieChart(data, 'Limited', 5);
			const config = extractConfig(result);

			expect(config.data.labels.length).toBe(5);
		});

		it('should include highest value items when limiting', () => {
			const data: ChartDataPoint[] = [
				{ label: 'Highest', value: 100 },
				{ label: 'Lowest', value: 1 },
				{ label: 'Medium', value: 50 },
			];
			const result = generateChartJsPieChart(data, 'Chart', 2);
			const config = extractConfig(result);

			expect(config.data.labels).toContain('Highest');
			expect(config.data.labels).toContain('Medium');
			expect(config.data.labels).not.toContain('Lowest');
		});
	});

	describe('color assignment', () => {
		it('should assign backgroundColor and borderColor arrays', () => {
			const data: ChartDataPoint[] = [
				{ label: 'A', value: 10 },
				{ label: 'B', value: 20 },
			];
			const result = generateChartJsPieChart(data, 'Colors');
			const config = extractConfig(result);
			const dataset = config.data.datasets[0];

			expect(dataset.backgroundColor).toHaveLength(2);
			expect(dataset.borderColor).toHaveLength(2);
			// Background should have 0.6 alpha
			expect(dataset.backgroundColor[0]).toContain('0.6');
			// Border should have 1 alpha
			expect(dataset.borderColor[0]).toContain(', 1)');
		});

		it('should cycle colors for more than 10 items', () => {
			const data: ChartDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
				label: `Item ${i}`,
				value: 12 - i,
			}));
			const result = generateChartJsPieChart(data, 'Many', 12);
			const config = extractConfig(result);
			const dataset = config.data.datasets[0];

			expect(dataset.backgroundColor).toHaveLength(12);
			// Color at index 10 should match color at index 0 (cycled)
			expect(dataset.backgroundColor[10]).toBe(dataset.backgroundColor[0]);
			expect(dataset.backgroundColor[11]).toBe(dataset.backgroundColor[1]);
		});
	});

	describe('valid JSON output', () => {
		it('should produce valid JSON in the code block', () => {
			const data: ChartDataPoint[] = [
				{ label: 'Test "quotes"', value: 50 },
			];
			const result = generateChartJsPieChart(data, 'JSON Test');

			expect(() => extractConfig(result)).not.toThrow();
		});
	});
});

// ============================================================================
// generateChartJsBarChart Tests
// ============================================================================

describe('generateChartJsBarChart', () => {
	describe('basic functionality', () => {
		it('should generate a horizontal bar chart config', () => {
			const data: ChartDataPoint[] = [
				{ label: 'A', value: 30 },
				{ label: 'B', value: 70 },
			];
			const result = generateChartJsBarChart(data, 'Bar Chart');
			const config = extractConfig(result);

			expect(config.type).toBe('bar');
			expect(config.options.indexAxis).toBe('y');
		});

		it('should sort data by value descending by default', () => {
			const data: ChartDataPoint[] = [
				{ label: 'Small', value: 10 },
				{ label: 'Large', value: 100 },
			];
			const result = generateChartJsBarChart(data, 'Test');
			const config = extractConfig(result);

			expect(config.data.labels[0]).toBe('Large');
			expect(config.data.datasets[0].data[0]).toBe(100);
		});

		it('should hide legend for bar charts', () => {
			const data: ChartDataPoint[] = [{ label: 'A', value: 10 }];
			const result = generateChartJsBarChart(data, 'Test');
			const config = extractConfig(result);

			expect(config.options.plugins.legend.display).toBe(false);
		});

		it('should set x scale to begin at zero', () => {
			const data: ChartDataPoint[] = [{ label: 'A', value: 10 }];
			const result = generateChartJsBarChart(data, 'Test');
			const config = extractConfig(result);

			expect(config.options.scales.x.beginAtZero).toBe(true);
		});
	});

	describe('preserveOrder', () => {
		it('should preserve original order when preserveOrder is true', () => {
			const data: ChartDataPoint[] = [
				{ label: 'Mon', value: 3 },
				{ label: 'Tue', value: 7 },
				{ label: 'Wed', value: 1 },
			];
			const result = generateChartJsBarChart(data, 'Activity', 10, true);
			const config = extractConfig(result);

			expect(config.data.labels).toEqual(['Mon', 'Tue', 'Wed']);
			expect(config.data.datasets[0].data).toEqual([3, 7, 1]);
		});

		it('should sort by value when preserveOrder is false', () => {
			const data: ChartDataPoint[] = [
				{ label: 'Mon', value: 3 },
				{ label: 'Tue', value: 7 },
				{ label: 'Wed', value: 1 },
			];
			const result = generateChartJsBarChart(data, 'Activity', 10, false);
			const config = extractConfig(result);

			expect(config.data.labels).toEqual(['Tue', 'Mon', 'Wed']);
		});
	});

	describe('empty data handling', () => {
		it('should return empty string for empty data array', () => {
			expect(generateChartJsBarChart([], 'Empty')).toBe('');
		});
	});

	describe('maxItems limiting', () => {
		it('should limit to default 10 items', () => {
			const data: ChartDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
				label: `Item ${i}`,
				value: 15 - i,
			}));
			const result = generateChartJsBarChart(data, 'Limited');
			const config = extractConfig(result);

			expect(config.data.labels.length).toBe(10);
		});

		it('should respect custom maxItems', () => {
			const data: ChartDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
				label: `Item ${i}`,
				value: 10 - i,
			}));
			const result = generateChartJsBarChart(data, 'Limited', 3);
			const config = extractConfig(result);

			expect(config.data.labels.length).toBe(3);
		});
	});

	describe('color assignment', () => {
		it('should assign per-bar colors', () => {
			const data: ChartDataPoint[] = [
				{ label: 'A', value: 10 },
				{ label: 'B', value: 20 },
				{ label: 'C', value: 30 },
			];
			const result = generateChartJsBarChart(data, 'Colors');
			const config = extractConfig(result);
			const dataset = config.data.datasets[0];

			expect(dataset.backgroundColor).toHaveLength(3);
			expect(dataset.borderColor).toHaveLength(3);
		});
	});
});

// ============================================================================
// generateChartJsTimeline Tests
// ============================================================================

describe('generateChartJsTimeline', () => {
	const createDate = (month: number, day: number, year: number = 2024): Date => {
		return new Date(year, month - 1, day);
	};

	describe('basic functionality', () => {
		it('should generate a vertical bar chart config', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(1, 15), label: 'Event 1' },
				{ date: createDate(1, 20), label: 'Event 2' },
			];
			const result = generateChartJsTimeline(events, 'Timeline');
			const config = extractConfig(result);

			expect(config.type).toBe('bar');
			// Timeline should be vertical (no indexAxis: 'y')
			expect(config.options.indexAxis).toBeUndefined();
		});

		it('should aggregate events by date', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(1, 15), label: 'Event 1' },
				{ date: createDate(1, 15), label: 'Event 2' },
				{ date: createDate(1, 20), label: 'Event 3' },
			];
			const result = generateChartJsTimeline(events, 'Timeline');
			const config = extractConfig(result);

			expect(config.data.labels).toHaveLength(2);
			expect(config.data.labels).toContain('2024-01-15');
			expect(config.data.labels).toContain('2024-01-20');
			// Jan 15 has 2 events
			const idx15 = config.data.labels.indexOf('2024-01-15');
			expect(config.data.datasets[0].data[idx15]).toBe(2);
		});

		it('should sort dates chronologically', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(3, 1), label: 'March' },
				{ date: createDate(1, 1), label: 'January' },
				{ date: createDate(2, 1), label: 'February' },
			];
			const result = generateChartJsTimeline(events, 'Sorted');
			const config = extractConfig(result);

			expect(config.data.labels).toEqual([
				'2024-01-01',
				'2024-02-01',
				'2024-03-01',
			]);
		});
	});

	describe('empty data handling', () => {
		it('should return empty string for empty events array', () => {
			expect(generateChartJsTimeline([], 'Empty')).toBe('');
		});
	});

	describe('title and legend', () => {
		it('should include title', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(1, 1), label: 'E' },
			];
			const result = generateChartJsTimeline(events, 'My Timeline');
			const config = extractConfig(result);

			expect(config.options.plugins.title.text).toBe('My Timeline');
		});

		it('should hide legend', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(1, 1), label: 'E' },
			];
			const result = generateChartJsTimeline(events, 'Test');
			const config = extractConfig(result);

			expect(config.options.plugins.legend.display).toBe(false);
		});
	});

	describe('y-axis configuration', () => {
		it('should begin y-axis at zero', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(1, 1), label: 'E' },
			];
			const result = generateChartJsTimeline(events, 'Test');
			const config = extractConfig(result);

			expect(config.options.scales.y.beginAtZero).toBe(true);
		});

		it('should use integer step size for y-axis', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(1, 1), label: 'E' },
			];
			const result = generateChartJsTimeline(events, 'Test');
			const config = extractConfig(result);

			expect(config.options.scales.y.ticks.stepSize).toBe(1);
		});
	});

	describe('date formatting', () => {
		it('should format dates as YYYY-MM-DD', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(12, 25, 2024), label: 'Christmas' },
			];
			const result = generateChartJsTimeline(events, 'Dates');
			const config = extractConfig(result);

			expect(config.data.labels).toContain('2024-12-25');
		});

		it('should pad single-digit months and days', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(5, 3, 2024), label: 'May 3rd' },
			];
			const result = generateChartJsTimeline(events, 'Padded');
			const config = extractConfig(result);

			expect(config.data.labels).toContain('2024-05-03');
		});
	});

	describe('valid JSON output', () => {
		it('should produce valid JSON', () => {
			const events: TimelineEvent[] = [
				{ date: createDate(1, 1), label: 'Event "with quotes"' },
			];
			const result = generateChartJsTimeline(events, 'JSON Test');

			expect(() => extractConfig(result)).not.toThrow();
		});
	});
});
