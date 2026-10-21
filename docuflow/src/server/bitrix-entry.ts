import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { kv } from 'twenty-sdk/logic-function';

import { restEq } from 'src/shared/api/rest-filter.util';
import { readRestList } from 'src/shared/api/rest-response.util';
import { type BitrixPerson } from 'src/server/bitrix-person';
import { restClient } from 'src/server/records';
import { DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

export {
  buildBitrixEntryUrl,
  buildDocflowPagePath,
} from 'src/shared/bitrix/bitrix-entry-url';

const DOCFLOW_PAGE_LAYOUT_ID_KV_KEY = 'bitrix:docflow-page-layout-id';

export type WorkspaceMemberMatch = {
  id: string;
  name?: { firstName?: string | null; lastName?: string | null } | null;
  jobTitle?: string | null;
};

export const getCrmPublicUrl = (): string | undefined => {
  const value = process.env.CRM_PUBLIC_URL?.trim();

  return value !== undefined && /^https?:\/\//.test(value)
    ? value.replace(/\/$/, '')
    : undefined;
};

export const getWorkspaceInviteHash = (): string | undefined => {
  const value = process.env.WORKSPACE_INVITE_HASH?.trim();

  return value !== undefined && value.length > 0 ? value : undefined;
};

export const findWorkspaceMemberByEmail = async (
  email: string,
): Promise<WorkspaceMemberMatch | undefined> => {
  const [member] = readRestList<WorkspaceMemberMatch>(
    await restClient('application').get('/rest/workspaceMembers', {
      query: { filter: restEq('userEmail', email), limit: 1 },
    }),
  ).records;

  return member;
};

// Name and job title from the portal, so the card is filled without the
// "create your profile" screen asking again.
export const enrichWorkspaceMemberFromBitrix = async (
  member: WorkspaceMemberMatch,
  person: BitrixPerson,
): Promise<void> => {
  const patch: Record<string, unknown> = {};
  const firstName = person.firstName;
  const lastName = person.lastName;
  const currentFirst = member.name?.firstName?.trim() ?? '';
  const currentLast = member.name?.lastName?.trim() ?? '';

  if (
    (firstName.length > 0 || lastName.length > 0) &&
    (currentFirst !== firstName || currentLast !== lastName)
  ) {
    patch.name = {
      firstName: firstName.length > 0 ? firstName : currentFirst,
      lastName: lastName.length > 0 ? lastName : currentLast,
    };
  }

  if (
    person.jobTitle.length > 0 &&
    (member.jobTitle?.trim() ?? '') !== person.jobTitle
  ) {
    patch.jobTitle = person.jobTitle;
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  await restClient('application').patch(`/rest/workspaceMembers/${member.id}`, patch);
};

export const resolveDocflowPageLayoutId = async (): Promise<string | undefined> => {
  const cached = await kv.get<string>(DOCFLOW_PAGE_LAYOUT_ID_KV_KEY);

  if (typeof cached === 'string' && cached.length > 0) {
    return cached;
  }

  const { getPageLayouts } = await new MetadataApiClient().query({
    getPageLayouts: {
      __args: { pageLayoutType: 'STANDALONE_PAGE' },
      id: true,
      universalIdentifier: true,
    },
  });

  const layout = (getPageLayouts ?? []).find(
    (item) => item.universalIdentifier === DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  );

  if (layout === undefined || typeof layout.id !== 'string') {
    return undefined;
  }

  await kv.set(DOCFLOW_PAGE_LAYOUT_ID_KV_KEY, layout.id);

  return layout.id;
};
