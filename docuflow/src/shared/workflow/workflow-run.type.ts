import { type FormField } from 'src/shared/form/form-field.type';

// The part of a workflow run's state docflow reads. The engine keeps a copy
// of the version in the run, so a run is read as it was when it started.
export type WorkflowStepInfo = {
  status?: string;
  threadId?: string;
  result?: unknown;
  error?: unknown;
};

export type WorkflowStep = {
  id: string;
  name: string;
  type: string;
  settings?: { input?: unknown; outputSchema?: unknown } & Record<string, unknown>;
  nextStepIds?: string[] | null;
  position?: { x: number; y: number } | null;
};

export type WorkflowTrigger = {
  type: string;
  name?: string | null;
  nextStepIds?: string[] | null;
  settings?: Record<string, unknown> | null;
  position?: { x: number; y: number } | null;
};

export type WorkflowRunState = {
  flow?: { trigger?: WorkflowTrigger | null; steps?: WorkflowStep[] | null };
  stepInfos?: Record<string, WorkflowStepInfo | undefined>;
};

export type WorkflowFormStep = WorkflowStep & {
  type: 'FORM';
  settings: { input: FormField[] };
};
