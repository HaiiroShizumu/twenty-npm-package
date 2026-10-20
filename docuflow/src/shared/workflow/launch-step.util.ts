import {
  DOCFLOW_LAUNCH_PARAMETERS_KEY,
  LAUNCH_PARAMETERS_STEP_INPUT,
  LAUNCH_TRIGGER_NAME,
} from 'src/shared/docflow.constants';
import { type FormField, type FormValues } from 'src/shared/form/form-field.type';
import { getFillableFormFields, parseFormFields } from 'src/shared/form/form-fields.util';
import { type WorkflowStep, type WorkflowTrigger } from 'src/shared/workflow/workflow-run.type';

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The "Launch with parameters" step is the app's workflow action whose input
// takes the parameters of the run; the fork finds it by the same input.
export const isLaunchParametersStep = (step: WorkflowStep): boolean => {
  const input = step.settings?.input;

  if (step.type !== 'LOGIC_FUNCTION' || !isPlainRecord(input)) {
    return false;
  }

  return (
    isPlainRecord(input.logicFunctionInput) &&
    input.logicFunctionInput.parameters === LAUNCH_PARAMETERS_STEP_INPUT
  );
};

// The "Запуск с параметрами" trigger docflow puts first: a webhook by name
export const isLaunchTrigger = (trigger: WorkflowTrigger | null | undefined): boolean =>
  trigger?.type === 'WEBHOOK' && trigger.name === LAUNCH_TRIGGER_NAME;

// Processes docflow launches: by hand, with or without parameters
export const isLaunchableTrigger = (trigger: WorkflowTrigger | null | undefined): boolean =>
  trigger?.type === 'MANUAL' || isLaunchTrigger(trigger);

export const findLaunchParametersStep = (
  steps: WorkflowStep[] | null | undefined,
): WorkflowStep | undefined => (steps ?? []).find(isLaunchParametersStep);

export const parseLaunchFields = (value: unknown): FormField[] =>
  getFillableFormFields(parseFormFields(value));

// Every parameter goes into the run, an empty one as null: a later step that
// reads {{launch.contract}} gets an empty value, never the text "undefined".
export const buildLaunchParameters = ({
  fields,
  values,
}: {
  fields: FormField[];
  values: FormValues;
}): FormValues =>
  Object.fromEntries(
    fields.map((field) => {
      const value = field.name in values ? values[field.name] : field.value;

      return [field.name, value === undefined || value === '' ? null : value];
    }),
  );

// The trigger output of the run: each parameter by its field name for
// {{trigger.field}}, and all of them under one key for the "Launch with
// parameters" step that processes published before 0.0.7 still have.
export const buildLaunchPayload = (parameters: FormValues): Record<string, unknown> => ({
  ...parameters,
  [DOCFLOW_LAUNCH_PARAMETERS_KEY]: parameters,
});

export const readLaunchParameters = (value: unknown): FormValues =>
  isPlainRecord(value) ? value : {};
