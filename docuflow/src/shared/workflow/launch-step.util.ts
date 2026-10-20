import {
  DOCFLOW_LAUNCH_PARAMETERS_KEY,
  LAUNCH_PARAMETERS_STEP_INPUT,
} from 'src/shared/docflow.constants';
import { type FormField, type FormValues } from 'src/shared/form/form-field.type';
import { getFillableFormFields, parseFormFields } from 'src/shared/form/form-fields.util';
import { type WorkflowStep } from 'src/shared/workflow/workflow-run.type';

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

export const buildLaunchPayload = (parameters: FormValues): Record<string, unknown> => ({
  [DOCFLOW_LAUNCH_PARAMETERS_KEY]: parameters,
});

export const readLaunchParameters = (value: unknown): FormValues =>
  isPlainRecord(value) ? value : {};
