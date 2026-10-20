import { DOCFLOW_SECTION, CRM_SECTION, TASK_DONE_STATUS, TASK_TODO_STATUS } from 'src/shared/docflow.constants';
import { parseFormFields } from 'src/shared/form/form-fields.util';
import { getRunTargetRecord } from 'src/shared/workflow/run-target-record.util';
import { getFormStepTaskRequests } from 'src/shared/workflow/workflow-run.util';
import {
  createTask,
  createTaskTarget,
  findOpenTasksOfRun,
  findTaskByThreadId,
  getWorkflow,
  getWorkflowRun,
  updateTask,
  type WorkflowRunRecord,
} from 'src/server/records';

export type HandOutResult = 'CREATED' | 'ALREADY_HANDED_OUT' | 'NOT_WAITING';

// Creates the CRM task of one waiting FORM step. The run is read again: the
// job may run after the step was answered or the task created.
export const handOutFormStep = async ({
  workflowRunId,
  stepId,
  threadId,
}: {
  workflowRunId: string;
  stepId: string;
  threadId: string;
}): Promise<HandOutResult> => {
  if ((await findTaskByThreadId(threadId)) !== undefined) {
    return 'ALREADY_HANDED_OUT';
  }

  const run = await getWorkflowRun('application', workflowRunId);
  const request = getFormStepTaskRequests({
    state: run?.state,
    runStarterWorkspaceMemberId: run?.createdBy?.workspaceMemberId,
    now: new Date(),
  }).find(
    (candidate) => candidate.stepId === stepId && candidate.threadId === threadId,
  );

  if (run === undefined || request === undefined) {
    return 'NOT_WAITING';
  }

  const workflow =
    typeof run.workflowId === 'string'
      ? await getWorkflow('application', run.workflowId)
      : undefined;

  const task = await createTask('application', {
    title: request.title,
    assigneeId: request.assigneeWorkspaceMemberId,
    dueAt: request.dueAt ?? null,
    status: TASK_TODO_STATUS,
    smbSection:
      workflow?.smbSection === DOCFLOW_SECTION ? DOCFLOW_SECTION : CRM_SECTION,
    smbFormSchema: request.fields,
    smbFormValues: {},
    smbWorkflowRunId: run.id,
    smbWorkflowStepId: request.stepId,
    smbWorkflowThreadId: request.threadId,
  });

  const target = getRunTargetRecord(run.state);

  // The task stands without the link: a record deleted meanwhile must not
  // cancel handing it out.
  if (task !== undefined && target !== undefined) {
    await createTaskTarget({
      taskId: task.id,
      [target.targetFieldName]: target.recordId,
    }).catch(() => undefined);
  }

  return 'CREATED';
};

// A step answered on the run page or by a launch closes its open task with
// the answer, so the task does not stay open.
export const closeTasksOfAnsweredSteps = async (
  run: WorkflowRunRecord,
): Promise<number> => {
  const tasks = await findOpenTasksOfRun(run.id);
  let closedCount = 0;

  for (const task of tasks) {
    const stepInfo =
      typeof task.smbWorkflowStepId === 'string'
        ? run.state?.stepInfos?.[task.smbWorkflowStepId]
        : undefined;

    if (
      stepInfo?.status !== 'SUCCESS' ||
      stepInfo.threadId !== task.smbWorkflowThreadId
    ) {
      continue;
    }

    const answer =
      typeof stepInfo.result === 'object' && stepInfo.result !== null
        ? (stepInfo.result as Record<string, unknown>)
        : {};
    const fieldNames = parseFormFields(task.smbFormSchema).map(({ name }) => name);

    await updateTask('application', task.id, {
      smbFormValues: Object.fromEntries(
        fieldNames.filter((name) => name in answer).map((name) => [name, answer[name]]),
      ),
      status: TASK_DONE_STATUS,
    });
    closedCount++;
  }

  return closedCount;
};
