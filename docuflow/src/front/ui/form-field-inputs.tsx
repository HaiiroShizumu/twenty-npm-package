import { useTheme } from 'twenty-ui/theme';

import { listRecords } from 'src/front/api';
import { useAsync } from 'src/front/hooks/use-async';
import { Labeled, SelectField, TextField } from 'src/front/ui/components';
import { getFieldOptions, getObjectSummaries } from 'src/shared/api/object-summaries';
import { formatRecordLabel } from 'src/shared/documents/attachment-target.util';
import { type FormField, type FormValues } from 'src/shared/form/form-field.type';
import { getFillableFormFields, isFormFieldRequired } from 'src/shared/form/form-fields.util';

const RECORD_OPTIONS_LIMIT = 100;
const NO_VALUE = '';

const readRecordId = (value: unknown): string =>
  typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string'
    ? (value as { id: string }).id
    : NO_VALUE;

const RecordInput = ({
  field,
  value,
  onChange,
  disabled,
}: FieldInputProps) => {
  const objectName = field.settings?.objectName;
  const { data: options, error } = useAsync(async () => {
    if (typeof objectName !== 'string') {
      return [];
    }

    const summary = (await getObjectSummaries()).get(objectName);

    if (summary === undefined) {
      return [];
    }

    const { records } = await listRecords<Record<string, unknown>>(summary.namePlural, {
      limit: RECORD_OPTIONS_LIMIT,
    });

    return records.map((record) => ({
      value: String(record.id),
      label:
        formatRecordLabel(
          summary.labelFieldName !== undefined ? record[summary.labelFieldName] : undefined,
        ) ?? String(record.id),
    }));
  }, [objectName]);

  return (
    <SelectField
      label={field.label}
      value={readRecordId(value)}
      disabled={disabled || error !== undefined}
      options={[{ value: NO_VALUE, label: 'Не выбрано' }, ...(options ?? [])]}
      onChange={(recordId) => onChange(recordId === NO_VALUE ? null : { id: recordId })}
    />
  );
};

const SelectInput = ({ field, value, onChange, disabled }: FieldInputProps) => {
  const selectedFieldId = field.settings?.selectedFieldId;
  const { data: options } = useAsync(
    async () => (typeof selectedFieldId === 'string' ? getFieldOptions(selectedFieldId) : []),
    [selectedFieldId],
  );
  const isMultiple = field.type === 'MULTI_SELECT';
  const theme = useTheme();

  if (isMultiple) {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

    return (
      <Labeled label={field.label}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
          {(options ?? []).map((option) => (
            <label key={option.value} style={{ alignItems: 'center', display: 'flex', gap: theme.spacing[1], color: theme.font.color.primary, fontWeight: 'normal' }}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={selected.includes(option.value)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </Labeled>
    );
  }

  return (
    <SelectField
      label={field.label}
      value={typeof value === 'string' ? value : NO_VALUE}
      disabled={disabled}
      options={[{ value: NO_VALUE, label: 'Не выбрано' }, ...(options ?? [])]}
      onChange={(selected) => onChange(selected === NO_VALUE ? null : selected)}
    />
  );
};

type FieldInputProps = {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
};

const FieldInput = (props: FieldInputProps) => {
  const { field, value, onChange, disabled } = props;

  switch (field.type) {
    case 'RECORD':
      return <RecordInput {...props} />;
    case 'SELECT':
    case 'MULTI_SELECT':
      return <SelectInput {...props} />;
    case 'NUMBER':
      return (
        <TextField
          label={field.label}
          type="number"
          disabled={disabled}
          value={typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(text) => onChange(text.trim() === '' ? null : Number(text))}
        />
      );
    case 'DATE':
      return (
        <TextField
          label={field.label}
          type="date"
          disabled={disabled}
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
          onChange={(text) => onChange(text === '' ? null : text)}
        />
      );
    default:
      return (
        <TextField
          label={field.label}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(text) => onChange(text)}
        />
      );
  }
};

// The fields a person fills, required ones marked; service fields (assignee,
// deadline) are set by the process and never shown.
export const FormFieldInputs = ({
  fields,
  values,
  onChange,
  disabled = false,
}: {
  fields: FormField[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  disabled?: boolean;
}) => {
  const theme = useTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
      {getFillableFormFields(fields).map((field) => (
        <FieldInput
          key={field.id}
          field={{ ...field, label: isFormFieldRequired(field) ? `${field.label} *` : field.label }}
          value={field.name in values ? values[field.name] : field.value}
          disabled={disabled}
          onChange={(value) => onChange({ ...values, [field.name]: value })}
        />
      ))}
    </div>
  );
};
