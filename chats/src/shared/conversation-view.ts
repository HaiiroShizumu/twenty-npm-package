import {
  type ConversationRecord,
  type ConversationView,
  type MemberRecord,
  type MessageRecord,
  type MessageView,
} from 'src/shared/conversation.type';

export const toMessageView = (message: MessageRecord): MessageView => ({
  id: message.id,
  conversationId: message.conversationId,
  seq: Number(message.seq),
  kind: message.kind,
  authorId: message.authorId,
  text: message.removedAt === null ? (message.text ?? '') : '',
  createdAt: message.createdAt,
  editedAt: message.editedAt,
  isRemoved: message.removedAt !== null,
});

export const toConversationView = ({
  conversation,
  members,
  viewerWorkspaceMemberId,
  lastMessage,
}: {
  conversation: ConversationRecord;
  members: MemberRecord[];
  viewerWorkspaceMemberId: string;
  lastMessage: MessageRecord | undefined;
}): ConversationView => {
  const lastSeq = Number(conversation.lastSeq ?? 0);
  const lastReadSeq = Number(
    members.find(
      (member) => member.workspaceMemberId === viewerWorkspaceMemberId,
    )?.lastReadSeq ?? 0,
  );

  return {
    id: conversation.id,
    kind: conversation.kind,
    name: conversation.name,
    recordObjectName: conversation.recordObjectName,
    recordId: conversation.recordId,
    memberIds: members.map((member) => member.workspaceMemberId),
    lastSeq,
    lastReadSeq,
    unreadCount: Math.max(lastSeq - lastReadSeq, 0),
    lastMessage: lastMessage === undefined ? null : toMessageView(lastMessage),
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
  };
};

// Свежие сверху; беседа без сообщений — по времени создания.
export const sortConversations = (
  conversations: ConversationView[],
): ConversationView[] =>
  [...conversations].sort(
    (first, second) =>
      Date.parse(second.lastMessageAt ?? second.createdAt) -
      Date.parse(first.lastMessageAt ?? first.createdAt),
  );

export const getConversationTitle = ({
  conversation,
  viewerWorkspaceMemberId,
  getMemberName,
}: {
  conversation: ConversationView;
  viewerWorkspaceMemberId: string | undefined;
  getMemberName: (workspaceMemberId: string) => string;
}): string => {
  if (conversation.kind === 'DIRECT') {
    const colleagueId = conversation.memberIds.find(
      (memberId) => memberId !== viewerWorkspaceMemberId,
    );

    return colleagueId === undefined ? 'Заметки' : getMemberName(colleagueId);
  }

  if (conversation.name !== null && conversation.name.trim().length > 0) {
    return conversation.name;
  }

  return conversation.kind === 'RECORD' ? 'Чат записи' : 'Беседа';
};
