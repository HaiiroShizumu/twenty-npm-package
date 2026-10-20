// Составные уникальные ключи — те же строки, что пишет сервер форка
// (smb-conversations/utils/build-smb-conversation-keys.util.ts): беседы,
// созданные любым движком, находятся по одному ключу.
export const buildDirectKey = (
  firstWorkspaceMemberId: string,
  secondWorkspaceMemberId: string,
): string =>
  firstWorkspaceMemberId < secondWorkspaceMemberId
    ? `${firstWorkspaceMemberId}:${secondWorkspaceMemberId}`
    : `${secondWorkspaceMemberId}:${firstWorkspaceMemberId}`;

export const buildRecordKey = (objectName: string, recordId: string): string =>
  `${objectName}:${recordId}`;

export const buildMemberKey = (
  conversationId: string,
  workspaceMemberId: string,
): string => `${conversationId}:${workspaceMemberId}`;

export const buildSeqKey = (conversationId: string, seq: number): string =>
  `${conversationId}:${seq}`;

export const buildClientKey = (
  conversationId: string,
  clientMessageId: string,
): string => `${conversationId}:${clientMessageId}`;
