import { TaskExtractor } from '../../src/extractors/tasks';
import { TFile } from '../__mocks__/obsidian';

describe('TaskExtractor', () => {
  const extractor = new TaskExtractor();

  it('extracts tasks and ignores frontmatter and code blocks', () => {
    const file = new TFile('notes/test.md');
    const content = [
      '---',
      'title: Test',
      '- [ ] frontmatter task',
      '---',
      '# Note',
      '- [ ] real task #tag1',
      '```md',
      '- [ ] code block task',
      '```',
      '- [x] done @due(2024-01-15) 🔼',
    ].join('\n');

    const tasks = extractor.extractWithText(file, content);

    expect(tasks.length).toBe(2);
    expect(tasks[0].text).toBe('real task #tag1');
    expect(tasks[0].line).toBe(5);
    expect(tasks[0].tags).toEqual(['tag1']);

    expect(tasks[1].completed).toBe(true);
    expect(tasks[1].line).toBe(9);
    expect(tasks[1].priority).toBe('high');
    expect(tasks[1].dueDate?.getTime()).toBe(new Date('2024-01-15').getTime());
  });
});
