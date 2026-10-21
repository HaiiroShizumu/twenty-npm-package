export const buildDocflowPagePath = (pageLayoutId: string): string =>
  `/page/${pageLayoutId}`;

// Invite for a new employee, or the docflow page for someone already in the
// company. Email is prefilled on Twenty's standard signup / welcome screens.
export const buildBitrixEntryUrl = ({
  crmUrl,
  inviteHash,
  pageLayoutId,
  email,
  memberExists,
}: {
  crmUrl: string;
  inviteHash: string;
  pageLayoutId: string;
  email: string;
  memberExists: boolean;
}): string => {
  const returnToPath = buildDocflowPagePath(pageLayoutId);

  if (memberExists) {
    return new URL(returnToPath, `${crmUrl}/`).toString();
  }

  const url = new URL(`/invite/${encodeURIComponent(inviteHash)}`, `${crmUrl}/`);

  url.searchParams.set('email', email);
  url.searchParams.set('returnToPath', returnToPath);

  return url.toString();
};
