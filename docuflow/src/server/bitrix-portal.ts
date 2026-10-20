import { kv } from 'twenty-sdk/logic-function';

import { type BitrixPortal, type BitrixRequest } from 'src/shared/bitrix/bitrix.type';
import { BITRIX_PORTAL_KV_KEY } from 'src/shared/bitrix/bitrix.util';
import {
  BitrixError,
  exchangeBitrixRefreshToken,
  withFreshBitrixToken,
} from 'src/shared/bitrix/bitrix-client';

// One Bitrix24 portal per workspace: a company works in one portal.
export const loadBitrixPortal = (): Promise<BitrixPortal | null> =>
  kv.get<BitrixPortal>(BITRIX_PORTAL_KV_KEY);

export const saveBitrixPortal = (portal: BitrixPortal): Promise<void> =>
  kv.set(BITRIX_PORTAL_KV_KEY, portal);

export const forgetBitrixPortal = (): Promise<boolean> =>
  kv.delete(BITRIX_PORTAL_KV_KEY);

// A request from the portal proves itself by its refresh token. The first
// proven portal is linked; another portal is refused, so a stranger cannot
// take over the workspace's link.
export const proveAndLinkBitrixPortal = async (
  request: BitrixRequest,
): Promise<BitrixPortal & { bitrixUserId?: string }> => {
  if (request.refreshId === undefined) {
    throw new BitrixError('The request carries no refresh token');
  }

  const grant = await exchangeBitrixRefreshToken(request.refreshId);
  const linkedPortal = await loadBitrixPortal();

  if (linkedPortal !== null && linkedPortal.memberId !== grant.memberId) {
    throw new BitrixError('Another Bitrix24 portal is linked to this workspace');
  }

  const portal: BitrixPortal = {
    memberId: grant.memberId,
    portalDomain: grant.portalDomain,
    restEndpoint: grant.restEndpoint,
    accessToken: grant.accessToken,
    refreshToken: grant.refreshToken,
    expiresAt: grant.expiresAt,
    applicationToken: linkedPortal?.applicationToken,
  };

  await saveBitrixPortal(portal);

  return { ...portal, bitrixUserId: grant.bitrixUserId };
};

export const getLinkedBitrixPortal = async (): Promise<BitrixPortal | null> => {
  const linkedPortal = await loadBitrixPortal();

  if (linkedPortal === null) {
    return null;
  }

  const { portal, isRefreshed } = await withFreshBitrixToken(linkedPortal);

  if (isRefreshed) {
    await saveBitrixPortal(portal);
  }

  return portal;
};
