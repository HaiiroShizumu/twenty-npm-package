// A field of a workflow FORM step and of a task form: one format for both, so
// a step's fields become the task's fields as they are.
export type FormFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'RECORD';

export type FormField = {
  id: string;
  name: string;
  label: string;
  type: FormFieldType | string;
  placeholder?: string;
  value?: unknown;
  settings?: Record<string, unknown> | null;
};

export type FormFieldRole = 'ASSIGNEE' | 'DUE_AT';

export type FormValues = Record<string, unknown>;
