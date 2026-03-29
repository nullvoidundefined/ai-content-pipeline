import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from './tool-definitions.js';

describe('TOOL_DEFINITIONS', () => {
  it('defines the summarize tool', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(1);
    expect(TOOL_DEFINITIONS[0]!.name).toBe('summarize');
  });

  it('has required input schema properties', () => {
    const schema = TOOL_DEFINITIONS[0]!.input_schema as any;
    expect(schema.type).toBe('object');
    expect(schema.properties.summary).toBeDefined();
    expect(schema.properties.key_points).toBeDefined();
    expect(schema.required).toContain('summary');
    expect(schema.required).toContain('key_points');
  });

  it('key_points is an array of strings', () => {
    const schema = TOOL_DEFINITIONS[0]!.input_schema as any;
    expect(schema.properties.key_points.type).toBe('array');
    expect(schema.properties.key_points.items.type).toBe('string');
  });
});

describe('SYSTEM_PROMPT', () => {
  it('instructs the model to use tools', () => {
    expect(SYSTEM_PROMPT).toContain('tool');
  });

  it('is a non-empty string', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });
});
