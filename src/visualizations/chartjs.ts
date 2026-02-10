import { ChartDataPoint, TimelineEvent } from '../types';

/**
 * Color palette for Chart.js charts.
 * Mid-tone colors that work in both light and dark themes.
 */
const CHART_COLORS = [
	'rgba(75, 192, 192, ALPHA)',   // teal
	'rgba(255, 159, 64, ALPHA)',   // orange
	'rgba(153, 102, 255, ALPHA)',  // purple
	'rgba(255, 99, 132, ALPHA)',   // pink
	'rgba(54, 162, 235, ALPHA)',   // blue
	'rgba(255, 206, 86, ALPHA)',   // yellow
	'rgba(75, 192, 120, ALPHA)',   // green
	'rgba(201, 103, 107, ALPHA)',  // rose
	'rgba(100, 181, 246, ALPHA)',  // light blue
	'rgba(174, 213, 129, ALPHA)',  // light green
];

function getColor(index: number, alpha: number): string {
	return CHART_COLORS[index % CHART_COLORS.length].replace('ALPHA', String(alpha));
}

function getColors(count: number, alpha: number): string[] {
	return Array.from({ length: count }, (_, i) => getColor(i, alpha));
}

/**
 * Wrap a Chart.js config object in a chartjs fenced code block.
 */
export function wrapChartJsConfig(config: Record<string, unknown>): string {
	return `\`\`\`chartjs\n${JSON.stringify(config, null, 2)}\n\`\`\``;
}

/**
 * Generate a Chart.js doughnut chart as a chartjs code block.
 */
export function generateChartJsPieChart(
	data: ChartDataPoint[],
	title: string,
	maxItems: number = 10
): string {
	if (data.length === 0) return '';

	const sortedData = [...data]
		.sort((a, b) => b.value - a.value)
		.slice(0, maxItems);

	const labels = sortedData.map(d => d.label);
	const values = sortedData.map(d => d.value);

	const config = {
		type: 'doughnut',
		data: {
			labels,
			datasets: [{
				data: values,
				backgroundColor: getColors(labels.length, 0.6),
				borderColor: getColors(labels.length, 1.0),
				borderWidth: 1,
			}],
		},
		options: {
			responsive: true,
			plugins: {
				title: {
					display: true,
					text: title,
				},
				legend: {
					position: 'bottom',
				},
			},
		},
	};

	return wrapChartJsConfig(config);
}

/**
 * Generate a Chart.js horizontal bar chart as a chartjs code block.
 * @param preserveOrder - if true, keeps the original data order instead of sorting by value
 */
export function generateChartJsBarChart(
	data: ChartDataPoint[],
	title: string,
	maxItems: number = 10,
	preserveOrder: boolean = false
): string {
	if (data.length === 0) return '';

	const processedData = preserveOrder
		? [...data].slice(0, maxItems)
		: [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);

	const labels = processedData.map(d => d.label);
	const values = processedData.map(d => d.value);

	const config = {
		type: 'bar',
		data: {
			labels,
			datasets: [{
				data: values,
				backgroundColor: getColors(labels.length, 0.6),
				borderColor: getColors(labels.length, 1.0),
				borderWidth: 1,
			}],
		},
		options: {
			indexAxis: 'y',
			responsive: true,
			plugins: {
				title: {
					display: true,
					text: title,
				},
				legend: {
					display: false,
				},
			},
			scales: {
				x: {
					beginAtZero: true,
				},
			},
		},
	};

	return wrapChartJsConfig(config);
}

/**
 * Generate a Chart.js timeline as a horizontal bar chart aggregated by date.
 * Groups events by date and shows counts per day in chronological order.
 */
export function generateChartJsTimeline(
	events: TimelineEvent[],
	title: string
): string {
	if (events.length === 0) return '';

	// Aggregate events by date
	const dateCounts = new Map<string, number>();
	for (const event of events) {
		const key = formatDateKey(event.date);
		dateCounts.set(key, (dateCounts.get(key) ?? 0) + 1);
	}

	// Sort chronologically
	const sorted = Array.from(dateCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

	const labels = sorted.map(([date]) => date);
	const values = sorted.map(([, count]) => count);

	const config = {
		type: 'bar',
		data: {
			labels,
			datasets: [{
				label: 'Events',
				data: values,
				backgroundColor: getColors(labels.length, 0.6),
				borderColor: getColors(labels.length, 1.0),
				borderWidth: 1,
			}],
		},
		options: {
			responsive: true,
			plugins: {
				title: {
					display: true,
					text: title,
				},
				legend: {
					display: false,
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						stepSize: 1,
					},
				},
			},
		},
	};

	return wrapChartJsConfig(config);
}

/**
 * Format date as YYYY-MM-DD for aggregation key.
 */
function formatDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
