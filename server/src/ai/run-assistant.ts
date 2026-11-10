import type { ChatMessage, CompleteFn } from './types';

export async function runAssistant(options: {
  complete: CompleteFn;
  execute: (call: { id: string; name: string; arguments: unknown }) => Promise<unknown>;
  history: { role: 'user' | 'assistant'; content: string }[];
  system: string;
}): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: options.system },
    ...options.history.map((item) => ({ role: item.role, content: item.content })),
  ];

  let drafted = '';
  for (let turn = 0; turn < 4; turn += 1) {
    const result = await options.complete(messages);
    if (result.text.trim()) drafted = result.text.trim();
    if (result.toolCalls.length === 0) break;
    messages.push({
      role: 'assistant',
      content: result.text ? result.text : null,
      tool_calls: result.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
      })),
    });
    for (const call of result.toolCalls) {
      const output = await options.execute(call);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(output),
      });
    }
  }

  const reply = drafted.slice(0, 1200);
  return reply || 'Thanks — I have that. A teammate will confirm the next step shortly.';
}
