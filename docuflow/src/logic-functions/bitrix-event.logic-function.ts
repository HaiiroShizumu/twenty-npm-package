import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { parseBitrixRequest } from 'src/shared/bitrix/bitrix.util';
import { forgetBitrixPortal, loadBitrixPortal, saveBitrixPortal } from 'src/server/bitrix-portal';
import { jsonResponse } from 'src/server/http-response';
import { BITRIX_EVENT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Events of the linked portal. An event must name the linked portal; the
// application token of the first event is kept, and every later event must
// carry the same one.
const handler = async (event: RoutePayload) => {
  const request = parseBitrixRequest({
    rawBody: event.rawBody,
    body: event.body,
    query: event.queryStringParameters,
  });
  const portal = await loadBitrixPortal();

  if (
    portal === null ||
    request.memberId !== portal.memberId ||
    request.applicationToken === undefined ||
    (portal.applicationToken !== undefined &&
      portal.applicationToken !== request.applicationToken)
  ) {
    return jsonResponse(403, { message: 'Unknown portal' });
  }

  if (request.event === 'ONAPPUNINSTALL') {
    await forgetBitrixPortal();

    return { status: 'UNLINKED' };
  }

  if (portal.applicationToken === undefined) {
    await saveBitrixPortal({ ...portal, applicationToken: request.applicationToken });
  }

  return { status: 'IGNORED' };
};

export default defineLogicFunction({
  universalIdentifier: BITRIX_EVENT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-bitrix-event',
  description: 'События портала Битрикс24 (удаление приложения)',
  timeoutSeconds: 15,
  handler,
  httpRouteTriggerSettings: {
    path: '/bitrix/event',
    httpMethod: 'POST',
    isAuthRequired: false,
  },
});
