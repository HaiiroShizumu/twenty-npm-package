import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import {
  callCoreGraphql,
  CREATE_DRAFT_FROM_WORKFLOW_VERSION_MUTATION,
  CREATE_WORKFLOW_VERSION_STEP_MUTATION,
  DELETE_WORKFLOW_VERSION_STEP_MUTATION,
  UPDATE_WORKFLOW_VERSION_STEP_MUTATION,
  UPDATE_WORKFLOW_VERSION_TRIGGER_MUTATION,
} from 'src/shared/api/core-graphql.util';
import {
  LAUNCH_PARAMETERS_STEP_INPUT,
  LAUNCH_PARAMETERS_STEP_NAME,
  TRIGGER_STEP_ID,
} from 'src/shared/docflow.constants';
import { type FormField } from 'src/shared/form/form-field.type';
import { buildFieldsOutputSchema } from 'src/shared/form/form-field-builder.util';
import { findLaunchParametersStep } from 'src/shared/workflow/launch-step.util';
import { listWorkflowVersions, type WorkflowVersionRecord } from 'src/server/records';
import { LAUNCH_PARAMETERS_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

export type LaunchStepResult =
  | { status: 'SAVED'; workflowVersionId: string; stepId: string | null }
  | { status: 'NOT_MANUAL' };

const MANUAL_TRIGGER = {
  name: 'Запуск вручную',
  type: 'MANUAL',
  position: { x: 0, y: 0 },
  settings: {
    outputSchema: {},
    availability: { type: 'GLOBAL' },
    icon: 'IconPlayerPlay',
    isPinned: false,
  },
  nextStepIds: [],
};

// The step of the workflow editor is created with the function's id in this
// workspace; the app knows the function by its universal identifier.
const findLaunchStepLogicFunctionId = async (): Promise<string> => {
  const { findManyLogicFunctions } = await new MetadataApiClient().query({
    findManyLogicFunctions: { id: true, universalIdentifier: true },
  });
  const logicFunction = findManyLogicFunctions.find(
    ({ universalIdentifier }) =>
      universalIdentifier === LAUNCH_PARAMETERS_STEP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  );

  if (logicFunction === undefined) {
    throw new Error('The "Launch with parameters" function is not installed');
  }

  return logicFunction.id;
};

// Only a draft can change: an existing one, or a new one copied from the
// latest version, as the editor does when a published process is edited.
const findOrCreateDraft = async (workflowId: string): Promise<WorkflowVersionRecord | undefined> => {
  const versions = await listWorkflowVersions('person', workflowId);
  const draft = versions.find(({ status }) => status === 'DRAFT');

  if (draft !== undefined || versions.length === 0) {
    return draft;
  }

  await callCoreGraphql({
    query: CREATE_DRAFT_FROM_WORKFLOW_VERSION_MUTATION,
    variables: { input: { workflowId, workflowVersionIdToCopy: versions[0].id } },
  });

  return (await listWorkflowVersions('person', workflowId)).find(({ status }) => status === 'DRAFT');
};

// Rows of the workflow canvas are this far apart
const STEP_ROW_HEIGHT = 150;

type Position = { x: number; y: number };

const readPosition = (value: unknown): Position | undefined => {
  const { x, y } = (value ?? {}) as Partial<Position>;

  return typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
};

// The step goes right under the trigger: every step already at that row or
// lower moves one row down, so the canvas keeps its order instead of the new
// step landing under the last one.
const makeRoomUnderTrigger = async (draft: WorkflowVersionRecord): Promise<Position> => {
  const triggerPosition = readPosition(draft.trigger?.position) ?? { x: 0, y: 0 };
  const position = { x: triggerPosition.x, y: triggerPosition.y + STEP_ROW_HEIGHT };

  for (const step of draft.steps ?? []) {
    const stepPosition = readPosition(step.position);

    if (stepPosition !== undefined && stepPosition.y >= position.y) {
      await callCoreGraphql({
        query: UPDATE_WORKFLOW_VERSION_STEP_MUTATION,
        variables: {
          input: {
            workflowVersionId: draft.id,
            step: { ...step, position: { ...stepPosition, y: stepPosition.y + STEP_ROW_HEIGHT } },
          },
        },
      });
    }
  }

  return position;
};

// Puts the "Launch with parameters" step right after the manual trigger of the
// draft and describes its output with the parameter fields, so the editor
// offers them as variables of later steps. No fields, no step.
export const syncLaunchStep = async ({
  workflowId,
  fields,
}: {
  workflowId: string;
  fields: FormField[];
}): Promise<LaunchStepResult | undefined> => {
  let draft = await findOrCreateDraft(workflowId);

  if (draft === undefined) {
    return undefined;
  }

  if (draft.trigger === null || draft.trigger === undefined) {
    await callCoreGraphql({
      query: UPDATE_WORKFLOW_VERSION_TRIGGER_MUTATION,
      variables: { input: { workflowVersionId: draft.id, trigger: MANUAL_TRIGGER } },
    });
    draft = { ...draft, trigger: MANUAL_TRIGGER };
  }

  if (draft.trigger?.type !== 'MANUAL') {
    return { status: 'NOT_MANUAL' };
  }

  const existingStep = findLaunchParametersStep(draft.steps);

  if (fields.length === 0) {
    if (existingStep !== undefined) {
      await callCoreGraphql({
        query: DELETE_WORKFLOW_VERSION_STEP_MUTATION,
        variables: { input: { workflowVersionId: draft.id, stepId: existingStep.id } },
      });
    }

    return { status: 'SAVED', workflowVersionId: draft.id, stepId: null };
  }

  let step = existingStep;

  if (step === undefined) {
    const stepId = crypto.randomUUID();
    const position = await makeRoomUnderTrigger(draft);

    await callCoreGraphql({
      query: CREATE_WORKFLOW_VERSION_STEP_MUTATION,
      variables: {
        input: {
          workflowVersionId: draft.id,
          id: stepId,
          stepType: 'LOGIC_FUNCTION',
          parentStepId: TRIGGER_STEP_ID,
          nextStepId: draft.trigger.nextStepIds?.[0],
          position,
          defaultSettings: {
            input: {
              logicFunctionId: await findLaunchStepLogicFunctionId(),
              logicFunctionInput: { parameters: LAUNCH_PARAMETERS_STEP_INPUT },
            },
          },
        },
      },
    });

    const versions = await listWorkflowVersions('person', workflowId);

    step = versions
      .find(({ id }) => id === draft?.id)
      ?.steps?.find(({ id }) => id === stepId);

    if (step === undefined) {
      throw new Error(`The launch step ${stepId} was not created`);
    }
  }

  await callCoreGraphql({
    query: UPDATE_WORKFLOW_VERSION_STEP_MUTATION,
    variables: {
      input: {
        workflowVersionId: draft.id,
        step: {
          ...step,
          name: LAUNCH_PARAMETERS_STEP_NAME,
          // A step put in by an earlier version has no place on the canvas
          position:
            readPosition(step.position) ??
            (await makeRoomUnderTrigger({
              ...draft,
              steps: (draft.steps ?? []).filter(({ id }) => id !== step?.id),
            })),
          settings: { ...step.settings, outputSchema: buildFieldsOutputSchema(fields) },
        },
      },
    },
  });

  return { status: 'SAVED', workflowVersionId: draft.id, stepId: step.id };
};
