/**
 * Tests for src/integrations/ollama.ts
 *
 * Tests the OllamaClient class including configuration handling,
 * availability checking with caching, topic extraction, summarization,
 * and error handling.
 *
 * Note: These tests mock the fetch API to avoid actual network calls.
 */

import { OllamaClient } from '../../src/integrations/ollama';
import type { OllamaConfig } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortController
const mockAbort = jest.fn();
class MockAbortController {
  signal = { aborted: false };
  abort = mockAbort;
}
global.AbortController = MockAbortController as any;

describe('OllamaClient', () => {
  let client: OllamaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    client = new OllamaClient();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultClient = new OllamaClient();
      // We can't directly access private config, but we can verify behavior
      // by checking that it makes requests to the default URL
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });

      defaultClient.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      );
    });

    it('should accept partial configuration and merge with defaults', () => {
      const customClient = new OllamaClient({ url: 'http://custom:8080' });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });

      customClient.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom:8080/api/tags',
        expect.any(Object)
      );
    });

    it('should accept full configuration', () => {
      const fullConfig: OllamaConfig = {
        url: 'http://myserver:9000',
        model: 'mistral',
        timeout: 60000,
      };
      const customClient = new OllamaClient(fullConfig);
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });

      customClient.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://myserver:9000/api/tags',
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // setConfig Tests
  // ============================================================================

  describe('setConfig', () => {
    it('should update configuration', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ models: [] }) });

      await client.isAvailable(); // Initial call with default URL
      client.setConfig({ url: 'http://newurl:5000' });
      await client.isAvailable(); // Should use new URL

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://newurl:5000/api/tags',
        expect.any(Object)
      );
    });

    it('should reset availability cache when URL changes', async () => {
      // First call - available
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
      const result1 = await client.isAvailable();
      expect(result1).toBe(true);

      // Change URL - should reset cache
      client.setConfig({ url: 'http://newserver:11434' });

      // Next call should make a new request (not use cache)
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result2 = await client.isAvailable();

      // Should have made 2 fetch calls (cache was reset)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result2).toBe(false);
    });

    it('should not reset cache when URL is unchanged', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
      await client.isAvailable();

      // Change model but not URL
      client.setConfig({ model: 'llama2' });

      // Should still use cached result
      const result = await client.isAvailable();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // resetAvailabilityCache Tests
  // ============================================================================

  describe('resetAvailabilityCache', () => {
    it('should force new availability check after reset', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ models: [] }) });

      await client.isAvailable();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      client.resetAvailabilityCache();

      await client.isAvailable();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // isAvailable Tests
  // ============================================================================

  describe('isAvailable', () => {
    describe('basic functionality', () => {
      it('should return true when Ollama responds with ok', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });

        const result = await client.isAvailable();

        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:11434/api/tags',
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should return false when Ollama responds with error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

        const result = await client.isAvailable();

        expect(result).toBe(false);
      });

      it('should return false when fetch throws', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await client.isAvailable();

        expect(result).toBe(false);
      });

      it('should return false when fetch times out', async () => {
        // Mock a fetch that rejects after a timeout (simulating AbortController behavior)
        mockFetch.mockImplementationOnce(() =>
          Promise.reject(new DOMException('Aborted', 'AbortError'))
        );

        const result = await client.isAvailable();
        expect(result).toBe(false);
      });
    });

    describe('caching', () => {
      it('should cache positive result for 1 minute', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({ models: [] }) });

        await client.isAvailable();
        await client.isAvailable();
        await client.isAvailable();

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should cache negative result for 1 minute', async () => {
        mockFetch.mockResolvedValue({ ok: false });

        await client.isAvailable();
        await client.isAvailable();

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should refresh cache after TTL expires', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({ models: [] }) });

        await client.isAvailable();
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Advance past cache TTL (60000ms)
        jest.advanceTimersByTime(61000);

        await client.isAvailable();
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should not refresh cache before TTL expires', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({ models: [] }) });

        await client.isAvailable();

        // Advance but stay within TTL
        jest.advanceTimersByTime(30000);

        await client.isAvailable();
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ============================================================================
  // extractTopics Tests
  // ============================================================================

  describe('extractTopics', () => {
    beforeEach(() => {
      // Make Ollama available by default
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
    });

    it('should return empty result when Ollama is unavailable', async () => {
      const unavailableClient = new OllamaClient();
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({ ok: false }); // isAvailable check fails

      const result = await unavailableClient.extractTopics('Some content');

      expect(result).toEqual({
        topics: [],
        confidence: 0,
        model: 'llama3',
      });
    });

    it('should extract topics from valid JSON array response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '["topic1", "topic2", "topic3"]',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('Test content');

      expect(result.topics).toEqual(['topic1', 'topic2', 'topic3']);
      expect(result.confidence).toBe(0.8);
      expect(result.model).toBe('llama3');
    });

    it('should return empty result when generate fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false }); // generate call fails

      const result = await client.extractTopics('Test content');

      expect(result.topics).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should truncate content to 2000 characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '["topic"]',
          model: 'llama3',
          done: true,
        }),
      });

      const longContent = 'a'.repeat(5000);
      await client.extractTopics(longContent);

      // Check that the body contains truncated content
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.prompt).not.toContain('a'.repeat(5000));
      expect(callBody.prompt.length).toBeLessThan(5000);
    });
  });

  // ============================================================================
  // parseTopicsFromResponse Tests (via extractTopics)
  // ============================================================================

  describe('parseTopicsFromResponse', () => {
    beforeEach(() => {
      // Make Ollama available
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
    });

    it('should parse direct JSON array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '["alpha", "beta", "gamma"]',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('content');
      expect(result.topics).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should extract JSON array from surrounding text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Here are the topics: ["topic1", "topic2"] as requested.',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('content');
      expect(result.topics).toEqual(['topic1', 'topic2']);
    });

    it('should parse bullet point list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '- First topic\n- Second topic\n- Third topic',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('content');
      expect(result.topics).toEqual(['First topic', 'Second topic', 'Third topic']);
    });

    it('should parse numbered list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '1. Topic one\n2. Topic two\n3. Topic three',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('content');
      expect(result.topics).toEqual(['Topic one', 'Topic two', 'Topic three']);
    });

    it('should parse asterisk bullet list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '* Item A\n* Item B',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('content');
      expect(result.topics).toEqual(['Item A', 'Item B']);
    });

    it('should filter out non-string values from JSON array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '["valid", 123, "also valid", null, "third"]',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('content');
      expect(result.topics).toEqual(['valid', 'also valid', 'third']);
    });

    it('should return empty array for unparseable response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'I cannot determine any topics from this content.',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.extractTopics('content');
      expect(result.topics).toEqual([]);
      expect(result.confidence).toBe(0);
    });
  });

  // ============================================================================
  // summarize Tests
  // ============================================================================

  describe('summarize', () => {
    beforeEach(() => {
      // Make Ollama available
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
    });

    it('should return empty result when Ollama is unavailable', async () => {
      const unavailableClient = new OllamaClient();
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await unavailableClient.summarize('Some content');

      expect(result).toEqual({
        summary: '',
        model: 'llama3',
      });
    });

    it('should return summary from successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'This is a concise summary of the content.',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.summarize('Long content to summarize');

      expect(result.summary).toBe('This is a concise summary of the content.');
      expect(result.model).toBe('llama3');
    });

    it('should trim whitespace from summary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '  \n Summary with whitespace \n  ',
          model: 'llama3',
          done: true,
        }),
      });

      const result = await client.summarize('content');

      expect(result.summary).toBe('Summary with whitespace');
    });

    it('should truncate content to 3000 characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Summary',
          model: 'llama3',
          done: true,
        }),
      });

      const longContent = 'b'.repeat(5000);
      await client.summarize(longContent);

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.prompt).not.toContain('b'.repeat(5000));
    });

    it('should return empty result when generate fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await client.summarize('content');

      expect(result.summary).toBe('');
    });
  });

  // ============================================================================
  // listModels Tests
  // ============================================================================

  describe('listModels', () => {
    it('should return list of model names', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3', size: 1000000, modified_at: '2024-01-01' },
            { name: 'mistral', size: 2000000, modified_at: '2024-01-02' },
          ],
        }),
      });

      const result = await client.listModels();

      expect(result).toEqual(['llama3', 'mistral']);
    });

    it('should return empty array when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.listModels();

      expect(result).toEqual([]);
    });

    it('should return empty array when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await client.listModels();

      expect(result).toEqual([]);
    });

    it('should return empty array when models is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.listModels();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getModels Tests
  // ============================================================================

  describe('getModels', () => {
    it('should return detailed model information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3', size: 4000000000, modified_at: '2024-01-15T10:30:00Z' },
            { name: 'codellama', size: 3500000000, modified_at: '2024-01-10T08:00:00Z' },
          ],
        }),
      });

      const result = await client.getModels();

      expect(result).toEqual([
        { name: 'llama3', size: 4000000000, modified_at: '2024-01-15T10:30:00Z' },
        { name: 'codellama', size: 3500000000, modified_at: '2024-01-10T08:00:00Z' },
      ]);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.getModels();

      expect(result).toEqual([]);
    });

    it('should return empty array when models is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ something: 'else' }),
      });

      const result = await client.getModels();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should never throw from isAvailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Catastrophic failure'));

      await expect(client.isAvailable()).resolves.toBe(false);
    });

    it('should never throw from extractTopics', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
      mockFetch.mockRejectedValueOnce(new Error('Generation failed'));

      await expect(client.extractTopics('content')).resolves.toEqual({
        topics: [],
        confidence: 0,
        model: 'llama3',
      });
    });

    it('should never throw from summarize', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
      mockFetch.mockRejectedValueOnce(new Error('Summarization failed'));

      await expect(client.summarize('content')).resolves.toEqual({
        summary: '',
        model: 'llama3',
      });
    });

    it('should never throw from listModels', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      await expect(client.listModels()).resolves.toEqual([]);
    });

    it('should never throw from getModels', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      await expect(client.getModels()).resolves.toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await client.extractTopics('content');

      expect(result.topics).toEqual([]);
    });
  });

  // ============================================================================
  // Integration-like Tests
  // ============================================================================

  describe('realistic usage scenarios', () => {
    it('should handle typical topic extraction workflow', async () => {
      // Initial availability check
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [{ name: 'llama3' }] }) });

      // Topic extraction call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '["TypeScript", "Testing", "Obsidian"]',
          model: 'llama3',
          done: true,
        }),
      });

      const isUp = await client.isAvailable();
      expect(isUp).toBe(true);

      const topics = await client.extractTopics('This note is about TypeScript testing in Obsidian plugins.');
      expect(topics.topics).toContain('TypeScript');
      expect(topics.topics).toContain('Testing');
    });

    it('should gracefully degrade when Ollama becomes unavailable', async () => {
      // First call - available
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
      expect(await client.isAvailable()).toBe(true);

      // Simulate Ollama going down - reset cache
      client.resetAvailabilityCache();
      mockFetch.mockResolvedValueOnce({ ok: false });

      // Should now report unavailable
      expect(await client.isAvailable()).toBe(false);

      // Topic extraction should return empty gracefully
      const result = await client.extractTopics('Some content');
      expect(result.topics).toEqual([]);
      expect(result.confidence).toBe(0);
    });
  });
});
