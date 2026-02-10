import { ChartDataPoint, TimelineEvent, Connection } from '../types';

/**
 * Escape special characters for Mermaid labels
 * Replaces characters that break Mermaid rendering with safe alternatives
 */
export function escapeLabel(label: string): string {
	return label
		.replace(/\\/g, '\\\\')
		.replace(/"/g, "'")
		.replace(/\n/g, ' ')
		.replace(/\r/g, '')
		.replace(/#/g, 'sharp')
		.replace(/[[\]{};<>|`]/g, '')
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
	if (data.length === 0) return '';

	const sortedData = [...data]
		.sort((a, b) => b.value - a.value)
		.slice(0, maxItems);

	const items = sortedData
		.map(item => `    "${escapeLabel(truncateLabel(item.label))}" : ${item.value}`)
		.join('\n');

	return `\`\`\`mermaid
pie showData title "${escapeLabel(title)}"
${items}
\`\`\``;
}

/**
 * Generate a Mermaid bar chart using xychart-beta
 * @param preserveOrder - if true, keeps the original data order instead of sorting by value
 */
export function generateBarChart(
	data: ChartDataPoint[],
	title: string,
	maxItems: number = 10,
	preserveOrder: boolean = false
): string {
	if (data.length === 0) return '';

	const processedData = preserveOrder
		? [...data].slice(0, maxItems)
		: [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);

	const labels = processedData.map(d => `"${escapeLabel(truncateLabel(d.label, 15))}"`).join(', ');
	const values = processedData.map(d => d.value).join(', ');

	return `\`\`\`mermaid
xychart-beta horizontal
    title "${escapeLabel(title)}"
    x-axis [${labels}]
    bar [${values}]
\`\`\``;
}

/**
 * Generate a Mermaid timeline chart
 */
export function generateTimeline(
	events: TimelineEvent[],
	title: string
): string {
	if (events.length === 0) return '';

	const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

	// Group events by section
	const eventsBySection = sortedEvents.reduce((acc, event) => {
		const section = event.section ?? 'Events';
		acc.set(section, [...(acc.get(section) ?? []), event]);
		return acc;
	}, new Map<string, TimelineEvent[]>());

	const sections = Array.from(eventsBySection.entries())
		.map(([section, sectionEvents]) => {
			const eventLines = sectionEvents
				.map(e => `        ${formatDateShort(e.date)} : ${escapeLabel(truncateLabel(e.label, 40))}`)
				.join('\n');
			return `    section ${escapeLabel(section)}\n${eventLines}`;
		})
		.join('\n');

	return `\`\`\`mermaid
timeline
    title ${escapeLabel(title)}
${sections}
\`\`\``;
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
