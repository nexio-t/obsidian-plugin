import { TopicData, DailyActivity, ChartDataPoint, ChartType } from '../types';
import { generatePieChart, generateBarChart } from './mermaid';
import { generateChartJsPieChart, generateChartJsBarChart } from './chartjs';

/**
 * Generate a topic distribution pie chart
 * Only shows chart when there are multiple topics to compare
 */
export function topicDistributionChart(
	topics: TopicData[],
	maxItems: number = 10,
	chartType: ChartType = 'mermaid'
): string {
	if (topics.length === 0) {
		return emptyStateMessage('topics');
	}

	// Don't show a pie chart with only one slice - it's not useful
	if (topics.length === 1) {
		return '';
	}

	const data: ChartDataPoint[] = topics.map((t) => ({
		label: t.name,
		value: t.count,
	}));

	return chartType === 'chartjs'
		? generateChartJsPieChart(data, 'Topic distribution', maxItems)
		: generatePieChart(data, 'Topic distribution', maxItems);
}

/**
 * Generate a daily activity bar chart with ordered weekdays
 */
export function dailyActivityChart(
	activity: DailyActivity[],
	chartType: ChartType = 'mermaid'
): string {
	if (activity.length === 0) {
		return emptyStateMessage('activity');
	}

	const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	const orderedActivity = dayOrder
		.map((day) => {
			const found = activity.find((a) => a.day === day);
			return {
				label: day,
				value: found?.count ?? 0,
			};
		})
		.filter((a) => a.value > 0 || activity.some((act) => act.day === a.label));

	if (orderedActivity.every((a) => a.value === 0)) {
		return emptyStateMessage('activity');
	}

	return chartType === 'chartjs'
		? generateChartJsBarChart(orderedActivity, 'Daily activity', 7, true)
		: generateBarChart(orderedActivity, 'Daily activity', 7, true);
}

/**
 * Generate a folder distribution pie chart
 * Only shows chart when there are multiple folders to compare
 */
export function folderDistributionChart(
	folders: Map<string, number>,
	maxItems: number = 10,
	chartType: ChartType = 'mermaid'
): string {
	if (folders.size === 0) {
		return emptyStateMessage('folders');
	}

	// Don't show a pie chart with only one slice - it's not useful
	if (folders.size === 1) {
		return '';
	}

	const data: ChartDataPoint[] = Array.from(folders.entries()).map(
		([folder, count]) => ({
			label: folder || '(root)',
			value: count,
		})
	);

	return chartType === 'chartjs'
		? generateChartJsPieChart(data, 'Folder distribution', maxItems)
		: generatePieChart(data, 'Folder distribution', maxItems);
}

/**
 * Generate a task completion pie chart
 * Only shows chart when there's a mix of completed and pending tasks
 */
export function taskCompletionChart(
	completed: number,
	pending: number,
	chartType: ChartType = 'mermaid'
): string {
	if (completed === 0 && pending === 0) {
		return emptyStateMessage('tasks');
	}

	// Don't show a 100% chart - it's not useful
	if (completed === 0 || pending === 0) {
		return '';
	}

	const data: ChartDataPoint[] = [
		{ label: 'Completed', value: completed },
		{ label: 'Pending', value: pending },
	];

	return chartType === 'chartjs'
		? generateChartJsPieChart(data, 'Task completion', 2)
		: generatePieChart(data, 'Task completion', 2);
}

/**
 * Generate a topic frequency bar chart
 */
export function topicFrequencyChart(
	topics: TopicData[],
	maxItems: number = 10,
	chartType: ChartType = 'mermaid'
): string {
	if (topics.length === 0) {
		return emptyStateMessage('topics');
	}

	const data: ChartDataPoint[] = topics.map((t) => ({
		label: t.name,
		value: t.count,
	}));

	return chartType === 'chartjs'
		? generateChartJsBarChart(data, 'Topic frequency', maxItems)
		: generateBarChart(data, 'Topic frequency', maxItems);
}

/**
 * Generate an empty state message for missing data
 */
export function emptyStateMessage(context: string): string {
	const messages: Record<string, string> = {
		topics: 'No topics found. Try adding tags or headings to your notes.',
		activity: 'No activity recorded for this period.',
		folders: 'No folder data available.',
		tasks: 'No tasks found in the selected folders.',
		notes: 'No notes found for this period.',
		default: 'No data available for visualization.',
	};

	const message = messages[context] ?? messages['default'];
	return `> [!info] ${message}`;
}
