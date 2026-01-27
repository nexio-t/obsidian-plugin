import { TopicData, DailyActivity, ChartDataPoint } from '../types';
import { generatePieChart, generateBarChart } from './mermaid';

/**
 * Generate a topic distribution pie chart
 */
export function topicDistributionChart(
	topics: TopicData[],
	maxItems: number = 10
): string {
	if (topics.length === 0) {
		return emptyStateMessage('topics');
	}

	const data: ChartDataPoint[] = topics.map((t) => ({
		label: t.name,
		value: t.count,
	}));

	return generatePieChart(data, 'Topic Distribution', maxItems);
}

/**
 * Generate a daily activity bar chart with ordered weekdays
 */
export function dailyActivityChart(activity: DailyActivity[]): string {
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

	return generateBarChart(orderedActivity, 'Daily Activity', 7);
}

/**
 * Generate a folder distribution pie chart
 */
export function folderDistributionChart(
	folders: Map<string, number>,
	maxItems: number = 10
): string {
	if (folders.size === 0) {
		return emptyStateMessage('folders');
	}

	const data: ChartDataPoint[] = Array.from(folders.entries()).map(
		([folder, count]) => ({
			label: folder || '(root)',
			value: count,
		})
	);

	return generatePieChart(data, 'Folder Distribution', maxItems);
}

/**
 * Generate a task completion pie chart
 */
export function taskCompletionChart(
	completed: number,
	pending: number
): string {
	if (completed === 0 && pending === 0) {
		return emptyStateMessage('tasks');
	}

	const data: ChartDataPoint[] = [
		{ label: 'Completed', value: completed },
		{ label: 'Pending', value: pending },
	].filter((d) => d.value > 0);

	return generatePieChart(data, 'Task Completion', 2);
}

/**
 * Generate a topic frequency bar chart
 */
export function topicFrequencyChart(
	topics: TopicData[],
	maxItems: number = 10
): string {
	if (topics.length === 0) {
		return emptyStateMessage('topics');
	}

	const data: ChartDataPoint[] = topics.map((t) => ({
		label: t.name,
		value: t.count,
	}));

	return generateBarChart(data, 'Topic Frequency', maxItems);
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
