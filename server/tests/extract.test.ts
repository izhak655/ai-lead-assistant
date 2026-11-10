import { extractFields } from '../src/domain/extract';

describe('extractFields', () => {
  it('pulls a full qualification message apart', () => {
    const text =
      "I'm Test User, founder at BrightPath. I want to automate WhatsApp follow-ups for inbound sales leads. Budget is 4000 ILS/month and we need this ASAP. Email test.user@brightpath.example";
    const fields = extractFields(text);
    expect(fields.name).toBe('Test User');
    expect(fields.company).toBe('BrightPath');
    expect(fields.email).toBe('test.user@brightpath.example');
    expect(fields.budget).toMatch(/4000 ILS/i);
    expect(fields.timeline).toBe('ASAP');
    expect(fields.authority).toBe('Decision maker');
    expect(fields.need).toContain('WhatsApp');
  });

  it('does not treat a role description as a name', () => {
    const fields = extractFields('I am the office manager at a clinic and we need WhatsApp reminders for patients.');
    expect(fields.name).toBeUndefined();
    expect(fields.authority).toBe('Manager');
  });

  it('marks students and no-budget messages', () => {
    const fields = extractFields("I'm a student and I have no budget. Just curious about the tech.");
    expect(fields.budget).toBe('No budget');
  });
});
