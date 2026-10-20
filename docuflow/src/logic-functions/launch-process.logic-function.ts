import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type LogicFunctionExecutionContext,
  type RoutePayload,
} from 'twenty-sdk/logic-function';

import { CoreGraphqlError } from 'src/shared/api/core-graphql.util';
import { DOCFLOW_SECTION } from 'src/shared/docflow.constants';
import { findMissingRequiredFields } from 'src/shared/form/form-fields.util';
import {
  buildLaunchParameters,
  buildLaunchPayload,
  parseLaunchFields,
} from 'src/shared/workflow/launch-step.util';
import { readJsonBody, jsonResponse } from 'src/server/http-response';
import { getWorkflow, getWorkflowVersion } from 'src/server/records';
import { runWorkflowVersion } from 'src/server/workflow-engine';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import { LAUNCH_PROCESS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Launch with parameters: they are checked here and ride in the run payload,
// so they stay in the run as its trigger output and reach later steps through
// the "Launch with parameters" step.
const handler = async (
  event: RoutePayload,
  context: LogicFunctionExecutionContext,
) => {
  if (context.workspaceMemberId === null) {
    return jsonResponse(401, { message: 'Запускать процессы может только сотрудник' });
  }

  const body = readJsonBody(event.body);
  const workflowVersionId = body.workflowVersionId;
  const values = readJsonBody(body.values);

  if (typeof workflowVersionId !== 'string' || workflowVersionId.length === 0) {
    return jsonResponse(400, { message: 'Не указан процесс' });
  }

  const version = await getWorkflowVersion('person', workflowVersionId);

  if (version === undefined || version.status !== 'ACTIVE') {
    return jsonResponse(404, { message: 'Процесс не найден или не опубликован' });
  }

  const workflow =
    typeof version.workflowId === 'string'
      ? await getWorkflow('person', version.workflowId)
      : undefined;

  if (workflow?.smbSection !== DOCFLOW_SECTION) {
    return jsonResponse(403, { message: 'Процесс не относится к документообороту' });
  }

  const fields = parseLaunchFields(workflow.smbLaunchFields);
  const parameters = buildLaunchParameters({ fields, values });
  const missingFields = findMissingRequiredFields({ fields, values: parameters });

  if (missingFields.length > 0) {
    return jsonResponse(422, {
      message: `Заполните: ${missingFields.map(({ label }) => label).join(', ')}`,
      missingFieldNames: missingFields.map(({ name }) => name),
    });
  }

  const workflowRunId = crypto.randomUUID();

  try {
    await runWorkflowVersion({
      workflowVersionId,
      workflowRunId,
      payload: fields.length > 0 ? buildLaunchPayload(parameters) : {},
    });
  } catch (error) {
    logDocflowError('launch: run failed', error, { workflowVersionId });

    return jsonResponse(403, {
      message:
        error instanceof CoreGraphqlError && error.userMessage !== undefined
          ? error.userMessage
          : 'Не удалось запустить процесс',
    });
  }

  logDocflow('launch: started', { workflowVersionId, workflowRunId, parameters });

  return { workflowRunId };
};

export default defineLogicFunction({
  universalIdentifier: LAUNCH_PROCESS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-launch-process',
  description: 'Запускает процесс документооборота с параметрами',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/docflow/processes/launch',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
