import { defineLogicFunction } from 'twenty-sdk/define';

import { handOutFormStep } from 'src/server/process-tasks';
import { HAND_OUT_FORM_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const handler = async (payload: {
  workflowRunId?: string;
  stepId?: string;
  threadId?: string;
}) => {
  const { workflowRunId, stepId, threadId } = payload;

  if (
    typeof workflowRunId !== 'string' ||
    typeof stepId !== 'string' ||
    typeof threadId !== 'string'
  ) {
    return { status: 'INVALID_PAYLOAD' };
  }

  return { status: await handOutFormStep({ workflowRunId, stepId, threadId }) };
};

export default defineLogicFunction({
  universalIdentifier: HAND_OUT_FORM_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-hand-out-form-step',
  description: 'Создаёт задачу CRM по шагу «Человеческий ввод»',
  timeoutSeconds: 30,
  handler,
});
