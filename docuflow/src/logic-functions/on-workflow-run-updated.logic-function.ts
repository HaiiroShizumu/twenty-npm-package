import { defineLogicFunction } from 'twenty-sdk/define';
import {
  enqueueJobs,
  type DatabaseEventPayload,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/logic-function';

import { isAppEngine } from 'src/shared/engine';
import { getFormStepTaskRequests } from 'src/shared/workflow/workflow-run.util';
import { closeTasksOfAnsweredSteps } from 'src/server/process-tasks';
import { type WorkflowRunRecord } from 'src/server/records';
import {
  HAND_OUT_FORM_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  ON_WORKFLOW_RUN_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// Process tasks follow the run: a FORM step the run waits on becomes a CRM
// task, and a step answered elsewhere closes its task. Handing out is queued
// under the step's thread id, so repeated run updates create one task.
const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<WorkflowRunRecord>>,
) => {
  if (!isAppEngine()) {
    return { skipped: 'FORK_ENGINE' };
  }

  const run = { ...event.properties.after, id: event.recordId };

  if (run.status !== 'RUNNING' || run.state === undefined || run.state === null) {
    return { skipped: 'NOT_RUNNING' };
  }

  const requests = getFormStepTaskRequests({
    state: run.state,
    runStarterWorkspaceMemberId: run.createdBy?.workspaceMemberId,
    now: new Date(),
  });

  if (requests.length > 0) {
    await enqueueJobs({
      logicFunctionUniversalIdentifier:
        HAND_OUT_FORM_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
      jobs: requests.map((request) => ({
        payload: {
          workflowRunId: run.id,
          stepId: request.stepId,
          threadId: request.threadId,
        },
        jobId: `hand-out-${request.threadId}`,
      })),
      retryLimit: 2,
    });
  }

  const closedTaskCount = await closeTasksOfAnsweredSteps(run);

  return { queuedTaskCount: requests.length, closedTaskCount };
};

export default defineLogicFunction({
  universalIdentifier: ON_WORKFLOW_RUN_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-on-workflow-run-updated',
  description: 'Выдаёт задачи по шагам процессов и закрывает отвеченные',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'workflowRun.updated',
    updatedFields: ['state', 'status'],
  },
});
