import {
  FORM_FIELD_DUE_IN_DAYS_SETTING,
  FORM_FIELD_REQUIRED_SETTING,
  FORM_FIELD_ROLE_SETTING,
} from 'src/shared/docflow.constants';
import { type FormField, type FormFieldRole } from 'src/shared/form/form-field.type';
import { getFormFieldRole } from 'src/shared/form/form-fields.util';

export type StepSettings = {
  assignee: string | null;
  dueInDays: number | null;
  requiredFieldIds: string[];
};

const ASSIGNEE_FIELD = {
  name: 'smbAssignee',
  label: 'Исполнитель',
  type: 'RECORD',
} as const;
const DUE_AT_FIELD = { name: 'smbDueAt', label: 'Срок', type: 'DATE' } as const;

export const readStepSettings = (fields: FormField[]): StepSettings => {
  const assignee = fields.find((field) => getFormFieldRole(field) === 'ASSIGNEE')?.value;
  const dueInDays = fields.find((field) => getFormFieldRole(field) === 'DUE_AT')?.settings?.[
    FORM_FIELD_DUE_IN_DAYS_SETTING
  ];

  return {
    assignee: typeof assignee === 'string' && assignee.length > 0 ? assignee : null,
    dueInDays: typeof dueInDays === 'number' && dueInDays > 0 ? dueInDays : null,
    requiredFieldIds: fields
      .filter(
        (field) =>
          getFormFieldRole(field) === undefined &&
          field.settings?.[FORM_FIELD_REQUIRED_SETTING] === true,
      )
      .map(({ id }) => id),
  };
};

const withRole = (
  role: FormFieldRole,
  existing: FormField | undefined,
  template: { name: string; label: string; type: string },
  patch: Pick<FormField, 'value' | 'settings'>,
  createId: () => string,
): FormField => ({
  ...template,
  ...existing,
  id: existing?.id ?? createId(),
  value: patch.value,
  settings: { ...existing?.settings, ...patch.settings, [FORM_FIELD_ROLE_SETTING]: role },
});

// The role fields stay in the step's field list, where the server reads them;
// an empty assignee or deadline removes its field.
export const applyStepSettings = ({
  fields,
  settings,
  createId,
}: {
  fields: FormField[];
  settings: StepSettings;
  createId: () => string;
}): FormField[] => {
  const ordinaryFields = fields
    .filter((field) => getFormFieldRole(field) === undefined)
    .map((field) => {
      const { [FORM_FIELD_REQUIRED_SETTING]: _removed, ...rest } = field.settings ?? {};
      const isRequired = settings.requiredFieldIds.includes(field.id);

      return {
        ...field,
        settings: isRequired ? { ...rest, [FORM_FIELD_REQUIRED_SETTING]: true } : rest,
      };
    });
  const roleFields: FormField[] = [];

  if (settings.assignee !== null) {
    roleFields.push(
      withRole(
        'ASSIGNEE',
        fields.find((field) => getFormFieldRole(field) === 'ASSIGNEE'),
        ASSIGNEE_FIELD,
        { value: settings.assignee, settings: {} },
        createId,
      ),
    );
  }

  if (settings.dueInDays !== null) {
    roleFields.push(
      withRole(
        'DUE_AT',
        fields.find((field) => getFormFieldRole(field) === 'DUE_AT'),
        DUE_AT_FIELD,
        { value: undefined, settings: { [FORM_FIELD_DUE_IN_DAYS_SETTING]: settings.dueInDays } },
        createId,
      ),
    );
  }

  return [...roleFields, ...ordinaryFields];
};
