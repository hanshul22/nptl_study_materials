import { describe, expect, it } from 'vitest';
import { Settings, SettingsUpdate } from '../src/schemas/settings.js';
import { bad, ok } from './helpers.js';

const valid = {
  model: 'openai/gpt-4o-mini',
  maxChunks: 6,
  maxTokens: 1200,
  temperature: 0.2,
  aiConfigured: true,
};

describe('Settings', () => {
  it('accepts valid settings', () => ok(Settings, valid));

  it('model must be a non-empty string', () => {
    bad(Settings, { ...valid, model: '' });
    bad(Settings, { ...valid, model: 5 });
  });
  it('maxChunks must be an integer 1..12', () => {
    ok(Settings, { ...valid, maxChunks: 1 });
    ok(Settings, { ...valid, maxChunks: 12 });
    bad(Settings, { ...valid, maxChunks: 0 });
    bad(Settings, { ...valid, maxChunks: 13 });
    bad(Settings, { ...valid, maxChunks: 6.5 });
  });
  it('maxTokens must be an integer 100..4000', () => {
    ok(Settings, { ...valid, maxTokens: 100 });
    ok(Settings, { ...valid, maxTokens: 4000 });
    bad(Settings, { ...valid, maxTokens: 99 });
    bad(Settings, { ...valid, maxTokens: 4001 });
    bad(Settings, { ...valid, maxTokens: 1200.5 });
  });
  it('temperature must be 0..1', () => {
    ok(Settings, { ...valid, temperature: 0 });
    ok(Settings, { ...valid, temperature: 1 });
    bad(Settings, { ...valid, temperature: -0.1 });
    bad(Settings, { ...valid, temperature: 1.1 });
    bad(Settings, { ...valid, temperature: '0.2' });
  });
  it('requires every field including aiConfigured', () => {
    for (const key of Object.keys(valid)) {
      const copy: Record<string, unknown> = { ...valid };
      delete copy[key];
      bad(Settings, copy);
    }
    bad(Settings, { ...valid, aiConfigured: 'true' });
  });
});

describe('SettingsUpdate', () => {
  it('is partial: empty body and single fields are valid', () => {
    ok(SettingsUpdate, {});
    ok(SettingsUpdate, { model: 'x' });
    ok(SettingsUpdate, { maxChunks: 3 });
    ok(SettingsUpdate, { maxTokens: 500 });
    ok(SettingsUpdate, { temperature: 0.7 });
  });
  it('does not include aiConfigured', () => {
    expect('aiConfigured' in SettingsUpdate.shape).toBe(false);
    // read-only field sent by a client is stripped, never accepted into the update
    expect(SettingsUpdate.parse({ ...valid })).not.toHaveProperty('aiConfigured');
    expect(SettingsUpdate.parse({ aiConfigured: false })).toEqual({});
  });
  it('still enforces ranges on present fields', () => {
    bad(SettingsUpdate, { maxChunks: 0 });
    bad(SettingsUpdate, { maxChunks: 13 });
    bad(SettingsUpdate, { maxTokens: 99 });
    bad(SettingsUpdate, { maxTokens: 4001 });
    bad(SettingsUpdate, { temperature: -1 });
    bad(SettingsUpdate, { temperature: 2 });
    bad(SettingsUpdate, { model: '' });
  });
});
