import { type CSSProperties, type ReactNode, useId, useState } from 'react';
import { IconArrowDown, IconArrowUp } from 'twenty-ui/icon';

import { ActionsMenu, Button, type MenuAction } from 'src/front/ui/kit';
import { useTheme } from 'twenty-ui/theme';

// Every style is inline: the host drops <style> elements of front components,
// so class names would style nothing.
export const DocflowRoot = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();

  return (
    <div
      style={{
        color: theme.font.color.primary,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
        fontSize: theme.font.size.md,
        height: '100%',
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
};

export const Toolbar = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();

  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing[2],
        padding: `${theme.spacing[4]} ${theme.spacing[5]} ${theme.spacing[3]}`,
      }}
    >
      {children}
    </div>
  );
};

type InputVariant = 'outlined' | 'bare';

const useInputStyle = (variant: InputVariant): CSSProperties => {
  const theme = useTheme();

  return {
    background: theme.background.transparent.lighter,
    border: variant === 'bare' ? 'none' : `1px solid ${theme.border.color.medium}`,
    borderRadius: theme.border.radius.sm,
    boxSizing: 'border-box',
    color: theme.font.color.primary,
    fontFamily: 'inherit',
    fontSize: theme.font.size.md,
    minHeight: theme.spacing[8],
    outline: 'none',
    padding: `0 ${theme.spacing[2]}`,
    width: '100%',
  };
};

export const Labeled = ({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) => {
  const theme = useTheme();

  return (
    <label
      htmlFor={htmlFor}
      style={{
        color: theme.font.color.tertiary,
        display: 'flex',
        flexDirection: 'column',
        fontSize: theme.font.size.xs,
        fontWeight: theme.font.weight.semiBold,
        gap: theme.spacing[1],
      }}
    >
      {label}
      {children}
    </label>
  );
};

export const TextField = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  variant = 'outlined',
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date' | 'search';
  placeholder?: string;
  disabled?: boolean;
  variant?: InputVariant;
}) => {
  const inputId = useId();
  const style = useInputStyle(variant);
  const input = (
    <input
      id={inputId}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={label ?? placeholder}
      onChange={(event) => onChange(event.target.value)}
      style={style}
    />
  );

  return label === undefined ? input : <Labeled label={label} htmlFor={inputId}>{input}</Labeled>;
};

export const TextAreaField = ({
  label,
  value,
  onChange,
  rows = 3,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
}) => {
  const inputId = useId();
  const style = useInputStyle('outlined');
  const theme = useTheme();

  return (
    <Labeled label={label} htmlFor={inputId}>
      <textarea
        id={inputId}
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{ ...style, padding: theme.spacing[2], resize: 'vertical' }}
      />
    </Labeled>
  );
};

// A native select: the sandbox cannot render popups into the page, so the
// browser's own list is used.
export const SelectField = <TValue extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  variant = 'outlined',
}: {
  label?: string;
  value: TValue;
  options: { value: TValue; label: string }[];
  onChange: (value: TValue) => void;
  disabled?: boolean;
  variant?: InputVariant;
}) => {
  const inputId = useId();
  const style = useInputStyle(variant);
  const select = (
    <select
      id={inputId}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => {
        const option = options.find((candidate) => candidate.value === event.target.value);

        if (option !== undefined) {
          onChange(option.value);
        }
      }}
      style={{ ...style, width: label === undefined ? 'auto' : '100%' }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return label === undefined ? select : <Labeled label={label} htmlFor={inputId}>{select}</Labeled>;
};

export const CheckboxField = ({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => {
  const theme = useTheme();

  return (
    <label
      style={{
        alignItems: 'center',
        color: theme.font.color.secondary,
        display: 'flex',
        fontSize: theme.font.size.sm,
        gap: theme.spacing[2],
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
};

export const Message = ({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'danger' | 'hint' }) => {
  const theme = useTheme();

  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      style={{
        color: tone === 'danger' ? theme.font.color.danger : theme.font.color.tertiary,
        fontSize: theme.font.size.sm,
        padding: tone === 'muted' ? theme.spacing[6] : 0,
        textAlign: tone === 'muted' ? 'center' : 'left',
      }}
    >
      {children}
    </div>
  );
};

export const SectionTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => {
  const theme = useTheme();

  return (
    <div style={{ alignItems: 'center', display: 'flex', gap: theme.spacing[2], justifyContent: 'space-between' }}>
      <span style={{ color: theme.font.color.tertiary, fontSize: theme.font.size.sm, fontWeight: theme.font.weight.medium }}>
        {children}
      </span>
      {action}
    </div>
  );
};

// A variable a later step of a process writes to read a value.
export const VariableChip = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();

  return (
    <code
      style={{
        background: theme.background.transparent.light,
        borderRadius: theme.border.radius.sm,
        color: theme.font.color.secondary,
        fontSize: theme.font.size.xs,
        overflowWrap: 'anywhere',
        padding: `1px ${theme.spacing[1]}`,
      }}
    >
      {children}
    </code>
  );
};

export type TableColumn = {
  key: string;
  label: string;
  width?: string;
  // The field the server sorts by when the header is clicked
  sortKey?: string;
};

export type TableSort = { key: string; direction: 'asc' | 'desc' };

// Ascending first, then descending, then back
export const nextTableSort = (current: TableSort | undefined, key: string): TableSort =>
  current?.key === key && current.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' };

export const toRestOrderBy = (sort: TableSort) =>
  `${sort.key}[${sort.direction === 'asc' ? 'AscNullsLast' : 'DescNullsLast'}]`;

export const DataTable = ({
  columns,
  rows,
  selectedRowId,
  onRowClick,
  sort,
  onSortChange,
  rowActions,
}: {
  columns: TableColumn[];
  rows: { id: string; cells: Record<string, ReactNode> }[];
  selectedRowId?: string;
  onRowClick: (rowId: string) => void;
  sort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  // The "⋯" of a row
  rowActions?: (rowId: string) => MenuAction[];
}) => {
  const theme = useTheme();
  const [hoveredRowId, setHoveredRowId] = useState<string | undefined>();
  const cellStyle: CSSProperties = {
    overflow: 'hidden',
    padding: `${theme.spacing[3]} ${theme.spacing[3]}`,
    textAlign: 'left',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  const rowRadius = theme.border.radius.sm;
  const hasActions = rowActions !== undefined;

  const rowBackground = (isSelected: boolean, isHovered: boolean) =>
    isSelected ? theme.background.transparent.light : isHovered ? theme.background.transparent.lighter : 'transparent';

  // Quiet by design: faint dividers, the first column in the main color and
  // the rest muted, a soft highlight instead of lines around rows.
  return (
    <div style={{ padding: `0 ${theme.spacing[2]} ${theme.spacing[4]}` }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSortable = column.sortKey !== undefined && onSortChange !== undefined;
              const isSorted = isSortable && sort?.key === column.sortKey;
              const SortIcon = sort?.direction === 'desc' ? IconArrowDown : IconArrowUp;

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  onClick={() => {
                    if (isSortable && column.sortKey !== undefined) {
                      onSortChange?.(nextTableSort(sort, column.sortKey));
                    }
                  }}
                  style={{
                    ...cellStyle,
                    color: isSorted ? theme.font.color.secondary : theme.font.color.light,
                    cursor: isSortable ? 'pointer' : 'default',
                    fontSize: theme.font.size.sm,
                    fontWeight: theme.font.weight.regular,
                    paddingBottom: theme.spacing[2],
                    paddingTop: theme.spacing[2],
                    userSelect: 'none',
                    width: column.width,
                  }}
                >
                  <span style={{ alignItems: 'center', display: 'inline-flex', gap: theme.spacing[1] }}>
                    {column.label}
                    {isSorted && <SortIcon size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />}
                  </span>
                </th>
              );
            })}
            {hasActions && <th scope="col" aria-label="Действия" style={{ ...cellStyle, width: '44px' }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = row.id === selectedRowId;
            const isHovered = row.id === hoveredRowId;
            const background = rowBackground(isSelected, isHovered);
            const divider = `1px solid ${isSelected || isHovered ? 'transparent' : theme.background.transparent.lighter}`;

            return (
              <tr
                key={row.id}
                tabIndex={0}
                aria-selected={isSelected}
                onMouseEnter={() => setHoveredRowId(row.id)}
                onMouseLeave={() => setHoveredRowId((current) => (current === row.id ? undefined : current))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onRowClick(row.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {columns.map((column, index) => (
                  // The click is on the data cells, not the row: the "⋯" sits
                  // in the same row, and the sandbox does not stop propagation
                  // reliably.
                  <td
                    key={column.key}
                    onClick={() => onRowClick(row.id)}
                    style={{
                      ...cellStyle,
                      background,
                      borderTop: divider,
                      borderBottomLeftRadius: index === 0 ? rowRadius : 0,
                      borderBottomRightRadius: index === columns.length - 1 && !hasActions ? rowRadius : 0,
                      borderTopLeftRadius: index === 0 ? rowRadius : 0,
                      borderTopRightRadius: index === columns.length - 1 && !hasActions ? rowRadius : 0,
                      color: index === 0 ? theme.font.color.primary : theme.font.color.secondary,
                    }}
                  >
                    {row.cells[column.key]}
                  </td>
                ))}
                {hasActions && (
                  <td
                    style={{
                      ...cellStyle,
                      background,
                      borderBottomRightRadius: rowRadius,
                      borderTop: divider,
                      borderTopRightRadius: rowRadius,
                      overflow: 'visible',
                      paddingBottom: 0,
                      paddingTop: 0,
                      textAlign: 'right',
                    }}
                  >
                    <ActionsMenu actions={rowActions(row.id)} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// The list and its side panel share a row while the widget is wide enough;
// on a narrow one the panel wraps under the list and takes its width.
export const SplitView = ({
  children,
  panel,
  panelTitle,
  onClosePanel,
}: {
  children: ReactNode;
  panel?: ReactNode;
  panelTitle?: string;
  onClosePanel: () => void;
}) => {
  const theme = useTheme();

  return (
    <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', minHeight: 0, overflowY: 'auto' }}>
      <div style={{ display: 'flex', flex: '999 1 480px', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
      {panel !== undefined && (
        <aside
          aria-label={panelTitle}
          style={{
            background: theme.background.primary,
            borderLeft: `1px solid ${theme.border.color.light}`,
            boxSizing: 'border-box',
            display: 'flex',
            flex: '1 1 380px',
            flexDirection: 'column',
            gap: theme.spacing[3],
            minWidth: 0,
            padding: `${theme.spacing[3]} ${theme.spacing[4]} ${theme.spacing[4]}`,
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: theme.spacing[2], justifyContent: 'space-between' }}>
            <strong style={{ fontSize: theme.font.size.lg }}>{panelTitle}</strong>
            <Button variant="ghost" size="sm" onClick={onClosePanel}>
              Закрыть
            </Button>
          </div>
          {panel}
        </aside>
      )}
    </div>
  );
};

export const Details = ({ rows }: { rows: { label: string; value: ReactNode }[] }) => {
  const theme = useTheme();

  return (
    <dl
      style={{
        columnGap: theme.spacing[3],
        display: 'grid',
        fontSize: theme.font.size.sm,
        gridTemplateColumns: 'max-content minmax(0, 1fr)',
        margin: 0,
        rowGap: theme.spacing[1],
      }}
    >
      {rows
        .filter(({ value }) => value !== null && value !== undefined && value !== '' && value !== false)
        .flatMap(({ label, value }) => [
          <dt key={`${label}-term`} style={{ color: theme.font.color.tertiary }}>{label}</dt>,
          <dd key={`${label}-value`} style={{ margin: 0, overflowWrap: 'anywhere' }}>{value}</dd>,
        ])}
    </dl>
  );
};
