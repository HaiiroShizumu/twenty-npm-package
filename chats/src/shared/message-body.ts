import { MESSAGE_MAX_TEXT_LENGTH } from 'src/shared/messenger.constants';
import {
  type MessageBody,
  type MessageBodyNode,
} from 'src/shared/conversation.type';

export type BuiltMessageBody =
  | { status: 'OK'; body: MessageBody; text: string }
  | { status: 'EMPTY' }
  | { status: 'TOO_LONG' };

// Текст из поля ввода становится тем же документом редактора, что пишет
// мессенджер форка: абзац на строку. `text` — проекция для превью и поиска.
export const buildMessageBody = (rawText: string): BuiltMessageBody => {
  const text = rawText.replace(/\r\n?/g, '\n').trim();

  if (text.length === 0) {
    return { status: 'EMPTY' };
  }

  if (text.length > MESSAGE_MAX_TEXT_LENGTH) {
    return { status: 'TOO_LONG' };
  }

  const content: MessageBodyNode[] = text
    .split('\n')
    .map((line) =>
      line.length === 0
        ? { type: 'paragraph' }
        : { type: 'paragraph', content: [{ type: 'text', text: line }] },
    );

  return { status: 'OK', body: { type: 'doc', content }, text };
};
