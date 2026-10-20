import {
  ANSWER_TOOL_CALL_MUTATION,
  callCoreGraphql,
  RUN_WORKFLOW_VERSION_MUTATION,
} from 'src/shared/api/core-graphql.util';
import { type FormValues } from 'src/shared/form/form-field.type';
import {
  buildFormStepResponse,
  findMissingRequiredFields,
  getFormFieldRole,
} from 'src/shared/form/form-fields.util';
import { type WorkflowRunState } from 'src/shared/workflow/workflow-run.type';
import {
  getFormStepAssignment,
  getFormStepFields,
  isFormStep,
  resolveFormStepFields,
} from 'src/shared/workflow/workflow-run.util';

// The two calls the app makes to the workflow engine. Both run as the person
// behind the current run: Twenty lets only a person with the "Workflows"
// permission start a version or answer a step of a running process.
export const runWorkflowVersion = async ({
  workflowVersionId,
  workflowRunId,
  payload,
}: {
  workflowVersionId: string;
  workflowRunId: string;
  payload: Record<string, unknown>;
}): Promise<string> => {
  const data = await callCoreGraphql<{
    runWorkflowVersion: { workflowRunId: string };
  }>({
    query: RUN_WORKFLOW_VERSION_MUTATION,
    variables: { input: { workflowVersionId, workflowRunId, payload } },
  });

  return data.runWorkflowVersion.workflowRunId;
};

export type AnswerFormStepResult =
  | { status: 'ANSWERED' }
  | { status: 'NOT_WAITING' }
  | { status: 'MISSING_REQUIRED'; labels: string[] };

export const answerFormStep = async ({
  state,
  stepId,
  threadId,
  values,
}: {
  state: WorkflowRunState | null | undefined;
  stepId: string;
  threadId: string;
  values: FormValues;
}): Promise<AnswerFormStepResult> => {
  const step = state?.flow?.steps?.find((candidate) => candidate.id === stepId);
  const stepInfo = state?.stepInfos?.[stepId];

  if (
    step === undefined ||
    !isFormStep(step) ||
    stepInfo?.status !== 'PENDING' ||
    stepInfo.threadId !== threadId
  ) {
    return { status: 'NOT_WAITING' };
  }

  const fields = resolveFormStepFields(
    getFormStepFields(step),
    state?.stepInfos,
  );
  const missingFields = findMissingRequiredFields({ fields, values });

  if (missingFields.length > 0) {
    return {
      status: 'MISSING_REQUIRED',
      labels: missingFields.map(({ label }) => label),
    };
  }

  // The assignee goes out as { id }: the engine then puts the whole member
  // into the step output, as for a record picked in the form.
  const { assigneeWorkspaceMemberId } = getFormStepAssignment({
    fields,
    now: new Date(),
  });
  const response = buildFormStepResponse({
    fields: fields.map((field) =>
      getFormFieldRole(field) === 'ASSIGNEE' &&
      assigneeWorkspaceMemberId !== undefined
        ? { ...field, value: { id: assigneeWorkspaceMemberId } }
        : field,
    ),
    values,
  });

  await callCoreGraphql({
    query: ANSWER_TOOL_CALL_MUTATION,
    variables: { input: { threadId, toolCallId: stepId, response } },
  });

  return { status: 'ANSWERED' };
};
