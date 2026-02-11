import { requestUrl } from 'obsidian';
import type { RequestUrlResponse } from 'obsidian';
import type { OllamaConfig, OllamaTopicResult, OllamaSummaryResult, OllamaModel } from '../types';

const DEFAULT_CONFIG: OllamaConfig = {
  url: 'http://localhost:11434',
  model: 'llama3',
  timeout: 30000,
};

const HEALTH_CHECK_TIMEOUT = 5000;

interface OllamaGenerateResponse {
  response: string;
  model: string;
  done: boolean;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    size: number;
    modified_at: string;
  }>;
}

/**
 * Client for interacting with local Ollama instance.
 * Designed for graceful degradation - never throws, always returns valid data.
 * Uses requestUrl() for Obsidian compatibility.
 */
export class OllamaClient {
  private config: OllamaConfig;
  private availabilityCache: boolean | null = null;
  private availabilityCacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update client configuration.
   * Resets availability cache when settings change.
   */
  setConfig(config: Partial<OllamaConfig>): void {
    const urlChanged = config.url && config.url !== this.config.url;
    this.config = { ...this.config, ...config };

    if (urlChanged) {
      this.resetAvailabilityCache();
    }
  }

  /**
   * Validate the configured URL.
   * Returns an error message if invalid, or null if valid.
   * Warns (via console) when the URL is not localhost.
   */
  validateUrl(): string | null {
    try {
      const parsed = new URL(this.config.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return `Invalid Ollama URL scheme: ${parsed.protocol} (must be http or https)`;
      }
      const hostname = parsed.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1') {
        console.warn(
          `[VaultInsights] Ollama URL points to a non-localhost host (${hostname}). Vault content will be sent to this host.`
        );
      }
      return null;
    } catch {
      return `Invalid Ollama URL: ${this.config.url}`;
    }
  }

  /**
   * Reset the availability cache.
   * Call this when settings change.
   */
  resetAvailabilityCache(): void {
    this.availabilityCache = null;
    this.availabilityCacheTime = 0;
  }

  /**
   * Check if Ollama is available.
   * Caches result for 1 minute.
   */
  async isAvailable(): Promise<boolean> {
    // Return cached result if still valid
    if (
      this.availabilityCache !== null &&
      Date.now() - this.availabilityCacheTime < this.CACHE_TTL
    ) {
      return this.availabilityCache;
    }

    // Reject invalid URLs before making any request
    const urlError = this.validateUrl();
    if (urlError) {
      this.availabilityCache = false;
      this.availabilityCacheTime = Date.now();
      console.warn(`[VaultInsights] ${urlError}`);
      return false;
    }

    try {
      const response = await this.requestWithTimeout({
        url: `${this.config.url}/api/tags`,
        method: 'GET',
      }, HEALTH_CHECK_TIMEOUT);

      this.availabilityCache = response !== null && response.status >= 200 && response.status < 300;
      this.availabilityCacheTime = Date.now();

      return this.availabilityCache;
    } catch {
      this.availabilityCache = false;
      this.availabilityCacheTime = Date.now();
      return false;
    }
  }

  /**
   * Extract topics from content using LLM.
   * Returns empty result on failure, never throws.
   */
  async extractTopics(content: string): Promise<OllamaTopicResult> {
    const emptyResult: OllamaTopicResult = {
      topics: [],
      confidence: 0,
      model: this.config.model,
    };

    if (!await this.isAvailable()) {
      return emptyResult;
    }

    const prompt = `Analyze the following text and extract the main topics or themes. Return only a JSON array of topic strings, nothing else. Example: ["topic1", "topic2", "topic3"]

Text:
${content.slice(0, 2000)}

Topics (JSON array only):`;

    try {
      const response = await this.generate(prompt);

      if (!response) {
        return emptyResult;
      }

      // Try to parse JSON array from response
      const topics = this.parseTopicsFromResponse(response.response);

      return {
        topics,
        confidence: topics.length > 0 ? 0.8 : 0,
        model: response.model,
      };
    } catch {
      return emptyResult;
    }
  }

  /**
   * Generate a summary of content using LLM.
   * Returns empty result on failure, never throws.
   */
  async summarize(content: string): Promise<OllamaSummaryResult> {
    const emptyResult: OllamaSummaryResult = {
      summary: '',
      model: this.config.model,
    };

    if (!await this.isAvailable()) {
      return emptyResult;
    }

    const prompt = `Summarize the following text in 2-3 sentences. Be concise and focus on the main points.

Text:
${content.slice(0, 3000)}

Summary:`;

    try {
      const response = await this.generate(prompt);

      if (!response) {
        return emptyResult;
      }

      return {
        summary: response.response.trim(),
        model: response.model,
      };
    } catch {
      return emptyResult;
    }
  }

  /**
   * List available model names.
   * Returns empty array on failure.
   */
  async listModels(): Promise<string[]> {
    const models = await this.getModels();
    return models.map(m => m.name);
  }

  /**
   * Get detailed model information.
   * Returns empty array on failure.
   */
  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.requestWithTimeout({
        url: `${this.config.url}/api/tags`,
        method: 'GET',
      }, HEALTH_CHECK_TIMEOUT);

      if (!response || response.status < 200 || response.status >= 300) {
        return [];
      }

      const data = response.json as OllamaTagsResponse;
      return data.models?.map(m => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
      })) ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Check if a specific model is available.
   * Supports partial matching: "llama3" matches "llama3:latest" but not "llama3.1:latest".
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    if (models.length === 0) return false;
    const needle = modelName.toLowerCase();
    return models.some(name => {
      const lower = name.toLowerCase();
      return lower === needle || lower.startsWith(needle + ':');
    });
  }

  /**
   * Internal method to call Ollama generate API.
   */
  private async generate(prompt: string): Promise<OllamaGenerateResponse | null> {
    try {
      const response = await this.requestWithTimeout({
        url: `${this.config.url}/api/generate`,
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
        }),
      }, this.config.timeout);

      if (!response || response.status < 200 || response.status >= 300) {
        return null;
      }

      return response.json as OllamaGenerateResponse;
    } catch {
      return null;
    }
  }

  private async requestWithTimeout(
    request: { url: string; method: 'GET' | 'POST'; contentType?: string; body?: string },
    timeoutMs: number
  ): Promise<RequestUrlResponse | null> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
      });
      const requestPromise = requestUrl({ ...request, throw: false });
      const response: RequestUrlResponse = await Promise.race([requestPromise, timeoutPromise]);
      return response;
    } catch {
      return null;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Parse topics from LLM response.
   * Handles various response formats.
   */
  private parseTopicsFromResponse(response: string): string[] {
    // Try direct JSON parse first
    try {
      const parsed: unknown = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed.filter((t): t is string => typeof t === 'string');
      }
    } catch {
      // Not valid JSON, try to extract array
    }

    // Try to find JSON array in response
    const arrayMatch = response.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      try {
        const parsed: unknown = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((t): t is string => typeof t === 'string');
        }
      } catch {
        // Couldn't parse extracted array
      }
    }

    // Try to extract comma-separated topics
    const lines = response.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      // Check for bullet points
      const bullets = lines.filter(l => /^[-*•]\s*/.test(l));
      if (bullets.length > 0) {
        return bullets.map(l => l.replace(/^[-*•]\s*/, '').trim());
      }

      // Check for numbered list
      const numbered = lines.filter(l => /^\d+[.)]\s*/.test(l));
      if (numbered.length > 0) {
        return numbered.map(l => l.replace(/^\d+[.)]\s*/, '').trim());
      }
    }

    return [];
  }
}
