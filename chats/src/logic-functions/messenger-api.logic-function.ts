import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type LogicFunctionExecutionContext,
  type RoutePayload,
} from 'twenty-sdk/logic-function';

import { MESSENGER_API_PATH } from 'src/shared/messenger.constants';
import { isAppEngine } from 'src/shared/engine';
import { jsonResponse, readJsonBody } from 'src/server/http-response';
import {
  MessengerError,
  parseMessengerApiRequest,
  runMessengerApiRequest,
} from 'src/server/messenger-api';
import { MESSENGER_API_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Все действия мессенджера одним маршрутом: страница и вкладка задачи шлют
// `action` и его параметры, отвечает сотрудник из контекста запроса.
const handler = async (
  event: RoutePayload,
  context: LogicFunctionExecutionContext,
) => {
  if (!isAppEngine()) {
    return jsonResponse(409, {
      message:
        'Беседы этой компании ведёт сервер форка NorDiv: откройте раздел «Чаты».',
    });
  }

  if (context.workspaceMemberId === null) {
    return jsonResponse(401, {
      message: 'Мессенджер доступен только сотрудникам',
    });
  }

  const request = parseMessengerApiRequest(readJsonBody(event.body));

  if (request === undefined) {
    return jsonResponse(400, { message: 'Неверный запрос мессенджера' });
  }

  try {
    return await runMessengerApiRequest(request, context.workspaceMemberId);
  } catch (error) {
    if (error instanceof MessengerError) {
      return jsonResponse(error.status, { message: error.message });
    }

    // Причина уходит и в журнал функции, и человеку: без неё со стенда не
    // понять, что сломалось.
    console.error(`messenger-api ${request.action} failed`, error);

    return jsonResponse(500, {
      message: `Ошибка сервера мессенджера: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
};

export default defineLogicFunction({
  universalIdentifier: MESSENGER_API_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'messenger-api',
  description: 'Беседы, сообщения и чаты задач для страниц мессенджера',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: MESSENGER_API_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
