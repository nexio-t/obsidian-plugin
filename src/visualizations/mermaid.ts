import { ChartDataPoint, TimelineEvent, Connection } from '../types';

/**
 * Escape special characters for Mermaid labels
 */
export function escapeLabel(label: string): string {
	return label
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, ' ')
		.replace(/\r/g, '')
		.replace(/[<>]/g, '')
		.trim();
}

/**
 * Truncate label with ellipsis if too long
 */
export function truncateLabel(label: string, maxLength: number = 30): string {
	if (label.length <= maxLength) {
		return label;
	}
	return label.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a Mermaid pie chart
 */
export function generatePieChart(
	data: ChartDataPoint[],
	title: string,
	maxItems: number = 10
): string {
	if (data.length === 0) {
		return '';
	}

	const sortedData = [...data]
		.sort((a, b) => b.value - a.value)
		.slice(0, maxItems);

	const escapedTitle = escapeLabel(title);
	const lines = ['```mermaid', `pie showData title ${escapedTitle}`];

	for (const item of sortedData) {
		const safeLabel = escapeLabel(truncateLabel(item.label));
		lines.push(`    "${safeLabel}" : ${item.value}`);
	}

	lines.push('```');
	return lines.join('\n');
}

/**
 * Generate a Mermaid bar chart using xychart-beta
 */
export function generateBarChart(
	data: ChartDataPoint[],
	title: string,
	maxItems: number = 10
): string {
	if (data.length === 0) {
		return '';
	}

	const sortedData = [...data]
		.sort((a, b) => b.value - a.value)
		.slice(0, maxItems);

	const escapedTitle = escapeLabel(title);
	const labels = sortedData
		.map((d) => `"${escapeLabel(truncateLabel(d.label, 15))}"`)
		.join(', ');
	const values = sortedData.map((d) => d.value).join(', ');

	const lines = [
		'```mermaid',
		'xychart-beta horizontal',
		`    title "${escapedTitle}"`,
		`    x-axis [${labels}]`,
		`    bar [${values}]`,
		'```',
	];

	return lines.join('\n');
}

/**
 * Generate a Mermaid timeline chart
 */
export function generateTimeline(
	events: TimelineEvent[],
	title: string
): string {
	if (events.length === 0) {
		return '';
	}

	const sortedEvents = [...events].sort(
		(a, b) => a.date.getTime() - b.date.getTime()
	);

	const escapedTitle = escapeLabel(title);
	const lines = ['```mermaid', `timeline`, `    title ${escapedTitle}`];

	const eventsBySection = new Map<string, TimelineEvent[]>();

	for (const event of sortedEvents) {
		const section = event.section ?? 'Events';
		const existing = eventsBySection.get(section) ?? [];
		existing.push(event);
		eventsBySection.set(section, existing);
	}

	for (const [section, sectionEvents] of eventsBySection) {
		lines.push(`    section ${escapeLabel(section)}`);
		for (const event of sectionEvents) {
			const dateStr = formatDateShort(event.date);
			const safeLabel = escapeLabel(truncateLabel(event.label, 40));
			lines.push(`        ${dateStr} : ${safeLabel}`);
		}
	}

	lines.push('```');
	return lines.join('\n');
}

/**
 * Generate a Mermaid flowchart for connections
 */
export function generateConnectionChart(
	connections: Connection[],
	title: string,
	maxNodes: number = 15
): string {
	if (connections.length === 0) {
		return '';
	}

	const nodeSet = new Set<string>();
	for (const conn of connections) {
		nodeSet.add(conn.from);
		nodeSet.add(conn.to);
	}

	const limitedConnections =
		nodeSet.size > maxNodes
			? connections.slice(0, maxNodes)
			: connections;

	const escapedTitle = escapeLabel(title);
	const lines = [
		'```mermaid',
		`flowchart LR`,
		`    subgraph ${escapedTitle}`,
	];

	const nodeIds = new Map<string, string>();
	let nodeCounter = 0;

	for (const conn of limitedConnections) {
		if (!nodeIds.has(conn.from)) {
			nodeIds.set(conn.from, `N${nodeCounter++}`);
		}
		if (!nodeIds.has(conn.to)) {
			nodeIds.set(conn.to, `N${nodeCounter++}`);
		}

		const fromId = nodeIds.get(conn.from)!;
		const toId = nodeIds.get(conn.to)!;
		const fromLabel = escapeLabel(truncateLabel(conn.from, 20));
		const toLabel = escapeLabel(truncateLabel(conn.to, 20));

		if (conn.label) {
			const edgeLabel = escapeLabel(truncateLabel(conn.label, 15));
			lines.push(
				`        ${fromId}["${fromLabel}"] -->|${edgeLabel}| ${toId}["${toLabel}"]`
			);
		} else {
			lines.push(
				`        ${fromId}["${fromLabel}"] --> ${toId}["${toLabel}"]`
			);
		}
	}

	lines.push('    end');
	lines.push('```');
	return lines.join('\n');
}

/**
 * Format date as short string (MM/DD)
 */
function formatDateShort(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${month}/${day}`;
}
