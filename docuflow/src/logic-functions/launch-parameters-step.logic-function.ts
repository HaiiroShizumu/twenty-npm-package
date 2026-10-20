import { defineLogicFunction } from 'twenty-sdk/define';

import { readLaunchParameters } from 'src/shared/workflow/launch-step.util';
import { LAUNCH_PARAMETERS_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// The step that returned the launch parameters in processes from 0.0.6 and
// earlier. Parameters now come with the "Запуск с параметрами" trigger, so the
// editor no longer offers this step; the function stays for the runs of
// published versions that still contain it.
const handler = (payload: { parameters?: unknown }) =>
  readLaunchParameters(payload.parameters);

export default defineLogicFunction({
  universalIdentifier: LAUNCH_PARAMETERS_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-launch-parameters',
  description: 'Отдаёт следующим шагам параметры, заполненные перед запуском процесса',
  timeoutSeconds: 10,
  handler,
});
