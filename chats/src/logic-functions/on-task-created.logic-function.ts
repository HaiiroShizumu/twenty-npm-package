import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type DatabaseEventPayload,
  type ObjectRecordCreateEvent,
} from 'twenty-sdk/logic-function';

import { isAppEngine } from 'src/shared/engine';
import { syncTaskChat, type TaskChatSnapshot } from 'src/server/task-chat';
import { ON_TASK_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const handler = async (
  event: DatabaseEventPayload<ObjectRecordCreateEvent<TaskChatSnapshot>>,
) => {
  if (!isAppEngine()) {
    return { skipped: 'FORK_ENGINE' };
  }

  return syncTaskChat({ ...event.properties.after, id: event.recordId });
};

export default defineLogicFunction({
  universalIdentifier: ON_TASK_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'messenger-on-task-created',
  description: 'Заводит чат новой задачи с автором и исполнителем',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'task.created',
  },
});
