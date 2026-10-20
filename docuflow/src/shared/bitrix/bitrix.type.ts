// A Bitrix24 portal linked to this workspace. Kept in the app's key-value
// store, never in records: it holds tokens.
export type BitrixPortal = {
  memberId: string;
  portalDomain: string;
  restEndpoint: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  // Sent by the portal with every event; proves an event comes from it.
  applicationToken?: string;
};

export type BitrixGrant = Omit<BitrixPortal, 'applicationToken'> & {
  bitrixUserId?: string;
};

export type BitrixRequest = {
  authId?: string;
  refreshId?: string;
  memberId?: string;
  event?: string;
  applicationToken?: string;
  domain?: string;
};
