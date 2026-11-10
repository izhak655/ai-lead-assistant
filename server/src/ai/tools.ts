export type ToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    additionalProperties: false;
    properties: Record<string, { type: 'string'; description?: string }>;
    required?: string[];
  };
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'update_lead_profile',
    description: 'Save facts the lead actually stated. Omit anything unknown. Do not invent values.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'Lead full name' },
        email: { type: 'string', description: 'Email address' },
        company: { type: 'string', description: 'Company or clinic name' },
        need: { type: 'string', description: 'What they want the assistant to do' },
        budget: { type: 'string', description: 'Budget they stated, or "No budget"' },
        timeline: { type: 'string', description: 'When they want this running' },
        authority: { type: 'string', description: 'Whether they can decide on a purchase' },
      },
    },
  },
  {
    name: 'set_lead_qualification',
    description: 'Store a one-sentence summary after new facts. The server computes the numeric score.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string', description: 'Short factual summary of the lead' },
      },
      required: ['summary'],
    },
  },
  {
    name: 'propose_meeting_times',
    description:
      'Ask the server for three real meeting slots. Call only when need, budget, and timeline are concrete. Offer only the returned slots.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: 'book_meeting',
    description: 'Book one of the proposed slots after the lead chooses it.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        slotId: { type: 'string', description: 'Id from propose_meeting_times' },
        notes: { type: 'string', description: 'Optional note from the lead' },
      },
      required: ['slotId'],
    },
  },
];

export function openAITools(): {
  type: 'function';
  function: { name: string; description: string; parameters: ToolDefinition['parameters'] };
}[] {
  return TOOL_DEFINITIONS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
