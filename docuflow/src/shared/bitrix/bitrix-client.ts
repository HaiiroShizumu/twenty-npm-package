import { type BitrixGrant, type BitrixPortal } from 'src/shared/bitrix/bitrix.type';
import { BITRIX_OAUTH_TOKEN_URL, parseBitrixGrant } from 'src/shared/bitrix/bitrix.util';

const TOKEN_REFRESH_MARGIN_MS = 60_000;

export class BitrixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BitrixError';
  }
}

const getClientCredentials = (): { clientId: string; clientSecret: string } => {
  const clientId = process.env.BITRIX_CLIENT_ID;
  const clientSecret = process.env.BITRIX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new BitrixError('BITRIX_CLIENT_ID and BITRIX_CLIENT_SECRET are not set');
  }

  return { clientId, clientSecret };
};

export const isBitrixConfigured = (): boolean =>
  Boolean(process.env.BITRIX_CLIENT_ID) && Boolean(process.env.BITRIX_CLIENT_SECRET);

// The one proof a portal request has to pass: its refresh token is exchanged
// with the app's client secret, and the portal id, REST address and tokens
// are taken from the answer of oauth.bitrix.info, not from the request.
export const exchangeBitrixRefreshToken = async (
  refreshToken: string,
): Promise<BitrixGrant> => {
  const { clientId, clientSecret } = getClientCredentials();
  const url = new URL(BITRIX_OAUTH_TOKEN_URL);

  url.searchParams.set('grant_type', 'refresh_token');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('refresh_token', refreshToken);

  let response: Response;

  try {
    response = await fetch(url, { redirect: 'error' });
  } catch {
    // The URL carries the client secret, so the original error is not kept.
    throw new BitrixError('oauth.bitrix.info is unreachable');
  }

  const grant = parseBitrixGrant(await response.json().catch(() => null), Date.now());

  if (!response.ok || grant === undefined) {
    throw new BitrixError(`Bitrix24 did not accept the refresh token (HTTP ${response.status})`);
  }

  return grant;
};

export const withFreshBitrixToken = async (
  portal: BitrixPortal,
): Promise<{ portal: BitrixPortal; isRefreshed: boolean }> => {
  if (portal.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    return { portal, isRefreshed: false };
  }

  const grant = await exchangeBitrixRefreshToken(portal.refreshToken);

  if (grant.memberId !== portal.memberId) {
    throw new BitrixError('The refreshed token belongs to another portal');
  }

  return {
    portal: {
      ...portal,
      accessToken: grant.accessToken,
      refreshToken: grant.refreshToken,
      expiresAt: grant.expiresAt,
      restEndpoint: grant.restEndpoint,
    },
    isRefreshed: true,
  };
};

export const callBitrix = async <TResult>({
  restEndpoint,
  accessToken,
  method,
  params,
}: {
  restEndpoint: string;
  accessToken: string;
  method: string;
  params: Record<string, unknown>;
}): Promise<TResult> => {
  const response = await fetch(`${restEndpoint}${method}.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...params, auth: accessToken }),
    redirect: 'error',
  });
  const body = (await response.json().catch(() => null)) as {
    result?: TResult;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || body === null || body.error !== undefined) {
    throw new BitrixError(
      `Bitrix24 ${method} failed: ${body?.error ?? response.status} ${body?.error_description ?? ''}`.trim(),
    );
  }

  return body.result as TResult;
};
