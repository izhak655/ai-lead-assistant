import { systemPrompt } from '../src/ai/prompt';
import { TOOL_DEFINITIONS } from '../src/ai/tools';

describe('assistant contract', () => {
  it('lists the four CRM tools', () => {
    expect(TOOL_DEFINITIONS.map((tool) => tool.name).sort()).toEqual([
      'book_meeting',
      'propose_meeting_times',
      'set_lead_qualification',
      'update_lead_profile',
    ]);
  });

  it('tells the model to offer only server-produced slots', () => {
    const prompt = systemPrompt(new Date('2026-11-10T08:00:00.000Z'), 'Asia/Jerusalem');
    expect(prompt).toContain('Asia/Jerusalem');
    expect(prompt).toContain('Sunday to Thursday');
    expect(prompt).toContain('propose_meeting_times');
    expect(prompt).toContain('Never invent');
  });
});
