import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { CoreGraphqlError } from 'src/shared/api/core-graphql.util';
import { readRestRecord } from 'src/shared/api/rest-response.util';
import { getFormFieldsError } from 'src/shared/form/form-fields.util';
import { parseLaunchFields } from 'src/shared/workflow/launch-step.util';
import { syncLaunchStep } from 'src/server/launch-step';
import { jsonResponse, readJsonBody } from 'src/server/http-response';
import { restClient } from 'src/server/records';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import { SAVE_LAUNCH_FIELDS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Saves the parameters of a process and keeps its draft in step: the
// "Launch with parameters" step first, its variables matching the fields.
const handler = async (event: RoutePayload) => {
  const body = readJsonBody(event.body);
  const workflowId = body.workflowId;
  const fields = parseLaunchFields(body.fields);

  if (typeof workflowId !== 'string' || workflowId.length === 0 || !Array.isArray(body.fields)) {
    return jsonResponse(400, { message: 'Не указан процесс или поля' });
  }

  const fieldsError = getFormFieldsError(fields);

  if (fieldsError !== undefined) {
    return jsonResponse(422, { message: fieldsError });
  }

  // Written as the person: who may not change the process gets the refusal
  // of the API, not a half-saved draft.
  const workflow = readRestRecord<{ id: string }>(
    await restClient('person').patch(`/rest/workflows/${workflowId}`, {
      smbLaunchFields: fields.length > 0 ? fields : null,
    }),
  );

  if (workflow === undefined) {
    return jsonResponse(404, { message: 'Процесс не найден' });
  }

  try {
    const result = await syncLaunchStep({ workflowId, fields });

    logDocflow('launch fields: draft synced', { workflowId, result });

    if (result?.status === 'NOT_MANUAL') {
      return jsonResponse(409, {
        message: 'Параметры сохранены, но шаг не добавлен: у процесса не ручной запуск',
      });
    }

    return { status: 'SAVED', stepId: result?.status === 'SAVED' ? result.stepId : null };
  } catch (error) {
    logDocflowError('launch fields: draft not synced', error, { workflowId });

    return jsonResponse(502, {
      message:
        error instanceof CoreGraphqlError && error.userMessage !== undefined
          ? `Параметры сохранены, шаг процесса не обновлён: ${error.userMessage}`
          : `Параметры сохранены, шаг процесса не обновлён: ${error instanceof Error ? error.message : 'ошибка редактора процессов'}`,
    });
  }
};

export default defineLogicFunction({
  universalIdentifier: SAVE_LAUNCH_FIELDS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-save-launch-fields',
  description: 'Сохраняет параметры запуска процесса и ставит шаг «Параметры запуска»',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/docflow/processes/launch-fields',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
