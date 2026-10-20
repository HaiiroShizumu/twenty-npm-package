import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { restAnd, restEq, restIsNull, restNeq, restOr } from 'src/shared/api/rest-filter.util';
import { readRestList } from 'src/shared/api/rest-response.util';
import { BitrixError, callBitrix, isBitrixConfigured } from 'src/shared/bitrix/bitrix-client';
import { parseBitrixRequest } from 'src/shared/bitrix/bitrix.util';
import { DOCFLOW_SECTION, TASK_DONE_STATUS } from 'src/shared/docflow.constants';
import { proveAndLinkBitrixPortal } from 'src/server/bitrix-portal';
import { renderBitrixPage, type BitrixPageTask } from 'src/server/bitrix-page';
import { htmlResponse } from 'src/server/http-response';
import { restClient } from 'src/server/records';
import { BITRIX_APP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const TASKS_SHOWN_IN_PORTAL = 20;

const getCrmUrl = (): string | undefined => {
  const value = process.env.CRM_PUBLIC_URL?.trim();

  return value !== undefined && /^https?:\/\//.test(value)
    ? value.replace(/\/$/, '')
    : undefined;
};

// The person is found by the e-mail of their Bitrix24 account; their open
// docflow tasks are listed with links into the CRM.
const findMyTasks = async (
  email: string,
  crmUrl: string | undefined,
): Promise<BitrixPageTask[] | undefined> => {
  const [member] = readRestList<{ id: string }>(
    await restClient('application').get('/rest/workspaceMembers', {
      query: { filter: restEq('userEmail', email), limit: 1 },
    }),
  ).records;

  if (member === undefined) {
    return undefined;
  }

  return readRestList<{ id: string; title?: string | null; dueAt?: string | null }>(
    await restClient('application').get('/rest/tasks', {
      query: {
        filter: restAnd(
          restEq('smbSection', DOCFLOW_SECTION),
          restEq('assigneeId', member.id),
          restOr(restNeq('status', TASK_DONE_STATUS), restIsNull('status')),
        ),
        order_by: 'dueAt[AscNullsLast]',
        limit: TASKS_SHOWN_IN_PORTAL,
      },
    }),
  ).records.map((task) => ({
    title: task.title?.trim() || 'Без названия',
    url: crmUrl !== undefined ? `${crmUrl}/object/task/${task.id}` : undefined,
    dueAt:
      typeof task.dueAt === 'string'
        ? new Date(task.dueAt).toLocaleDateString('ru-RU')
        : undefined,
  }));
};

// "Путь вашего обработчика" of the local Bitrix24 application: the page a
// person sees when they open the app in the portal.
const handler = async (event: RoutePayload) => {
  const crmUrl = getCrmUrl();

  if (!isBitrixConfigured()) {
    return htmlResponse(
      503,
      renderBitrixPage({
        title: 'Документооборот',
        message: 'В настройках приложения в CRM не указаны BITRIX_CLIENT_ID и BITRIX_CLIENT_SECRET.',
        crmUrl,
        tasks: [],
        isInstall: false,
      }),
    );
  }

  const request = parseBitrixRequest({
    rawBody: event.rawBody,
    body: event.body,
    query: event.queryStringParameters,
  });

  try {
    const portal = await proveAndLinkBitrixPortal(request);
    const user = await callBitrix<{ EMAIL?: string }>({
      restEndpoint: portal.restEndpoint,
      accessToken: request.authId ?? portal.accessToken,
      method: 'user.current',
      params: {},
    });
    const tasks =
      typeof user.EMAIL === 'string' && user.EMAIL.length > 0
        ? await findMyTasks(user.EMAIL, crmUrl)
        : undefined;

    return htmlResponse(
      200,
      renderBitrixPage({
        title: 'Документооборот',
        message:
          tasks === undefined
            ? 'В CRM нет сотрудника с почтой вашего профиля Битрикс24.'
            : tasks.length === 0
              ? 'Открытых заданий нет.'
              : 'Ваши открытые задания:',
        crmUrl,
        tasks: tasks ?? [],
        isInstall: false,
      }),
    );
  } catch (error) {
    return htmlResponse(
      403,
      renderBitrixPage({
        title: 'Документооборот',
        message:
          error instanceof BitrixError
            ? `Запрос портала не подтверждён: ${error.message}`
            : 'Запрос портала не подтверждён.',
        crmUrl,
        tasks: [],
        isInstall: false,
      }),
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: BITRIX_APP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-bitrix-app',
  description: 'Страница документооборота в портале Битрикс24',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/bitrix/app',
    httpMethod: 'POST',
    isAuthRequired: false,
  },
});
