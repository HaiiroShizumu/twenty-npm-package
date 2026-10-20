import { CoreGraphqlError } from 'src/shared/api/core-graphql.util';
import { TASK_DONE_STATUS } from 'src/shared/docflow.constants';
import { isAppEngine } from 'src/shared/engine';
import { type FormValues } from 'src/shared/form/form-field.type';
import {
  findMissingRequiredFields,
  parseFormFields,
  parseFormValues,
} from 'src/shared/form/form-fields.util';
import { getTask, getWorkflowRun, updateTask, type DocflowTaskRecord } from 'src/server/records';
import { answerFormStep } from 'src/server/workflow-engine';

export type CompleteTaskResult =
  | { status: 'DONE' }
  | { status: 'NOT_FOUND' }
  | { status: 'MISSING_REQUIRED'; labels: string[] }
  | { status: 'FAILED'; message: string };

export const isProcessTask = (task: DocflowTaskRecord): boolean =>
  typeof task.smbWorkflowThreadId === 'string' &&
  task.smbWorkflowThreadId.length > 0 &&
  typeof task.smbWorkflowRunId === 'string' &&
  typeof task.smbWorkflowStepId === 'string';

// Answers the process step of a task as the person completing it. A step
// that is no longer waiting (answered elsewhere, run stopped) is not an error.
export const answerStepOfTask = async (
  task: DocflowTaskRecord,
  values: FormValues,
): Promise<CompleteTaskResult | undefined> => {
  if (!isProcessTask(task) || !isAppEngine()) {
    return undefined;
  }

  const run = await getWorkflowRun('person', task.smbWorkflowRunId as string);

  try {
    const result = await answerFormStep({
      state: run?.state,
      stepId: task.smbWorkflowStepId as string,
      threadId: task.smbWorkflowThreadId as string,
      values,
    });

    return result.status === 'MISSING_REQUIRED'
      ? { status: 'MISSING_REQUIRED', labels: result.labels }
      : undefined;
  } catch (error) {
    const refreshedRun = await getWorkflowRun('person', task.smbWorkflowRunId as string);

    if (refreshedRun?.state?.stepInfos?.[task.smbWorkflowStepId as string]?.status === 'SUCCESS') {
      return undefined;
    }

    return {
      status: 'FAILED',
      message:
        error instanceof CoreGraphqlError && error.userMessage !== undefined
          ? error.userMessage
          : 'Процесс не принял ответ. Для ответа на шаги процессов нужно право «Рабочие процессы».',
    };
  }
};

export const completeTask = async ({
  taskId,
  values,
}: {
  taskId: string;
  values: FormValues | undefined;
}): Promise<CompleteTaskResult> => {
  const task = await getTask('person', taskId);

  if (task === undefined) {
    return { status: 'NOT_FOUND' };
  }

  const fields = parseFormFields(task.smbFormSchema);
  const currentValues = values ?? parseFormValues(task.smbFormValues);

  if (values !== undefined) {
    await updateTask('person', taskId, { smbFormValues: values });
  }

  const missingFields = findMissingRequiredFields({ fields, values: currentValues });

  if (missingFields.length > 0) {
    return { status: 'MISSING_REQUIRED', labels: missingFields.map(({ label }) => label) };
  }

  const stepResult = await answerStepOfTask(task, currentValues);

  if (stepResult !== undefined) {
    return stepResult;
  }

  await updateTask('person', taskId, { status: TASK_DONE_STATUS });

  return { status: 'DONE' };
};
