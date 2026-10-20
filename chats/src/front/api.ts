import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';

import { type MessengerApiRequest } from 'src/shared/api/messenger-api.type';
import { readRestList } from 'src/shared/api/rest-response.util';
import {
  MESSENGER_API_PATH,
  REST_MAX_RECORDS,
} from 'src/shared/messenger.constants';
import { type WorkspaceMember } from 'src/front/types';

// Беседы закрыты от штатного REST: страница работает только через функцию
// приложения, которая проверяет участие. Сотрудников она читает сама, от
// имени человека.
const client = new RestApiClient();

export const callMessenger = <TResponse>(request: MessengerApiRequest) =>
  client.post<TResponse>(`/s${MESSENGER_API_PATH}`, request);

export const listWorkspaceMembers = async () =>
  readRestList<WorkspaceMember>(
    await client.get('/rest/workspaceMembers', {
      query: { limit: REST_MAX_RECORDS },
    }),
  ).records;

// Человек видит, что сказал сервер; если сервер ничего не сказал — код ответа
// или текст ошибки браузера, а не одну общую фразу.
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof RestApiClientError) {
    const body = error.body as
      | { message?: unknown; messages?: unknown }
      | undefined;

    if (typeof body?.message === 'string' && body.message.length > 0) {
      return body.message;
    }

    if (Array.isArray(body?.messages) && typeof body.messages[0] === 'string') {
      return body.messages[0];
    }

    return error.status === undefined
      ? `${fallback}: ${error.message}`
      : `${fallback} (ошибка ${error.status})`;
  }

  if (error instanceof Error && error.message.length > 0) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
};
