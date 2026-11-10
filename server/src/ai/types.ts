export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type CompleteResult = {
  text: string;
  toolCalls: ToolCall[];
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
};

export type CompleteFn = (messages: ChatMessage[]) => Promise<CompleteResult>;
