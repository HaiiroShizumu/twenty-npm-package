import { FORM_FIELD_DUE_IN_DAYS_SETTING } from 'src/shared/docflow.constants';
import { type FormField } from 'src/shared/form/form-field.type';
import {
  getFillableFormFields,
  getFormFieldRole,
  parseFormFields,
} from 'src/shared/form/form-fields.util';
import {
  type WorkflowFormStep,
  type WorkflowRunState,
  type WorkflowStep,
} from 'src/shared/workflow/workflow-run.type';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VARIABLE_PATTERN = /^\{\{\s*([^}]+?)\s*\}\}$/;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isFormStep = (step: WorkflowStep): step is WorkflowFormStep =>
  step.type === 'FORM';

export const getFormStepFields = (step: WorkflowStep): FormField[] =>
  parseFormFields(step.settings?.input);

// A field value written as one variable ("{{trigger.properties.after.ownerId}}",
// "{{<form step>.manager}}") is read from what that step returned. Text with
// variables inside is not a person or a date, so it stays as it is.
export const resolveStepVariable = (
  value: unknown,
  stepInfos: WorkflowRunState['stepInfos'],
): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const match = VARIABLE_PATTERN.exec(value);

  if (match === null) {
    return value;
  }

  const [stepId, ...path] = match[1].split('.');
  let current: unknown = stepInfos?.[stepId]?.result;

  for (const key of path) {
    if (!isPlainRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return current;
};

const readWorkspaceMemberId = (value: unknown): string | undefined => {
  const id = isPlainRecord(value) ? value.id : value;

  return typeof id === 'string' && UUID_PATTERN.test(id) ? id : undefined;
};

const readDueAt = (
  field: FormField | undefined,
  now: Date,
): string | undefined => {
  if (field === undefined) {
    return undefined;
  }

  if (typeof field.value === 'string' && field.value.length > 0) {
    const dueAt = new Date(field.value);

    return Number.isNaN(dueAt.getTime()) ? undefined : dueAt.toISOString();
  }

  const dueInDays = field.settings?.[FORM_FIELD_DUE_IN_DAYS_SETTING];

  return typeof dueInDays === 'number' && dueInDays > 0
    ? new Date(now.getTime() + dueInDays * DAY_IN_MS).toISOString()
    : undefined;
};

export const resolveFormStepFields = (
  fields: FormField[],
  stepInfos: WorkflowRunState['stepInfos'],
): FormField[] =>
  fields.map((field) =>
    getFormFieldRole(field) === undefined
      ? field
      : { ...field, value: resolveStepVariable(field.value, stepInfos) },
  );

export const getFormStepAssignment = ({
  fields,
  now,
}: {
  fields: FormField[];
  now: Date;
}): { assigneeWorkspaceMemberId?: string; dueAt?: string } => ({
  assigneeWorkspaceMemberId: readWorkspaceMemberId(
    fields.find((field) => getFormFieldRole(field) === 'ASSIGNEE')?.value,
  ),
  dueAt: readDueAt(
    fields.find((field) => getFormFieldRole(field) === 'DUE_AT'),
    now,
  ),
});

export type FormStepTaskRequest = {
  stepId: string;
  threadId: string;
  title: string;
  assigneeWorkspaceMemberId: string;
  dueAt?: string;
  fields: FormField[];
};

// FORM steps a run waits on and who fills each. A step without an assignee
// belongs to whoever started the run by hand.
export const getFormStepTaskRequests = ({
  state,
  runStarterWorkspaceMemberId,
  now,
}: {
  state: WorkflowRunState | null | undefined;
  runStarterWorkspaceMemberId: string | null | undefined;
  now: Date;
}): FormStepTaskRequest[] => {
  const steps = state?.flow?.steps ?? [];
  const stepInfos = state?.stepInfos ?? {};
  const isStartedByHand = state?.flow?.trigger?.type === 'MANUAL';

  return steps.flatMap((step) => {
    const stepInfo = stepInfos[step.id];

    if (
      !isFormStep(step) ||
      stepInfo?.status !== 'PENDING' ||
      (stepInfo.error !== undefined && stepInfo.error !== null) ||
      typeof stepInfo.threadId !== 'string' ||
      stepInfo.threadId.length === 0
    ) {
      return [];
    }

    const fields = resolveFormStepFields(getFormStepFields(step), stepInfos);
    const { assigneeWorkspaceMemberId, dueAt } = getFormStepAssignment({
      fields,
      now,
    });
    const fallbackAssigneeId = isStartedByHand
      ? (runStarterWorkspaceMemberId ?? undefined)
      : undefined;
    const taskAssigneeId = assigneeWorkspaceMemberId ?? fallbackAssigneeId;

    if (taskAssigneeId === undefined) {
      return [];
    }

    return [
      {
        stepId: step.id,
        threadId: stepInfo.threadId,
        title: step.name,
        assigneeWorkspaceMemberId: taskAssigneeId,
        dueAt,
        fields: getFillableFormFields(fields),
      },
    ];
  });
};
