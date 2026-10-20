export type WorkspaceMember = {
  id: string;
  userId?: string | null;
  name?: { firstName?: string | null; lastName?: string | null } | null;
};
