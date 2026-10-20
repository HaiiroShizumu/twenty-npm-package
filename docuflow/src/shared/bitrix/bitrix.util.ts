import { type BitrixGrant, type BitrixRequest } from 'src/shared/bitrix/bitrix.type';

export const BITRIX_OAUTH_TOKEN_URL = 'https://oauth.bitrix.info/oauth/token/';
export const BITRIX_PORTAL_KV_KEY = 'bitrix:portal';

const DEFAULT_EXPIRES_IN_SECONDS = 3600;

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

// The portal posts form fields (AUTH_ID, REFRESH_ID, member_id; for events
// event=..., auth[application_token]=...). Nothing here is trusted until the
// refresh token has been exchanged, or the event token compared.
export const parseBitrixRequest = ({
  rawBody,
  body,
  query,
}: {
  rawBody?: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
}): BitrixRequest => {
  const fields = new Map<string, string>();

  if (typeof rawBody === 'string' && rawBody.length > 0 && !rawBody.startsWith('{')) {
    new URLSearchParams(rawBody).forEach((value, key) => fields.set(key, value));
  } else if (typeof body === 'object' && body !== null) {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (typeof value === 'string') {
        fields.set(key, value);
      } else if (typeof value === 'object' && value !== null) {
        for (const [nestedKey, nestedValue] of Object.entries(
          value as Record<string, unknown>,
        )) {
          if (typeof nestedValue === 'string') {
            fields.set(`${key}[${nestedKey}]`, nestedValue);
          }
        }
      }
    }
  }

  return {
    authId: readString(fields.get('AUTH_ID')) ?? readString(fields.get('auth[access_token]')),
    refreshId:
      readString(fields.get('REFRESH_ID')) ?? readString(fields.get('auth[refresh_token]')),
    memberId: readString(fields.get('member_id')) ?? readString(fields.get('auth[member_id]')),
    event: readString(fields.get('event')),
    applicationToken: readString(fields.get('auth[application_token]')),
    domain: readString(query?.DOMAIN) ?? readString(fields.get('auth[domain]')),
  };
};

// Only an https portal REST address of the form https://<host>/rest/ is
// accepted from the token answer.
export const parseBitrixRestEndpoint = (
  value: unknown,
): { restEndpoint: string; portalDomain: string } | undefined => {
  const text = readString(value);

  if (text === undefined) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(text);
  } catch {
    return undefined;
  }

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    url.port !== '' ||
    url.pathname.replace(/\/+$/, '') !== '/rest'
  ) {
    return undefined;
  }

  return { restEndpoint: `https://${url.hostname}/rest/`, portalDomain: url.hostname };
};

export const parseBitrixGrant = (
  data: unknown,
  now: number,
): BitrixGrant | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const record = data as Record<string, unknown>;
  const endpoint = parseBitrixRestEndpoint(record.client_endpoint);
  const memberId = readString(record.member_id);
  const accessToken = readString(record.access_token);
  const refreshToken = readString(record.refresh_token);

  if (
    endpoint === undefined ||
    memberId === undefined ||
    accessToken === undefined ||
    refreshToken === undefined
  ) {
    return undefined;
  }

  const expiresInSeconds = Number(record.expires_in);
  const userId = record.user_id;

  return {
    memberId,
    restEndpoint: endpoint.restEndpoint,
    portalDomain: endpoint.portalDomain,
    accessToken,
    refreshToken,
    expiresAt:
      now +
      (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
        ? expiresInSeconds
        : DEFAULT_EXPIRES_IN_SECONDS) *
        1000,
    bitrixUserId:
      typeof userId === 'number' ? String(userId) : readString(userId),
  };
};

// HTML is built from text the app controls, but names and titles come from
// records, so everything shown is escaped.
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
