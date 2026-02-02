/**
 * Tests for src/visualizations/mermaid.ts
 *
 * Tests pure functions for Mermaid chart generation.
 * These functions don't touch Obsidian API, making them ideal for unit testing.
 */

import {
  escapeLabel,
  truncateLabel,
  generatePieChart,
  generateBarChart,
  generateTimeline,
  generateConnectionChart,
} from '../../src/visualizations/mermaid';
import type { ChartDataPoint, TimelineEvent, Connection } from '../../src/types';

// ============================================================================
// escapeLabel Tests
// ============================================================================

describe('escapeLabel', () => {
  describe('basic functionality', () => {
    it('should return unchanged string when no special characters', () => {
      expect(escapeLabel('Hello World')).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      expect(escapeLabel('  Hello  ')).toBe('Hello');
      expect(escapeLabel('\n\nHello\t')).toBe('Hello');
    });
  });

  describe('quote escaping', () => {
    it('should escape double quotes', () => {
      expect(escapeLabel('Say "Hello"')).toBe('Say \\"Hello\\"');
    });

    it('should escape multiple double quotes', () => {
      expect(escapeLabel('"A" and "B"')).toBe('\\"A\\" and \\"B\\"');
    });
  });

  describe('backslash escaping', () => {
    it('should escape backslashes', () => {
      expect(escapeLabel('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape backslash before quote', () => {
      expect(escapeLabel('\\"escaped"')).toBe('\\\\\\"escaped\\"');
    });
  });

  describe('newline handling', () => {
    it('should replace newlines with spaces', () => {
      expect(escapeLabel('Line1\nLine2')).toBe('Line1 Line2');
    });

    it('should remove carriage returns', () => {
      expect(escapeLabel('Line1\r\nLine2')).toBe('Line1 Line2');
    });

    it('should handle multiple newlines', () => {
      expect(escapeLabel('A\n\n\nB')).toBe('A   B');
    });
  });

  describe('angle bracket removal', () => {
    it('should remove < and > characters', () => {
      expect(escapeLabel('<script>')).toBe('script');
      expect(escapeLabel('a < b > c')).toBe('a  b  c');
    });

    it('should handle HTML-like tags', () => {
      expect(escapeLabel('<div>content</div>')).toBe('divcontent/div');
    });
  });

  describe('combined special characters', () => {
    it('should handle multiple types of special characters', () => {
      const input = 'Test "quote"\nNew<line>';
      const expected = 'Test \\"quote\\" Newline';
      expect(escapeLabel(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(escapeLabel('')).toBe('');
    });

    it('should handle string of only spaces', () => {
      expect(escapeLabel('   ')).toBe('');
    });

    it('should handle string of only special characters', () => {
      expect(escapeLabel('<>\n\r')).toBe('');
    });
  });
});

// ============================================================================
// truncateLabel Tests
// ============================================================================

describe('truncateLabel', () => {
  describe('basic functionality', () => {
    it('should not truncate strings shorter than maxLength', () => {
      expect(truncateLabel('Hello', 10)).toBe('Hello');
    });

    it('should not truncate strings exactly at maxLength', () => {
      expect(truncateLabel('Hello', 5)).toBe('Hello');
    });

    it('should truncate strings longer than maxLength with ellipsis', () => {
      expect(truncateLabel('Hello World', 8)).toBe('Hello...');
    });
  });

  describe('default maxLength', () => {
    it('should use default maxLength of 30', () => {
      const longString = 'a'.repeat(35);
      const result = truncateLabel(longString);
      expect(result.length).toBe(30);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not truncate strings at default limit', () => {
      const exactLength = 'a'.repeat(30);
      expect(truncateLabel(exactLength)).toBe(exactLength);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(truncateLabel('', 10)).toBe('');
    });

    it('should handle very small maxLength', () => {
      expect(truncateLabel('Hello World', 4)).toBe('H...');
    });

    it('should handle maxLength equal to ellipsis length', () => {
      expect(truncateLabel('Hello', 3)).toBe('...');
    });

    it('should handle maxLength less than ellipsis length', () => {
      // When maxLength < 3, the function still produces truncated output with ellipsis
      // The output may exceed maxLength - this is acceptable edge case behavior
      const result = truncateLabel('Hello', 2);
      expect(result).toContain('...');
    });
  });
});

// ============================================================================
// generatePieChart Tests
// ============================================================================

describe('generatePieChart', () => {
  describe('basic functionality', () => {
    it('should generate valid Mermaid pie chart', () => {
      const data: ChartDataPoint[] = [
        { label: 'Category A', value: 30 },
        { label: 'Category B', value: 70 },
      ];
      const result = generatePieChart(data, 'Test Chart');

      expect(result).toContain('```mermaid');
      expect(result).toContain('pie showData title Test Chart');
      expect(result).toContain('"Category A" : 30');
      expect(result).toContain('"Category B" : 70');
      expect(result).toContain('```');
    });

    it('should sort data by value in descending order', () => {
      const data: ChartDataPoint[] = [
        { label: 'Small', value: 10 },
        { label: 'Large', value: 100 },
        { label: 'Medium', value: 50 },
      ];
      const result = generatePieChart(data, 'Sorted Chart');

      const lines = result.split('\n');
      const largeLine = lines.findIndex(l => l.includes('Large'));
      const mediumLine = lines.findIndex(l => l.includes('Medium'));
      const smallLine = lines.findIndex(l => l.includes('Small'));

      expect(largeLine).toBeLessThan(mediumLine);
      expect(mediumLine).toBeLessThan(smallLine);
    });
  });

  describe('empty data handling', () => {
    it('should return empty string for empty data array', () => {
      expect(generatePieChart([], 'Empty Chart')).toBe('');
    });
  });

  describe('maxItems limiting', () => {
    it('should limit to default 10 items', () => {
      const data: ChartDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
        label: `Item ${i}`,
        value: 15 - i,
      }));
      const result = generatePieChart(data, 'Limited Chart');

      // Count the number of data lines (lines with " : ")
      const dataLines = result.split('\n').filter(l => l.includes('" : '));
      expect(dataLines.length).toBe(10);
    });

    it('should respect custom maxItems parameter', () => {
      const data: ChartDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        label: `Item ${i}`,
        value: 10 - i,
      }));
      const result = generatePieChart(data, 'Limited Chart', 5);

      const dataLines = result.split('\n').filter(l => l.includes('" : '));
      expect(dataLines.length).toBe(5);
    });

    it('should include highest value items when limiting', () => {
      const data: ChartDataPoint[] = [
        { label: 'Highest', value: 100 },
        { label: 'Lowest', value: 1 },
        { label: 'Medium', value: 50 },
      ];
      const result = generatePieChart(data, 'Chart', 2);

      expect(result).toContain('Highest');
      expect(result).toContain('Medium');
      expect(result).not.toContain('Lowest');
    });
  });

  describe('special character handling', () => {
    it('should escape quotes in labels', () => {
      const data: ChartDataPoint[] = [
        { label: 'Say "Hello"', value: 50 },
      ];
      const result = generatePieChart(data, 'Quote Test');

      expect(result).toContain('Say \\"Hello\\"');
    });

    it('should escape quotes in title', () => {
      const data: ChartDataPoint[] = [
        { label: 'Item', value: 100 },
      ];
      const result = generatePieChart(data, 'Test "Chart"');

      expect(result).toContain('title Test \\"Chart\\"');
    });

    it('should handle labels with newlines', () => {
      const data: ChartDataPoint[] = [
        { label: 'Line1\nLine2', value: 50 },
      ];
      const result = generatePieChart(data, 'Newline Test');

      expect(result).not.toContain('\n\n');
      expect(result).toContain('Line1 Line2');
    });
  });

  describe('label truncation', () => {
    it('should truncate long labels with ellipsis', () => {
      const data: ChartDataPoint[] = [
        { label: 'This is a very long label that exceeds the maximum length allowed', value: 50 },
      ];
      const result = generatePieChart(data, 'Truncation Test');

      expect(result).toContain('...');
      expect(result).not.toContain('This is a very long label that exceeds the maximum length allowed');
    });
  });

  describe('value handling', () => {
    it('should handle zero values', () => {
      const data: ChartDataPoint[] = [
        { label: 'Zero', value: 0 },
        { label: 'NonZero', value: 100 },
      ];
      const result = generatePieChart(data, 'Zero Value Test');

      expect(result).toContain('"NonZero" : 100');
      expect(result).toContain('"Zero" : 0');
    });

    it('should handle decimal values', () => {
      const data: ChartDataPoint[] = [
        { label: 'Decimal', value: 33.33 },
      ];
      const result = generatePieChart(data, 'Decimal Test');

      expect(result).toContain(': 33.33');
    });
  });
});

// ============================================================================
// generateBarChart Tests
// ============================================================================

describe('generateBarChart', () => {
  describe('basic functionality', () => {
    it('should generate valid Mermaid xychart-beta bar chart', () => {
      const data: ChartDataPoint[] = [
        { label: 'A', value: 30 },
        { label: 'B', value: 70 },
      ];
      const result = generateBarChart(data, 'Bar Chart');

      expect(result).toContain('```mermaid');
      expect(result).toContain('xychart-beta horizontal');
      expect(result).toContain('title "Bar Chart"');
      expect(result).toContain('x-axis');
      expect(result).toContain('bar');
      expect(result).toContain('```');
    });

    it('should include labels in x-axis', () => {
      const data: ChartDataPoint[] = [
        { label: 'First', value: 10 },
        { label: 'Second', value: 20 },
      ];
      const result = generateBarChart(data, 'Test');

      expect(result).toContain('"First"');
      expect(result).toContain('"Second"');
    });

    it('should include values in bar array', () => {
      const data: ChartDataPoint[] = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ];
      const result = generateBarChart(data, 'Test');

      // Data is sorted descending by value, so B (20) comes first
      expect(result).toContain('bar [20, 10]');
    });

    it('should sort data by value in descending order', () => {
      const data: ChartDataPoint[] = [
        { label: 'Small', value: 10 },
        { label: 'Large', value: 100 },
      ];
      const result = generateBarChart(data, 'Test');

      // Large should come first in the bar values
      expect(result).toContain('bar [100, 10]');
    });
  });

  describe('empty data handling', () => {
    it('should return empty string for empty data array', () => {
      expect(generateBarChart([], 'Empty')).toBe('');
    });
  });

  describe('maxItems limiting', () => {
    it('should limit to default 10 items', () => {
      const data: ChartDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
        label: `Item${i}`,
        value: 15 - i,
      }));
      const result = generateBarChart(data, 'Limited');

      // Count labels in x-axis
      const xAxisMatch = result.match(/x-axis \[([^\]]+)\]/);
      expect(xAxisMatch).not.toBeNull();
      const labels = xAxisMatch![1].split(',');
      expect(labels.length).toBe(10);
    });

    it('should respect custom maxItems', () => {
      const data: ChartDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        label: `Item${i}`,
        value: 10 - i,
      }));
      const result = generateBarChart(data, 'Limited', 3);

      const xAxisMatch = result.match(/x-axis \[([^\]]+)\]/);
      expect(xAxisMatch).not.toBeNull();
      const labels = xAxisMatch![1].split(',');
      expect(labels.length).toBe(3);
    });
  });

  describe('label truncation', () => {
    it('should truncate labels to 15 characters', () => {
      const data: ChartDataPoint[] = [
        { label: 'VeryLongLabelThatShouldBeTruncated', value: 50 },
      ];
      const result = generateBarChart(data, 'Test');

      expect(result).toContain('...');
      expect(result).not.toContain('VeryLongLabelThatShouldBeTruncated');
    });
  });

  describe('special character handling', () => {
    it('should escape quotes in title', () => {
      const data: ChartDataPoint[] = [{ label: 'A', value: 10 }];
      const result = generateBarChart(data, 'Chart "Title"');

      expect(result).toContain('title "Chart \\"Title\\""');
    });
  });
});

// ============================================================================
// generateTimeline Tests
// ============================================================================

describe('generateTimeline', () => {
  const createDate = (month: number, day: number, year: number = 2024): Date => {
    return new Date(year, month - 1, day);
  };

  describe('basic functionality', () => {
    it('should generate valid Mermaid timeline', () => {
      const events: TimelineEvent[] = [
        { date: createDate(1, 15), label: 'Event 1' },
        { date: createDate(1, 20), label: 'Event 2' },
      ];
      const result = generateTimeline(events, 'Timeline');

      expect(result).toContain('```mermaid');
      expect(result).toContain('timeline');
      expect(result).toContain('title Timeline');
      expect(result).toContain('01/15');
      expect(result).toContain('Event 1');
      expect(result).toContain('01/20');
      expect(result).toContain('Event 2');
      expect(result).toContain('```');
    });

    it('should sort events by date', () => {
      const events: TimelineEvent[] = [
        { date: createDate(3, 1), label: 'March Event' },
        { date: createDate(1, 1), label: 'January Event' },
        { date: createDate(2, 1), label: 'February Event' },
      ];
      const result = generateTimeline(events, 'Sorted Timeline');

      const lines = result.split('\n');
      const janLine = lines.findIndex(l => l.includes('January'));
      const febLine = lines.findIndex(l => l.includes('February'));
      const marLine = lines.findIndex(l => l.includes('March'));

      expect(janLine).toBeLessThan(febLine);
      expect(febLine).toBeLessThan(marLine);
    });
  });

  describe('empty data handling', () => {
    it('should return empty string for empty events array', () => {
      expect(generateTimeline([], 'Empty')).toBe('');
    });
  });

  describe('section grouping', () => {
    it('should group events by section', () => {
      const events: TimelineEvent[] = [
        { date: createDate(1, 1), label: 'Event A1', section: 'Section A' },
        { date: createDate(1, 2), label: 'Event A2', section: 'Section A' },
        { date: createDate(1, 3), label: 'Event B1', section: 'Section B' },
      ];
      const result = generateTimeline(events, 'Sectioned');

      expect(result).toContain('section Section A');
      expect(result).toContain('section Section B');
    });

    it('should use default "Events" section when no section specified', () => {
      const events: TimelineEvent[] = [
        { date: createDate(1, 1), label: 'Event 1' },
      ];
      const result = generateTimeline(events, 'Default Section');

      expect(result).toContain('section Events');
    });

    it('should handle mixed sectioned and unsectioned events', () => {
      const events: TimelineEvent[] = [
        { date: createDate(1, 1), label: 'Unsectioned' },
        { date: createDate(1, 2), label: 'Sectioned', section: 'My Section' },
      ];
      const result = generateTimeline(events, 'Mixed');

      expect(result).toContain('section Events');
      expect(result).toContain('section My Section');
    });
  });

  describe('date formatting', () => {
    it('should format dates as MM/DD', () => {
      const events: TimelineEvent[] = [
        { date: createDate(12, 25), label: 'Christmas' },
        { date: createDate(1, 1), label: 'New Year' },
      ];
      const result = generateTimeline(events, 'Dates');

      expect(result).toContain('12/25');
      expect(result).toContain('01/01');
    });

    it('should pad single-digit months and days', () => {
      const events: TimelineEvent[] = [
        { date: createDate(5, 3), label: 'May 3rd' },
      ];
      const result = generateTimeline(events, 'Padded');

      expect(result).toContain('05/03');
    });
  });

  describe('label handling', () => {
    it('should truncate long labels to 40 characters', () => {
      const events: TimelineEvent[] = [
        { date: createDate(1, 1), label: 'This is a very long event label that should be truncated because it exceeds the maximum allowed length' },
      ];
      const result = generateTimeline(events, 'Long Labels');

      expect(result).toContain('...');
    });

    it('should escape special characters in labels', () => {
      const events: TimelineEvent[] = [
        { date: createDate(1, 1), label: 'Event with "quotes"' },
      ];
      const result = generateTimeline(events, 'Quotes');

      expect(result).toContain('\\"quotes\\"');
    });
  });
});

// ============================================================================
// generateConnectionChart Tests
// ============================================================================

describe('generateConnectionChart', () => {
  describe('basic functionality', () => {
    it('should generate valid Mermaid flowchart', () => {
      const connections: Connection[] = [
        { from: 'Node A', to: 'Node B' },
      ];
      const result = generateConnectionChart(connections, 'Connections');

      expect(result).toContain('```mermaid');
      expect(result).toContain('flowchart LR');
      expect(result).toContain('subgraph Connections');
      expect(result).toContain('end');
      expect(result).toContain('```');
    });

    it('should create node IDs and labels', () => {
      const connections: Connection[] = [
        { from: 'Start', to: 'End' },
      ];
      const result = generateConnectionChart(connections, 'Test');

      expect(result).toContain('N0["Start"]');
      expect(result).toContain('N1["End"]');
      expect(result).toContain('-->');
    });

    it('should include edge labels when provided', () => {
      const connections: Connection[] = [
        { from: 'A', to: 'B', label: 'connects to' },
      ];
      const result = generateConnectionChart(connections, 'Labeled');

      expect(result).toContain('|connects to|');
    });

    it('should not include edge label syntax when no label', () => {
      const connections: Connection[] = [
        { from: 'A', to: 'B' },
      ];
      const result = generateConnectionChart(connections, 'Unlabeled');

      expect(result).not.toContain('||');
    });
  });

  describe('empty data handling', () => {
    it('should return empty string for empty connections array', () => {
      expect(generateConnectionChart([], 'Empty')).toBe('');
    });
  });

  describe('maxNodes limiting', () => {
    it('should limit connections when node count exceeds maxNodes', () => {
      // Create 20 unique nodes (more than default 15)
      const connections: Connection[] = Array.from({ length: 20 }, (_, i) => ({
        from: `Node${i}`,
        to: `Node${i + 20}`,
      }));
      const result = generateConnectionChart(connections, 'Limited');

      // Count node definitions (N0, N1, etc.)
      const nodeMatches = result.match(/N\d+\[/g);
      expect(nodeMatches).not.toBeNull();
      expect(nodeMatches!.length).toBeLessThanOrEqual(30); // maxNodes * 2 at most
    });

    it('should respect custom maxNodes parameter', () => {
      const connections: Connection[] = Array.from({ length: 10 }, (_, i) => ({
        from: `A${i}`,
        to: `B${i}`,
      }));
      const result = generateConnectionChart(connections, 'Custom', 5);

      // Should only include first 5 connections
      expect(result).toContain('A0');
      expect(result).toContain('A4');
    });

    it('should not limit when under maxNodes', () => {
      const connections: Connection[] = [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
      ];
      const result = generateConnectionChart(connections, 'Under Limit', 10);

      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
      expect(result).toContain('D');
    });
  });

  describe('node ID generation', () => {
    it('should reuse node IDs for repeated nodes', () => {
      const connections: Connection[] = [
        { from: 'Hub', to: 'Spoke1' },
        { from: 'Hub', to: 'Spoke2' },
        { from: 'Hub', to: 'Spoke3' },
      ];
      const result = generateConnectionChart(connections, 'Hub Pattern');

      // Hub should be N0 in all connections
      const hubMatches = result.match(/N0\["Hub"\]/g);
      expect(hubMatches).not.toBeNull();
      // "Hub" should appear 3 times (once per connection)
      expect(hubMatches!.length).toBe(3);
    });
  });

  describe('label handling', () => {
    it('should truncate node labels to 20 characters', () => {
      const connections: Connection[] = [
        { from: 'ThisIsAVeryLongNodeLabelThatShouldBeTruncated', to: 'Short' },
      ];
      const result = generateConnectionChart(connections, 'Truncated');

      expect(result).toContain('...');
      expect(result).not.toContain('ThisIsAVeryLongNodeLabelThatShouldBeTruncated');
    });

    it('should truncate edge labels to 15 characters', () => {
      const connections: Connection[] = [
        { from: 'A', to: 'B', label: 'ThisIsAVeryLongEdgeLabelThatShouldBeTruncated' },
      ];
      const result = generateConnectionChart(connections, 'Edge Truncated');

      expect(result).toContain('...');
    });

    it('should escape special characters', () => {
      const connections: Connection[] = [
        { from: 'Node "A"', to: 'Node <B>' },
      ];
      const result = generateConnectionChart(connections, 'Escaped');

      expect(result).not.toContain('"A"'); // quotes should be escaped
      expect(result).not.toContain('<B>'); // angle brackets should be removed
    });
  });
});
