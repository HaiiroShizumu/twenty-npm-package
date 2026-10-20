import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';
import { RestApiClient } from 'twenty-client-sdk/rest';

import { BitrixError, callBitrix, isBitrixConfigured } from 'src/shared/bitrix/bitrix-client';
import { parseBitrixRequest } from 'src/shared/bitrix/bitrix.util';
import { proveAndLinkBitrixPortal } from 'src/server/bitrix-portal';
import { renderBitrixPage } from 'src/server/bitrix-page';
import { htmlResponse } from 'src/server/http-response';
import { BITRIX_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// "Путь для первоначальной установки" of the local Bitrix24 application.
const handler = async (event: RoutePayload) => {
  if (!isBitrixConfigured()) {
    return htmlResponse(
      503,
      renderBitrixPage({
        title: 'Документооборот',
        message: 'В настройках приложения в CRM не указаны BITRIX_CLIENT_ID и BITRIX_CLIENT_SECRET.',
        tasks: [],
        isInstall: false,
      }),
    );
  }

  try {
    const portal = await proveAndLinkBitrixPortal(
      parseBitrixRequest({
        rawBody: event.rawBody,
        body: event.body,
        query: event.queryStringParameters,
      }),
    );

    await callBitrix({
      restEndpoint: portal.restEndpoint,
      accessToken: portal.accessToken,
      method: 'event.bind',
      params: {
        event: 'ONAPPUNINSTALL',
        handler: new RestApiClient().resolveUrl('/s/bitrix/event'),
      },
    }).catch(() => undefined);

    return htmlResponse(
      200,
      renderBitrixPage({
        title: 'Документооборот подключён',
        message: `Портал ${portal.portalDomain} связан с CRM.`,
        tasks: [],
        isInstall: true,
      }),
    );
  } catch (error) {
    return htmlResponse(
      403,
      renderBitrixPage({
        title: 'Документооборот',
        message:
          error instanceof BitrixError
            ? `Портал не подтверждён: ${error.message}`
            : 'Портал не подтверждён.',
        tasks: [],
        isInstall: false,
      }),
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: BITRIX_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-bitrix-install',
  description: 'Установка приложения на портале Битрикс24',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/bitrix/install',
    httpMethod: 'POST',
    isAuthRequired: false,
  },
});
