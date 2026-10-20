import { useState } from 'react';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { CheckboxField, Message, SelectField, TextField, VariableChip } from 'src/front/ui/components';
import { FormFieldInputs } from 'src/front/ui/form-field-inputs';
import { type FormField } from 'src/shared/form/form-field.type';
import {
  applyBuilderFieldKind,
  BUILDER_FIELD_KINDS,
  type BuilderFieldKind,
  buildNewBuilderField,
  buildUniqueFieldName,
  getBuilderFieldKind,
  setFieldRequired,
} from 'src/shared/form/form-field-builder.util';
import { isFormFieldRequired } from 'src/shared/form/form-fields.util';

// Fields are built here instead of written as JSON. A field keeps its name
// once saved: later steps of a process read it as {{step.name}}, so renaming
// the label must not break them. A new field takes its name from the label.
export const FormFieldsBuilder = ({
  fields,
  onChange,
  variablePrefix,
  disabled = false,
}: {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  variablePrefix?: string;
  disabled?: boolean;
}) => {
  const theme = useTheme();
  const [savedFieldIds] = useState(() => new Set(fields.map(({ id }) => id)));
  const [isPreviewShown, setIsPreviewShown] = useState(false);

  const updateField = (fieldId: string, update: (field: FormField) => FormField) =>
    onChange(fields.map((field) => (field.id === fieldId ? update(field) : field)));

  const renameField = (field: FormField, label: string): FormField =>
    savedFieldIds.has(field.id) || label.trim().length === 0
      ? { ...field, label }
      : {
          ...field,
          label,
          name: buildUniqueFieldName(
            label,
            fields.filter(({ id }) => id !== field.id).map(({ name }) => name),
          ),
        };

  const moveField = (index: number, offset: -1 | 1) => {
    const target = index + offset;

    if (target < 0 || target >= fields.length) {
      return;
    }

    const reordered = [...fields];

    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onChange(reordered);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
      {fields.length === 0 && <Message tone="hint">Полей нет.</Message>}
      {fields.map((field, index) => {
        const kind = getBuilderFieldKind(field);

        return (
          <div
            key={field.id}
            style={{
              background: theme.background.transparent.lighter,
              borderRadius: theme.border.radius.md,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
              padding: theme.spacing[2],
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              <div style={{ flex: '2 1 180px' }}>
                <TextField
                  label="Название"
                  placeholder="Например, Сумма договора"
                  value={field.label}
                  disabled={disabled}
                  onChange={(label) => updateField(field.id, (current) => renameField(current, label))}
                />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                {kind !== undefined ? (
                  <SelectField<BuilderFieldKind>
                    label="Тип"
                    value={kind}
                    disabled={disabled}
                    options={BUILDER_FIELD_KINDS.map(({ value, label }) => ({ value, label }))}
                    onChange={(nextKind) =>
                      updateField(field.id, (current) => applyBuilderFieldKind(current, nextKind))
                    }
                  />
                ) : (
                  <TextField label="Тип" value={field.type} disabled onChange={() => undefined} />
                )}
              </div>
            </div>
            <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              <CheckboxField
                label="Обязательное"
                checked={isFormFieldRequired(field)}
                disabled={disabled}
                onChange={(isRequired) =>
                  updateField(field.id, (current) => setFieldRequired(current, isRequired))
                }
              />
              {variablePrefix !== undefined && (
                <VariableChip>{`{{${variablePrefix}.${field.name}}}`}</VariableChip>
              )}
              <div style={{ display: 'flex', gap: theme.spacing[1], marginLeft: 'auto' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Выше"
                  aria-label={`Поднять поле ${field.label}`}
                  disabled={disabled || index === 0}
                  onClick={() => moveField(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Ниже"
                  aria-label={`Опустить поле ${field.label}`}
                  disabled={disabled || index === fields.length - 1}
                  onClick={() => moveField(index, 1)}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onChange(fields.filter(({ id }) => id !== field.id))}
                >
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...fields, buildNewBuilderField(fields, () => crypto.randomUUID())])}
        >
          Добавить поле
        </Button>
        {fields.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setIsPreviewShown((current) => !current)}>
            {isPreviewShown ? 'Скрыть предпросмотр' : 'Как увидит исполнитель'}
          </Button>
        )}
      </div>
      {isPreviewShown && fields.length > 0 && (
        <div
          style={{
            borderRadius: theme.border.radius.md,
            boxShadow: `inset 0 0 0 1px ${theme.border.color.light}`,
            padding: theme.spacing[3],
          }}
        >
          <FormFieldInputs fields={fields} values={{}} disabled onChange={() => undefined} />
        </div>
      )}
    </div>
  );
};
