import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type DatabaseEventPayload,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/logic-function';

import { isAppEngine } from 'src/shared/engine';
import { syncTaskChat, type TaskChatSnapshot } from 'src/server/task-chat';
import { ON_TASK_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Новый исполнитель или включённый чат: недостающие люди входят в чат задачи.
// Снятый исполнитель остаётся в беседе — переписка у него уже есть.
const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<TaskChatSnapshot>>,
) => {
  if (!isAppEngine()) {
    return { skipped: 'FORK_ENGINE' };
  }

  const { after } = event.properties;

  if (after === undefined) {
    return { skipped: 'NO_RECORD' };
  }

  return syncTaskChat({ ...after, id: event.recordId });
};

export default defineLogicFunction({
  universalIdentifier: ON_TASK_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'messenger-on-task-updated',
  description: 'Добавляет в чат задачи нового исполнителя',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'task.updated',
    updatedFields: ['assigneeId', 'smbIsChatEnabled'],
  },
});
