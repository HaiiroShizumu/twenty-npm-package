import { FORM_FIELD_REQUIRED_SETTING } from 'src/shared/docflow.constants';
import { type FormField } from 'src/shared/form/form-field.type';
import { getFillableFormFields } from 'src/shared/form/form-fields.util';

// What the field builder offers: the types the standard form step and the
// fork render too, so one field list works in the app, in the fork and in
// the workflow editor.
export const BUILDER_FIELD_KINDS = [
  { value: 'TEXT', label: 'Текст', type: 'TEXT' },
  { value: 'NUMBER', label: 'Число', type: 'NUMBER' },
  { value: 'DATE', label: 'Дата', type: 'DATE' },
  { value: 'MEMBER', label: 'Сотрудник', type: 'RECORD', objectName: 'workspaceMember' },
  { value: 'COMPANY', label: 'Компания', type: 'RECORD', objectName: 'company' },
  { value: 'PERSON', label: 'Контакт', type: 'RECORD', objectName: 'person' },
  { value: 'OPPORTUNITY', label: 'Сделка', type: 'RECORD', objectName: 'opportunity' },
] as const;

export type BuilderFieldKind = (typeof BUILDER_FIELD_KINDS)[number]['value'];

const omitSetting = (settings: FormField['settings'], key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(settings ?? {}).filter(([settingKey]) => settingKey !== key));

export const getBuilderFieldKind = (field: FormField): BuilderFieldKind | undefined =>
  BUILDER_FIELD_KINDS.find(
    (kind) =>
      kind.type === field.type &&
      (!('objectName' in kind) || kind.objectName === field.settings?.objectName),
  )?.value;

export const applyBuilderFieldKind = (field: FormField, kindValue: BuilderFieldKind): FormField => {
  const kind = BUILDER_FIELD_KINDS.find((candidate) => candidate.value === kindValue);

  if (kind === undefined) {
    return field;
  }

  const settings = omitSetting(field.settings, 'objectName');

  return {
    ...field,
    type: kind.type,
    value: undefined,
    settings: 'objectName' in kind ? { ...settings, objectName: kind.objectName } : settings,
  };
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

// The name is what later steps write in a variable, {{step.summaDogovora}}:
// latin letters and digits, readable from the label.
export const buildFieldNameFromLabel = (label: string): string => {
  const words = [...label.toLowerCase()]
    .map((character) => CYRILLIC_TO_LATIN[character] ?? character)
    .join('')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
  const name = words
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');

  return /^[a-z]/.test(name) ? name : `field${name}`;
};

export const buildUniqueFieldName = (label: string, takenNames: string[]): string => {
  const baseName = buildFieldNameFromLabel(label);
  let name = baseName;
  let suffix = 2;

  while (takenNames.includes(name)) {
    name = `${baseName}${suffix}`;
    suffix++;
  }

  return name;
};

export const buildNewBuilderField = (fields: FormField[], createId: () => string): FormField => ({
  id: createId(),
  name: buildUniqueFieldName(`field ${fields.length + 1}`, fields.map(({ name }) => name)),
  label: '',
  type: 'TEXT',
  settings: {},
});

export const setFieldRequired = (field: FormField, isRequired: boolean): FormField => {
  const settings = omitSetting(field.settings, FORM_FIELD_REQUIRED_SETTING);

  return { ...field, settings: isRequired ? { ...settings, [FORM_FIELD_REQUIRED_SETTING]: true } : settings };
};

const OUTPUT_LEAF_TYPES: Record<string, string> = {
  NUMBER: 'number',
  DATE: 'string',
  TEXT: 'string',
};

// The output schema of a step whose output is these fields, in the format the
// workflow editor reads for its variable picker. A record comes out as { id }.
export const buildFieldsOutputSchema = (fields: FormField[]): Record<string, unknown> =>
  Object.fromEntries(
    getFillableFormFields(fields).map((field) => [
      field.name,
      field.type === 'RECORD'
        ? {
            isLeaf: false,
            type: 'object',
            label: field.label,
            value: { id: { isLeaf: true, type: 'string', label: 'Id', value: null } },
          }
        : {
            isLeaf: true,
            type: OUTPUT_LEAF_TYPES[field.type] ?? 'unknown',
            label: field.label,
            value: null,
          },
    ]),
  );
