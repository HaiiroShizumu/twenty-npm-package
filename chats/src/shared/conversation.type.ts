export type ConversationKind = 'DIRECT' | 'GROUP' | 'RECORD' | 'FEED_POST';
export type MessageKind = 'TEXT' | 'VOICE' | 'FILE' | 'SYSTEM' | 'CALL';
export type MemberRole = 'OWNER' | 'MEMBER';

export type MessageBodyNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null>;
  content?: MessageBodyNode[];
};

export type MessageBody = MessageBodyNode & { type: 'doc' };

// Записи объектов приложения, как их отдаёт REST.
export type ConversationRecord = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  directKey: string | null;
  recordObjectName: string | null;
  recordId: string | null;
  recordKey: string | null;
  lastSeq: number | null;
  lastMessageAt: string | null;
  creatorId: string | null;
  createdAt: string;
};

export type MemberRecord = {
  id: string;
  memberKey: string | null;
  conversationId: string;
  workspaceMemberId: string;
  memberRole: MemberRole;
  lastReadSeq: number | null;
  mutedUntil: string | null;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  seq: number;
  seqKey: string | null;
  kind: MessageKind;
  authorId: string | null;
  body: MessageBody | null;
  text: string | null;
  clientMessageId: string | null;
  clientKey: string | null;
  editedAt: string | null;
  removedAt: string | null;
  createdAt: string;
};

// То, что видит человек: позиция чтения и непрочитанное — его.
export type MessageView = {
  id: string;
  conversationId: string;
  seq: number;
  kind: MessageKind;
  authorId: string | null;
  text: string;
  createdAt: string;
  editedAt: string | null;
  isRemoved: boolean;
};

export type ConversationView = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  recordObjectName: string | null;
  recordId: string | null;
  memberIds: string[];
  lastSeq: number;
  lastReadSeq: number;
  unreadCount: number;
  lastMessage: MessageView | null;
  lastMessageAt: string | null;
  createdAt: string;
};
