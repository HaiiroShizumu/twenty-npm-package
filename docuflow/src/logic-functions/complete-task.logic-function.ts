import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { parseFormValues } from 'src/shared/form/form-fields.util';
import { jsonResponse, readJsonBody } from 'src/server/http-response';
import { completeTask } from 'src/server/task-completion';
import { COMPLETE_TASK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const handler = async (event: RoutePayload) => {
  const body = readJsonBody(event.body);

  if (typeof body.taskId !== 'string') {
    return jsonResponse(400, { message: 'Не указано задание' });
  }

  const result = await completeTask({
    taskId: body.taskId,
    values: body.values === undefined ? undefined : parseFormValues(body.values),
  });

  switch (result.status) {
    case 'DONE':
      return { status: 'DONE' };
    case 'NOT_FOUND':
      return jsonResponse(404, { message: 'Задание не найдено' });
    case 'MISSING_REQUIRED':
      return jsonResponse(422, {
        message: `Заполните: ${result.labels.join(', ')}`,
      });
    case 'FAILED':
      return jsonResponse(403, { message: result.message });
  }
};

export default defineLogicFunction({
  universalIdentifier: COMPLETE_TASK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-complete-task',
  description: 'Выполняет задание: проверяет поля и продолжает процесс',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/docflow/tasks/complete',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
