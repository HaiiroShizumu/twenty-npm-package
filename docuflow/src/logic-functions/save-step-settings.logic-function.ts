import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { jsonResponse, readJsonBody } from 'src/server/http-response';
import { restClient, type WorkflowVersionRecord } from 'src/server/records';
import { callCoreGraphql, UPDATE_WORKFLOW_VERSION_STEP_MUTATION } from 'src/shared/api/core-graphql.util';
import { readRestRecord } from 'src/shared/api/rest-response.util';
import { applyStepSettings, type StepSettings } from 'src/shared/form/step-settings.util';
import { parseFormFields } from 'src/shared/form/form-fields.util';
import { isFormStep } from 'src/shared/workflow/workflow-run.util';
import { SAVE_STEP_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const readSettings = (value: unknown): StepSettings | undefined => {
  const body = readJsonBody(value);
  const { assignee, dueInDays, requiredFieldIds } = body;

  if (
    (assignee !== null && typeof assignee !== 'string') ||
    (dueInDays !== null && typeof dueInDays !== 'number') ||
    !Array.isArray(requiredFieldIds)
  ) {
    return undefined;
  }

  return {
    assignee: assignee === '' ? null : assignee,
    dueInDays: dueInDays === 0 ? null : dueInDays,
    requiredFieldIds: requiredFieldIds.filter((id): id is string => typeof id === 'string'),
  };
};

// Who fills a "Human input" step, by when, and which of its fields are
// required: the editor of Twenty has no place for it, the step keeps it in the
// settings of its fields.
const handler = async (event: RoutePayload) => {
  const body = readJsonBody(event.body);
  const settings = readSettings(body.settings);

  if (
    typeof body.workflowVersionId !== 'string' ||
    typeof body.stepId !== 'string' ||
    settings === undefined
  ) {
    return jsonResponse(400, { message: 'Не указан шаг или настройки' });
  }

  const version = readRestRecord<WorkflowVersionRecord>(
    await restClient('person').get(`/rest/workflowVersions/${body.workflowVersionId}`),
  );
  const step = version?.steps?.find(({ id }) => id === body.stepId);

  if (version === undefined || step === undefined || !isFormStep(step)) {
    return jsonResponse(404, { message: 'Шаг «Человеческий ввод» не найден' });
  }

  if (version.status !== 'DRAFT') {
    return jsonResponse(409, { message: 'Менять можно только черновик процесса' });
  }

  const fields = applyStepSettings({
    fields: parseFormFields(step.settings.input),
    settings,
    createId: () => crypto.randomUUID(),
  });

  await callCoreGraphql({
    query: UPDATE_WORKFLOW_VERSION_STEP_MUTATION,
    variables: {
      input: {
        workflowVersionId: version.id,
        step: { ...step, settings: { ...step.settings, input: fields } },
      },
    },
  });

  return { status: 'SAVED' };
};

export default defineLogicFunction({
  universalIdentifier: SAVE_STEP_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-save-step-settings',
  description: 'Сохраняет исполнителя, срок и обязательные поля шага процесса',
  timeoutSeconds: 15,
  handler,
  httpRouteTriggerSettings: {
    path: '/docflow/processes/step-settings',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
