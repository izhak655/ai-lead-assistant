import type { MockPlan } from '../domain/planner';
import type { CompleteFn } from './types';

export function createMockComplete(plan: MockPlan): CompleteFn {
  let step = 0;
  return async () => {
    if (step === 0 && plan.calls.length > 0) {
      step += 1;
      return {
        text: '',
        toolCalls: plan.calls.map((call, index) => ({
          id: `mock_${index + 1}`,
          name: call.name,
          arguments: call.arguments,
        })),
      };
    }
    return { text: plan.reply, toolCalls: [] };
  };
}
