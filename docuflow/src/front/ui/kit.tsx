import { type CSSProperties, type ReactNode, useState } from 'react';
import {
  type IconComponent,
  IconCheck,
  IconDotsVertical,
  IconFilter,
  IconSearch,
  IconX,
} from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

// The app's own controls. twenty-ui's primitives are built on Base UI, whose
// focus and pointer handlers read event.nativeEvent; in the sandbox of a front
// component events arrive without it and the component crashes ("Cannot use
// 'in' operator to search for 'composedPath'"). These are plain elements with
// the same look. Popups are positioned with CSS only: the sandbox cannot
// measure the page.

type ButtonVariant = 'solid' | 'outline' | 'ghost';

export const Button = ({
  children,
  onClick,
  variant = 'outline',
  size = 'sm',
  tone = 'default',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  tone?: 'default' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: IconComponent;
  title?: string;
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const isInactive = disabled || loading;
  const color =
    tone === 'danger'
      ? theme.font.color.danger
      : variant === 'solid'
        ? theme.font.color.inverted
        : theme.font.color.secondary;
  // Outline buttons are a dense fill of the surface color, not a tint: over a
  // wallpaper skin a see-through button gets lost in the picture.
  const surface = (percent: number) =>
    `color-mix(in srgb, ${theme.background.primary} ${percent}%, transparent)`;
  const background =
    variant === 'solid'
      ? theme.background.invertedPrimary
      : isHovered && !isInactive
        ? variant === 'outline'
          ? surface(94)
          : theme.background.transparent.light
        : variant === 'outline'
          ? surface(80)
          : 'transparent';

  return (
    <button
      type="button"
      title={title}
      disabled={isInactive}
      onClick={() => {
        if (!isInactive) {
          onClick?.();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        alignItems: 'center',
        background,
        border: variant === 'outline' ? `1px solid ${theme.border.color.medium}` : '1px solid transparent',
        borderRadius: theme.border.radius.sm,
        color,
        cursor: isInactive ? 'default' : 'pointer',
        display: 'inline-flex',
        fontFamily: 'inherit',
        fontSize: theme.font.size.md,
        fontWeight: theme.font.weight.medium,
        gap: theme.spacing[1],
        height: size === 'md' ? theme.spacing[8] : theme.spacing[7],
        justifyContent: 'center',
        opacity: isInactive ? 0.55 : variant === 'solid' && isHovered ? 0.88 : 1,
        padding: `0 ${theme.spacing[2]}`,
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {Icon !== undefined && <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />}
      {loading ? '…' : children}
    </button>
  );
};

export const IconButton = ({
  icon: Icon,
  label,
  onClick,
  isActive = false,
}: {
  icon: IconComponent;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        alignItems: 'center',
        background: isActive || isHovered ? theme.background.transparent.light : 'transparent',
        border: 'none',
        borderRadius: theme.border.radius.sm,
        color: isActive ? theme.font.color.primary : theme.font.color.tertiary,
        cursor: 'pointer',
        display: 'inline-flex',
        height: theme.spacing[6],
        justifyContent: 'center',
        padding: 0,
        width: theme.spacing[6],
      }}
    >
      <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
    </button>
  );
};

// A floating panel under (or above) its anchor. A transparent layer over the
// page closes it on an outside click.
export const Popover = ({
  isOpen,
  onClose,
  anchor,
  children,
  align = 'left',
  width,
}: {
  isOpen: boolean;
  onClose: () => void;
  anchor: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: string;
}) => {
  const theme = useTheme();

  return (
    <div style={{ display: 'inline-flex', position: 'relative' }}>
      {anchor}
      {isOpen && (
        <>
          <div
            aria-hidden
            onClick={onClose}
            style={{ inset: 0, position: 'fixed', zIndex: 20 }}
          />
          <div
            role="dialog"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onClose();
              }
            }}
            style={{
              [align]: 0,
              background: theme.background.primary,
              border: `1px solid ${theme.border.color.medium}`,
              borderRadius: theme.border.radius.md,
              boxShadow: theme.boxShadow.strong,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[1],
              minWidth: '200px',
              padding: theme.spacing[1],
              position: 'absolute',
              top: `calc(100% + ${theme.spacing[1]})`,
              width,
              zIndex: 21,
            } as CSSProperties}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};

const MenuRow = ({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
  isSelected = false,
  trailing,
}: {
  icon?: IconComponent;
  label: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
  isSelected?: boolean;
  trailing?: ReactNode;
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        alignItems: 'center',
        background: isHovered ? theme.background.transparent.light : 'transparent',
        border: 'none',
        borderRadius: theme.border.radius.sm,
        color: tone === 'danger' ? theme.font.color.danger : theme.font.color.secondary,
        cursor: 'pointer',
        display: 'flex',
        fontFamily: 'inherit',
        fontSize: theme.font.size.md,
        gap: theme.spacing[2],
        height: theme.spacing[8],
        padding: `0 ${theme.spacing[2]}`,
        textAlign: 'left',
        width: '100%',
      }}
    >
      {Icon !== undefined && <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {isSelected && <IconCheck size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />}
      {trailing}
    </button>
  );
};

export type MenuAction = {
  key: string;
  label: string;
  icon?: IconComponent;
  // A dangerous action asks once more in place: "Удалить?" then deletes
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  onSelect: () => void;
};

// The "⋯" of a row or a folder: actions in a small list
export const ActionsMenu = ({
  actions,
  label = 'Действия',
  align = 'right',
}: {
  actions: MenuAction[];
  label?: string;
  // The side the list grows from: right for row ends, left near a page edge
  align?: 'left' | 'right';
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingKey, setConfirmingKey] = useState<string | undefined>();

  const close = () => {
    setIsOpen(false);
    setConfirmingKey(undefined);
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={close}
      align={align}
      anchor={<IconButton icon={IconDotsVertical} label={label} isActive={isOpen} onClick={() => setIsOpen(!isOpen)} />}
    >
      {actions.map((action) => (
        <MenuRow
          key={action.key}
          icon={action.icon}
          tone={action.tone}
          label={confirmingKey === action.key ? action.confirmLabel : action.label}
          onClick={() => {
            if (action.confirmLabel !== undefined && confirmingKey !== action.key) {
              setConfirmingKey(action.key);

              return;
            }

            close();
            action.onSelect();
          }}
        />
      ))}
    </Popover>
  );
};

export type FilterGroup = {
  key: string;
  title: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

// Search with its filters inside: a click on the field opens a small panel
// with the filter groups under it; a dot on the filter icon says one is on.
export const SearchWithFilters = ({
  value,
  onChange,
  placeholder,
  filters = [],
  activeFilterCount = 0,
  onResetFilters,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  filters?: FilterGroup[];
  activeFilterCount?: number;
  onResetFilters?: () => void;
}) => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const hasFilters = filters.length > 0;

  return (
    <Popover
      isOpen={isOpen && hasFilters}
      onClose={() => setIsOpen(false)}
      width="280px"
      anchor={
        <div
          style={{
            alignItems: 'center',
            background: `color-mix(in srgb, ${theme.background.primary} 80%, transparent)`,
            border: `1px solid ${theme.border.color.light}`,
            borderRadius: theme.border.radius.sm,
            boxSizing: 'border-box',
            color: theme.font.color.tertiary,
            display: 'flex',
            gap: theme.spacing[1],
            height: theme.spacing[8],
            padding: `0 ${theme.spacing[1]} 0 ${theme.spacing[2]}`,
            width: '280px',
          }}
        >
          <IconSearch size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
          <input
            type="search"
            value={value}
            placeholder={placeholder}
            aria-label={placeholder}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Enter') {
                setIsOpen(false);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.font.color.primary,
              flex: 1,
              fontFamily: 'inherit',
              fontSize: theme.font.size.md,
              minWidth: 0,
              outline: 'none',
            }}
          />
          {value.length > 0 && <IconButton icon={IconX} label="Очистить поиск" onClick={() => onChange('')} />}
          {hasFilters && (
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <IconButton icon={IconFilter} label="Фильтры" isActive={activeFilterCount > 0} onClick={() => setIsOpen(!isOpen)} />
              {activeFilterCount > 0 && (
                <span
                  aria-hidden
                  style={{
                    background: theme.color.blue,
                    borderRadius: '50%',
                    height: '6px',
                    position: 'absolute',
                    right: '3px',
                    top: '3px',
                    width: '6px',
                  }}
                />
              )}
            </span>
          )}
        </div>
      }
    >
      {filters.map((group) => (
        <div key={group.key} style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: theme.font.color.light,
              fontSize: theme.font.size.xs,
              padding: `${theme.spacing[2]} ${theme.spacing[2]} ${theme.spacing[1]}`,
            }}
          >
            {group.title}
          </div>
          {group.options.map((option) => (
            <MenuRow
              key={option.value}
              label={option.label}
              isSelected={option.value === group.value}
              onClick={() => group.onChange(option.value)}
            />
          ))}
        </div>
      ))}
      {activeFilterCount > 0 && onResetFilters !== undefined && (
        <div style={{ borderTop: `1px solid ${theme.border.color.light}`, marginTop: theme.spacing[1], paddingTop: theme.spacing[1] }}>
          <MenuRow label="Сбросить фильтры" onClick={onResetFilters} />
        </div>
      )}
    </Popover>
  );
};

// A small window over the page, for what a menu action asks: a new name, a
// folder's look. Escape or a click outside closes it.
export const Dialog = ({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) => {
  const theme = useTheme();

  return (
    <div
      role="presentation"
      style={{
        alignItems: 'flex-start',
        display: 'flex',
        inset: 0,
        justifyContent: 'center',
        paddingTop: '12vh',
        position: 'fixed',
        zIndex: 30,
      }}
    >
      <div
        aria-hidden
        onClick={onClose}
        style={{ background: theme.background.overlaySecondary, inset: 0, position: 'absolute' }}
      />
      <div
        role="dialog"
        aria-label={title}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose();
          }
        }}
        style={{
          background: theme.background.primary,
          border: `1px solid ${theme.border.color.medium}`,
          borderRadius: theme.border.radius.md,
          boxShadow: theme.boxShadow.superHeavy,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
          maxWidth: 'calc(100vw - 32px)',
          padding: theme.spacing[4],
          position: 'relative',
          width: '360px',
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
          <strong style={{ fontSize: theme.font.size.lg }}>{title}</strong>
          <IconButton icon={IconX} label="Закрыть" onClick={onClose} />
        </div>
        {children}
        {footer !== undefined && (
          <div style={{ display: 'flex', gap: theme.spacing[1], justifyContent: 'flex-end' }}>{footer}</div>
        )}
      </div>
    </div>
  );
};

// A text asked in a dialog, e.g. a new name
export const PromptDialog = ({
  title,
  label,
  initialValue = '',
  confirmLabel = 'Сохранить',
  onSubmit,
  onClose,
}: {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => Promise<void> | void;
  onClose: () => void;
}) => {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const canSubmit = value.trim().length > 0 && !isSaving;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit(value.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="solid" loading={isSaving} disabled={!canSubmit} onClick={() => void submit()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <label style={{ color: theme.font.color.light, display: 'flex', flexDirection: 'column', fontSize: theme.font.size.xs, gap: theme.spacing[1] }}>
        {label}
        <input
          type="text"
          value={value}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void submit();
            }
          }}
          style={{
            background: theme.background.transparent.lighter,
            border: `1px solid ${theme.border.color.medium}`,
            borderRadius: theme.border.radius.sm,
            color: theme.font.color.primary,
            fontFamily: 'inherit',
            fontSize: theme.font.size.md,
            height: theme.spacing[8],
            outline: 'none',
            padding: `0 ${theme.spacing[2]}`,
          }}
        />
      </label>
    </Dialog>
  );
};
