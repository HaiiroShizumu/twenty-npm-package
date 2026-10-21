import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { BitrixError, callBitrix, isBitrixConfigured } from 'src/shared/bitrix/bitrix-client';
import { parseBitrixRequest } from 'src/shared/bitrix/bitrix.util';
import {
  buildBitrixEntryUrl,
  enrichWorkspaceMemberFromBitrix,
  findWorkspaceMemberByEmail,
  getCrmPublicUrl,
  getWorkspaceInviteHash,
  resolveDocflowPageLayoutId,
} from 'src/server/bitrix-entry';
import { parseBitrixPerson } from 'src/server/bitrix-person';
import { proveAndLinkBitrixPortal } from 'src/server/bitrix-portal';
import { renderBitrixPage, renderBitrixRedirectPage } from 'src/server/bitrix-page';
import { htmlResponse } from 'src/server/http-response';
import { BITRIX_APP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const configError = (message: string) =>
  htmlResponse(
    503,
    renderBitrixPage({
      title: 'Документооборот',
      message,
      tasks: [],
      isInstall: false,
    }),
  );

// "Путь вашего обработчика" of the local Bitrix24 application. Proves the
// portal, then sends the employee to Twenty's standard invite (new) or
// straight to the docflow page (already a member). Password is entered only
// on Twenty's own screens; the next open reuses the session cookie.
const handler = async (event: RoutePayload) => {
  const crmUrl = getCrmPublicUrl();

  if (!isBitrixConfigured()) {
    return configError(
      'В настройках приложения в CRM не указаны BITRIX_CLIENT_ID и BITRIX_CLIENT_SECRET.',
    );
  }

  if (crmUrl === undefined) {
    return configError(
      'В настройках приложения в CRM не указан CRM_PUBLIC_URL (адрес компании).',
    );
  }

  const inviteHash = getWorkspaceInviteHash();

  if (inviteHash === undefined) {
    return configError(
      'В настройках приложения в CRM не указан WORKSPACE_INVITE_HASH (хвост ссылки «Пригласить»).',
    );
  }

  const request = parseBitrixRequest({
    rawBody: event.rawBody,
    body: event.body,
    query: event.queryStringParameters,
  });

  try {
    const portal = await proveAndLinkBitrixPortal(request);
    const person = parseBitrixPerson(
      await callBitrix({
        restEndpoint: portal.restEndpoint,
        accessToken: request.authId ?? portal.accessToken,
        method: 'user.current',
        params: {},
      }),
    );

    if (person === undefined || person.email === undefined) {
      return htmlResponse(
        400,
        renderBitrixPage({
          title: 'Документооборот',
          message:
            'В профиле Битрикс24 нет рабочей почты. Укажите email в карточке сотрудника на портале.',
          crmUrl,
          tasks: [],
          isInstall: false,
        }),
      );
    }

    const pageLayoutId = await resolveDocflowPageLayoutId();

    if (pageLayoutId === undefined) {
      return configError(
        'Не найдена страница «Задания» документооборота. Переустановите приложение в CRM.',
      );
    }

    const member = await findWorkspaceMemberByEmail(person.email);

    if (member !== undefined) {
      await enrichWorkspaceMemberFromBitrix(member, person).catch(() => undefined);
    }

    const entryUrl = buildBitrixEntryUrl({
      crmUrl,
      inviteHash,
      pageLayoutId,
      email: person.email,
      memberExists: member !== undefined,
    });

    // HTML+JS, not HTTP 303: Bitrix POSTs into an iframe and shows a blank
    // frame when the handler answers with an empty redirect body.
    return htmlResponse(200, renderBitrixRedirectPage(entryUrl));
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
  description: 'Вход в документооборот из портала Битрикс24',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/bitrix/app',
    httpMethod: 'POST',
    isAuthRequired: false,
  },
});
