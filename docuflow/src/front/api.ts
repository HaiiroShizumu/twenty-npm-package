import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';

import { readRestList, readRestRecord, type RestList } from 'src/shared/api/rest-response.util';
import { logDocflowError } from 'src/shared/log.util';

// Front components read and write records as the person looking at the page
// and call the app's routes for what needs the server (launch, complete).
const client = new RestApiClient();

export const listRecords = async <TRecord>(
  namePlural: string,
  query: Record<string, string | number | undefined>,
): Promise<RestList<TRecord>> =>
  readRestList<TRecord>(await client.get(`/rest/${namePlural}`, { query }));

export const getRecord = async <TRecord>(namePlural: string, id: string) =>
  readRestRecord<TRecord>(await client.get(`/rest/${namePlural}/${id}`));

export const createRecord = async <TRecord>(
  namePlural: string,
  data: Record<string, unknown>,
) => readRestRecord<TRecord>(await client.post(`/rest/${namePlural}`, data));

export const updateRecord = async <TRecord>(
  namePlural: string,
  id: string,
  data: Record<string, unknown>,
) => readRestRecord<TRecord>(await client.patch(`/rest/${namePlural}/${id}`, data));

export const callAppRoute = async <TResult>(path: string, body: Record<string, unknown>) => {
  try {
    return await client.post<TResult>(`/s${path}`, body);
  } catch (error) {
    logDocflowError(`route ${path} failed`, error, body);
    throw error;
  }
};

// The message a person sees: what the server said when it said something.
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof RestApiClientError) {
    const body = error.body as { message?: unknown; messages?: unknown } | undefined;

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

  // Без текста причины со стенда не понять, что сломалось.
  if (error instanceof Error && error.message.length > 0) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
};
