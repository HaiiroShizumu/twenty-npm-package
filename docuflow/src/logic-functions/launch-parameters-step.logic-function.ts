import { defineLogicFunction } from 'twenty-sdk/define';

import { LAUNCH_PARAMETERS_STEP_NAME } from 'src/shared/docflow.constants';
import { readLaunchParameters } from 'src/shared/workflow/launch-step.util';
import { LAUNCH_PARAMETERS_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// The "Launch with parameters" step of a process: it gets the parameters the
// person filled before the launch and returns them, so every later step reads
// them as variables of this step. The tab of the process puts it first and
// writes its output schema from the parameter fields.
const handler = (payload: { parameters?: unknown }) =>
  readLaunchParameters(payload.parameters);

export default defineLogicFunction({
  universalIdentifier: LAUNCH_PARAMETERS_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-launch-parameters',
  description: 'Отдаёт следующим шагам параметры, заполненные перед запуском процесса',
  timeoutSeconds: 10,
  handler,
  workflowActionTriggerSettings: {
    label: LAUNCH_PARAMETERS_STEP_NAME,
    icon: 'IconPlayerPlay',
    inputSchema: [
      {
        type: 'object',
        properties: {
          parameters: { type: 'string', label: 'Параметры запуска (подставляются сами)' },
        },
      },
    ],
    outputSchema: [{ type: 'object', properties: {} }],
  },
});
