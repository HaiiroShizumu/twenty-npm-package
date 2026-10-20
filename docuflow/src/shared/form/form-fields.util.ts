import {
  FORM_FIELD_REQUIRED_SETTING,
  FORM_FIELD_ROLE_SETTING,
} from 'src/shared/docflow.constants';
import {
  type FormField,
  type FormFieldRole,
  type FormValues,
} from 'src/shared/form/form-field.type';

export const getFormFieldRole = (
  field: Pick<FormField, 'settings'>,
): FormFieldRole | undefined => {
  const role = field.settings?.[FORM_FIELD_ROLE_SETTING];

  return role === 'ASSIGNEE' || role === 'DUE_AT' ? role : undefined;
};

export const isFormFieldRequired = (
  field: Pick<FormField, 'settings'>,
): boolean => field.settings?.[FORM_FIELD_REQUIRED_SETTING] === true;

// The fields a person fills: the assignee and the deadline are set by the
// process.
export const getFillableFormFields = <TField extends Pick<FormField, 'settings'>>(
  fields: TField[],
): TField[] => fields.filter((field) => getFormFieldRole(field) === undefined);

// A record picker answers with { id }, a multi-select with an array.
export const isFormValueEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id;

    return typeof id !== 'string' || id.length === 0;
  }

  return false;
};

export const findMissingRequiredFields = <TField extends FormField>({
  fields,
  values,
}: {
  fields: TField[];
  values: FormValues;
}): TField[] =>
  getFillableFormFields(fields).filter(
    (field) => isFormFieldRequired(field) && isFormValueEmpty(values[field.name]),
  );

// A value for every field a person fills, typed or preset in the form. The
// server checks required fields against exactly this object, so the page and
// the server agree.
export const buildFormValues = ({
  fields,
  values,
}: {
  fields: FormField[];
  values: FormValues;
}): FormValues =>
  Object.fromEntries(
    getFillableFormFields(fields).flatMap((field) => {
      const value = field.name in values ? values[field.name] : field.value;

      return value === undefined || value === null ? [] : [[field.name, value]];
    }),
  );

// The answer of a form step carries every field, service ones included:
// later steps read the assignee and the deadline from it.
export const buildFormStepResponse = ({
  fields,
  values,
}: {
  fields: Pick<FormField, 'name' | 'value'>[];
  values: FormValues;
}): FormValues =>
  Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.name in values ? values[field.name] : (field.value ?? null),
    ]),
  );

const FORM_FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;

// A task form is edited by people, so it is checked before it is saved:
// unique names the engine can address, known types.
export const getFormFieldsError = (fields: FormField[]): string | undefined => {
  const names = new Set<string>();

  for (const field of fields) {
    if (!FORM_FIELD_NAME_PATTERN.test(field.name)) {
      return `Имя поля «${field.label}» должно начинаться с латинской буквы и состоять из букв и цифр`;
    }

    if (names.has(field.name)) {
      return `Поле «${field.name}» повторяется`;
    }

    if (field.label.trim().length === 0) {
      return 'У каждого поля должно быть название';
    }

    names.add(field.name);
  }

  return undefined;
};

export const parseFormFields = (value: unknown): FormField[] =>
  Array.isArray(value)
    ? value.filter(
        (field): field is FormField =>
          typeof field === 'object' &&
          field !== null &&
          typeof (field as FormField).name === 'string' &&
          typeof (field as FormField).label === 'string' &&
          typeof (field as FormField).type === 'string',
      )
    : [];

export const parseFormValues = (value: unknown): FormValues =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as FormValues)
    : {};
