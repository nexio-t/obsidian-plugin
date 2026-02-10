import type { Plugin } from 'obsidian';
import {
	Chart,
	ArcElement,
	BarElement,
	BarController,
	DoughnutController,
	CategoryScale,
	LinearScale,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';

// Register only the components we use for tree-shaking
Chart.register(
	ArcElement,
	BarElement,
	BarController,
	DoughnutController,
	CategoryScale,
	LinearScale,
	Title,
	Tooltip,
	Legend
);

/**
 * Register a markdown code block processor that renders `chartjs` fenced blocks.
 * Generators emit ```chartjs blocks containing JSON Chart.js configs;
 * this processor renders them to <canvas> elements inline in notes.
 */
export function registerChartJsProcessor(plugin: Plugin): void {
	plugin.registerMarkdownCodeBlockProcessor('chartjs', (source, el) => {
		let config: Record<string, unknown>;
		try {
			config = JSON.parse(source);
		} catch {
			const errorEl = el.createEl('div', {
				cls: 'vault-insights-chartjs-error',
				text: 'Invalid Chart.js configuration: could not parse JSON.',
			});
			errorEl.style.color = 'var(--text-error)';
			return;
		}

		const container = el.createEl('div', {
			cls: 'vault-insights-chartjs-container',
		});
		const canvas = container.createEl('canvas');

		// Read Obsidian theme CSS variables for theme-aware defaults
		const computed = getComputedStyle(el);
		const textColor = computed.getPropertyValue('--text-normal').trim() || '#ddd';
		const mutedColor = computed.getPropertyValue('--text-muted').trim() || '#999';
		const borderColor = computed.getPropertyValue('--background-modifier-border').trim() || '#444';

		// Apply theme-aware defaults to the config
		const themedConfig = applyThemeDefaults(config, textColor, mutedColor, borderColor);

		try {
			const chart = new Chart(canvas, themedConfig as any);

			// Clean up chart when element is removed from DOM
			const observer = new MutationObserver(() => {
				if (!el.isConnected) {
					chart.destroy();
					observer.disconnect();
				}
			});
			observer.observe(el.parentElement ?? document.body, {
				childList: true,
				subtree: true,
			});
		} catch {
			container.empty();
			container.createEl('div', {
				cls: 'vault-insights-chartjs-error',
				text: 'Failed to render chart. Check the configuration.',
			});
		}
	});
}

/**
 * Apply Obsidian theme colors to Chart.js config defaults.
 */
function applyThemeDefaults(
	config: Record<string, unknown>,
	textColor: string,
	mutedColor: string,
	borderColor: string
): Record<string, unknown> {
	const options = (config.options ?? {}) as Record<string, unknown>;
	const plugins = (options.plugins ?? {}) as Record<string, unknown>;
	const scales = (options.scales ?? {}) as Record<string, unknown>;

	// Theme the title
	const title = (plugins.title ?? {}) as Record<string, unknown>;
	plugins.title = { ...title, color: textColor };

	// Theme the legend
	const legend = (plugins.legend ?? {}) as Record<string, unknown>;
	const legendLabels = ((legend.labels ?? {}) as Record<string, unknown>);
	plugins.legend = { ...legend, labels: { ...legendLabels, color: mutedColor } };

	options.plugins = plugins;

	// Theme scales if present
	for (const [key, scaleVal] of Object.entries(scales)) {
		const scale = (scaleVal ?? {}) as Record<string, unknown>;
		const ticks = ((scale.ticks ?? {}) as Record<string, unknown>);
		const grid = ((scale.grid ?? {}) as Record<string, unknown>);
		scales[key] = {
			...scale,
			ticks: { ...ticks, color: mutedColor },
			grid: { ...grid, color: borderColor },
		};
	}

	options.scales = scales;
	config.options = options;

	return config;
}
