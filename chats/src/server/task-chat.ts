import {
  addMembersToConversation,
  findOrCreateRecordConversation,
} from 'src/server/messenger-service';

export type TaskChatSnapshot = {
  id: string;
  title?: string | null;
  assigneeId?: string | null;
  smbIsChatEnabled?: boolean | null;
  createdBy?: { workspaceMemberId?: string | null } | null;
};

export const getTaskChatMemberIds = (task: TaskChatSnapshot): string[] => [
  ...new Set(
    [task.createdBy?.workspaceMemberId, task.assigneeId].filter(
      (memberId): memberId is string =>
        typeof memberId === 'string' && memberId.length > 0,
    ),
  ),
];

// Чат появляется, когда у задачи больше одного человека (автор и
// исполнитель): одному говорить не с кем. Соисполнители и наблюдатели —
// модуль задач форка, на любом Twenty их нет.
export const syncTaskChat = async (task: TaskChatSnapshot) => {
  if (task.smbIsChatEnabled === false) {
    return { status: 'CHAT_OFF' as const };
  }

  const memberIds = getTaskChatMemberIds(task);

  if (memberIds.length < 2) {
    return { status: 'ALONE' as const };
  }

  const conversation = await findOrCreateRecordConversation({
    objectName: 'task',
    recordId: task.id,
    recordName: task.title ?? null,
    creatorId: task.createdBy?.workspaceMemberId ?? memberIds[0],
  });
  const addedCount = await addMembersToConversation({
    conversation,
    members: memberIds.map((workspaceMemberId) => ({
      workspaceMemberId,
      role: 'MEMBER' as const,
    })),
  });

  return { status: 'SYNCED' as const, addedCount };
};
