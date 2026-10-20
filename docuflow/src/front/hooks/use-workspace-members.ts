import { useUserId } from 'twenty-sdk/front-component';

import { listRecords } from 'src/front/api';
import { useAsync } from 'src/front/hooks/use-async';
import { type WorkspaceMember } from 'src/front/types';

const MEMBERS_LIMIT = 200;

export const useWorkspaceMembers = () => {
  const userId = useUserId();
  const { data } = useAsync(
    () =>
      listRecords<WorkspaceMember>('workspaceMembers', { limit: MEMBERS_LIMIT }),
    [],
  );
  const members = data?.records ?? [];

  return {
    members,
    currentMember: members.find((member) => member.userId === userId),
  };
};
