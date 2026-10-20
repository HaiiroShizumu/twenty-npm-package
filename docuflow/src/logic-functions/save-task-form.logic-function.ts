import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { getFormFieldsError, parseFormFields, parseFormValues } from 'src/shared/form/form-fields.util';
import { jsonResponse, readJsonBody } from 'src/server/http-response';
import { getTask, updateTask } from 'src/server/records';
import { isProcessTask } from 'src/server/task-completion';
import { SAVE_TASK_FORM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// The one-off fields of a task: their list is checked before it is saved,
// and the fields of a process task belong to the process.
const handler = async (event: RoutePayload) => {
  const body = readJsonBody(event.body);

  if (typeof body.taskId !== 'string') {
    return jsonResponse(400, { message: 'Не указано задание' });
  }

  const task = await getTask('person', body.taskId);

  if (task === undefined) {
    return jsonResponse(404, { message: 'Задание не найдено' });
  }

  const data: Record<string, unknown> = {};

  if (body.fields !== undefined) {
    if (isProcessTask(task)) {
      return jsonResponse(409, { message: 'Поля этого задания задаёт процесс' });
    }

    const fields = parseFormFields(body.fields);
    const error = getFormFieldsError(fields);

    if (error !== undefined) {
      return jsonResponse(422, { message: error });
    }

    data.smbFormSchema = fields;
  }

  if (body.values !== undefined) {
    data.smbFormValues = parseFormValues(body.values);
  }

  await updateTask('person', task.id, data);

  return { status: 'SAVED' };
};

export default defineLogicFunction({
  universalIdentifier: SAVE_TASK_FORM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-save-task-form',
  description: 'Сохраняет поля задания и их значения',
  timeoutSeconds: 15,
  handler,
  httpRouteTriggerSettings: {
    path: '/docflow/tasks/form',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
