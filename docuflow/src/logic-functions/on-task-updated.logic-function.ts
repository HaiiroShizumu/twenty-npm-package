import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type DatabaseEventPayload,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/logic-function';

import { TASK_DONE_STATUS, TASK_TODO_STATUS } from 'src/shared/docflow.constants';
import { isAppEngine } from 'src/shared/engine';
import {
  findMissingRequiredFields,
  parseFormFields,
  parseFormValues,
} from 'src/shared/form/form-fields.util';
import { type DocflowTaskRecord, updateTask } from 'src/server/records';
import { answerStepOfTask } from 'src/server/task-completion';
import { ON_TASK_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// A task closed outside the docflow page (the board, the list, the API).
// Twenty gives apps no way to refuse a save, so a close that breaks the
// rules is undone right after it: required fields empty, or the process did
// not accept the answer.
const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<DocflowTaskRecord>>,
) => {
  if (!isAppEngine()) {
    return { skipped: 'FORK_ENGINE' };
  }

  const { before, after } = event.properties;

  if (after?.status !== TASK_DONE_STATUS || before?.status === TASK_DONE_STATUS) {
    return { skipped: 'NOT_COMPLETED' };
  }

  const task = { ...after, id: event.recordId };
  const values = parseFormValues(task.smbFormValues);
  const missingFields = findMissingRequiredFields({
    fields: parseFormFields(task.smbFormSchema),
    values,
  });
  const stepResult =
    missingFields.length > 0 ? undefined : await answerStepOfTask(task, values);

  if (missingFields.length === 0 && stepResult === undefined) {
    return { status: 'ACCEPTED' };
  }

  await updateTask('application', task.id, {
    status: before?.status ?? TASK_TODO_STATUS,
  });

  return {
    status: 'REVERTED',
    reason:
      missingFields.length > 0
        ? `Не заполнены: ${missingFields.map(({ label }) => label).join(', ')}`
        : stepResult?.status,
  };
};

export default defineLogicFunction({
  universalIdentifier: ON_TASK_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-on-task-updated',
  description: 'Проверяет закрытие задачи и продолжает процесс',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'task.updated',
    updatedFields: ['status'],
  },
});
