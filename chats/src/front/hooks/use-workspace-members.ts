import { useCallback } from 'react';
import { useUserId } from 'twenty-sdk/front-component';

import { listWorkspaceMembers } from 'src/front/api';
import { useAsync } from 'src/front/hooks/use-async';
import { type WorkspaceMember } from 'src/front/types';

export const getWorkspaceMemberName = (
  member: WorkspaceMember | undefined,
): string => {
  const name = [member?.name?.firstName, member?.name?.lastName]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    )
    .join(' ');

  return name.length > 0 ? name : 'Сотрудник';
};

export const useWorkspaceMembers = () => {
  const userId = useUserId();
  const { data } = useAsync(listWorkspaceMembers, []);
  const members = data ?? [];
  const getMemberName = useCallback(
    (workspaceMemberId: string) =>
      getWorkspaceMemberName(
        members.find((member) => member.id === workspaceMemberId),
      ),
    [members],
  );

  return {
    members,
    currentMember: members.find((member) => member.userId === userId),
    getMemberName,
  };
};
