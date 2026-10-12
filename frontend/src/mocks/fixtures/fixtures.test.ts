import { Settings, Topic } from '@study/shared';
import { describe, expect, it } from 'vitest';
import { settingsFixture } from './settings';
import { topicFixtures } from './topics';

describe('fixtures match the shared schemas', () => {
  it('topics', () => {
    const topics = topicFixtures();
    expect(topics).toHaveLength(3);
    for (const t of topics) expect(() => Topic.parse(t)).not.toThrow();
    expect(topics.some((t) => t.description === null)).toBe(true);
    expect(new Set(topics.map((t) => t.id)).size).toBe(3);
  });

  it('settings', () => {
    expect(Settings.parse(settingsFixture())).toEqual({
      model: 'openrouter/auto',
      maxChunks: 6,
      maxTokens: 1200,
      temperature: 0.2,
      aiConfigured: false,
    });
  });

  it('returns fresh copies', () => {
    const a = topicFixtures();
    a[0]!.name = 'mutated';
    expect(topicFixtures()[0]!.name).not.toBe('mutated');
    const s = settingsFixture();
    s.maxChunks = 1;
    expect(settingsFixture().maxChunks).toBe(6);
  });
});
