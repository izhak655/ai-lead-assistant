import OpenAI from 'openai';
import { config } from '../config';
import { openAITools } from './tools';
import type { ChatMessage, CompleteFn } from './types';

export function createOpenAIComplete(): CompleteFn {
  const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  return async (messages: ChatMessage[]) => {
    const response = await client.chat.completions.create({
      model: config.OPENAI_MODEL,
      temperature: 0.2,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      tools: openAITools(),
    });
    const message = response.choices[0]?.message;
    if (!message) return { text: '', toolCalls: [] };
    const toolCalls = (message.tool_calls ?? []).flatMap((call) => {
      if (call.type !== 'function') return [];
      let args: unknown = {};
      try {
        args = JSON.parse(call.function.arguments || '{}') as unknown;
      } catch {
        args = {};
      }
      return [{ id: call.id, name: call.function.name, arguments: args }];
    });
    return { text: message.content ?? '', toolCalls };
  };
}
