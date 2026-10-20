import { useState } from 'react';
import {
  type IconComponent,
  IconArchive,
  IconBook,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconCalendar,
  IconFileText,
  IconFlag,
  IconFolder,
  IconHeart,
  IconHome,
  IconLock,
  IconMail,
  IconPencil,
  IconPlus,
  IconStar,
  IconTag,
  IconTrash,
  IconUser,
  IconUsers,
} from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { type DocumentFolder } from 'src/front/types';
import { ActionsMenu, Button, Dialog } from 'src/front/ui/kit';

// Kept in the folder's "icon" field by name, so the standard record views
// (and the fork) can show the same icon.
export const FOLDER_ICONS: Record<string, IconComponent> = {
  IconFolder,
  IconBriefcase,
  IconFileText,
  IconBook,
  IconArchive,
  IconStar,
  IconUsers,
  IconUser,
  IconBuildingSkyscraper,
  IconHome,
  IconCalendar,
  IconMail,
  IconTag,
  IconFlag,
  IconHeart,
  IconLock,
};

// The options of the folder's "color" field and the theme color each shows
export const FOLDER_COLORS: { value: string; label: string; themeColor: string }[] = [
  { value: 'GRAY', label: 'Серый', themeColor: 'gray' },
  { value: 'BLUE', label: 'Синий', themeColor: 'blue' },
  { value: 'GREEN', label: 'Зелёный', themeColor: 'green' },
  { value: 'ORANGE', label: 'Оранжевый', themeColor: 'orange' },
  { value: 'RED', label: 'Красный', themeColor: 'red' },
  { value: 'PURPLE', label: 'Фиолетовый', themeColor: 'purple' },
];

// Tag colors: a skin may repaint the UI accent (Twenty's blue), tags keep theirs
export const useFolderColor = () => {
  const theme = useTheme();
  const colors = theme.tag.text as unknown as Record<string, string>;

  return (value: string | null | undefined) =>
    colors[FOLDER_COLORS.find((color) => color.value === value)?.themeColor ?? 'gray'] ?? theme.font.color.tertiary;
};

export type FolderAppearance = { name: string; color: string; icon: string };

export const FolderDialog = ({
  title,
  initial,
  confirmLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  initial: FolderAppearance;
  confirmLabel: string;
  onSubmit: (appearance: FolderAppearance) => Promise<void>;
  onClose: () => void;
}) => {
  const theme = useTheme();
  const folderColor = useFolderColor();
  const [appearance, setAppearance] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const canSubmit = appearance.name.trim().length > 0 && !isSaving;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit({ ...appearance, name: appearance.name.trim() });
    } finally {
      setIsSaving(false);
    }
  };

  const sectionTitle = (text: string) => (
    <span style={{ color: theme.font.color.light, fontSize: theme.font.size.xs }}>{text}</span>
  );

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
      {sectionTitle('Название')}
      <input
        type="text"
        value={appearance.name}
        autoFocus
        aria-label="Название папки"
        onChange={(event) => setAppearance({ ...appearance, name: event.target.value })}
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
      {sectionTitle('Цвет')}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        {FOLDER_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={appearance.color === color.value}
            onClick={() => setAppearance({ ...appearance, color: color.value })}
            style={{
              background: folderColor(color.value),
              border: `2px solid ${appearance.color === color.value ? theme.font.color.primary : 'transparent'}`,
              borderRadius: '50%',
              cursor: 'pointer',
              height: '22px',
              outline: `2px solid ${theme.background.primary}`,
              outlineOffset: '-4px',
              padding: 0,
              width: '22px',
            }}
          />
        ))}
      </div>
      {sectionTitle('Значок')}
      <div style={{ display: 'grid', gap: theme.spacing[1], gridTemplateColumns: 'repeat(8, 1fr)' }}>
        {Object.entries(FOLDER_ICONS).map(([name, Icon]) => {
          const isSelected = appearance.icon === name;

          return (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={isSelected}
              onClick={() => setAppearance({ ...appearance, icon: name })}
              style={{
                alignItems: 'center',
                background: isSelected ? theme.background.transparent.medium : 'transparent',
                border: 'none',
                borderRadius: theme.border.radius.sm,
                color: isSelected ? folderColor(appearance.color) : theme.font.color.tertiary,
                cursor: 'pointer',
                display: 'flex',
                height: '32px',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <Icon size={theme.icon.size.lg} stroke={theme.icon.stroke.sm} />
            </button>
          );
        })}
      </div>
    </Dialog>
  );
};

const FolderRow = ({
  label,
  icon: Icon,
  color,
  isSelected,
  onClick,
  actions,
}: {
  label: string;
  icon: IconComponent;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  actions?: Parameters<typeof ActionsMenu>[0]['actions'];
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        alignItems: 'center',
        background: isSelected
          ? theme.background.transparent.light
          : isHovered
            ? theme.background.transparent.lighter
            : 'transparent',
        borderRadius: theme.border.radius.sm,
        display: 'flex',
        gap: theme.spacing[1],
        height: theme.spacing[8],
        paddingRight: theme.spacing[1],
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          color: isSelected ? theme.font.color.primary : theme.font.color.secondary,
          cursor: 'pointer',
          display: 'flex',
          flex: 1,
          fontFamily: 'inherit',
          fontSize: theme.font.size.md,
          fontWeight: isSelected ? theme.font.weight.medium : theme.font.weight.regular,
          gap: theme.spacing[2],
          height: '100%',
          minWidth: 0,
          padding: `0 ${theme.spacing[2]}`,
          textAlign: 'left',
        }}
      >
        <span style={{ color, display: 'inline-flex' }}>
          <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </button>
      {actions !== undefined && (isHovered || isSelected) && <ActionsMenu actions={actions} align="left" label={`Папка «${label}»`} />}
    </div>
  );
};

export const FolderList = ({
  folders,
  selectedFolderId,
  allFoldersId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: {
  folders: DocumentFolder[];
  selectedFolderId: string;
  allFoldersId: string;
  onSelect: (folderId: string) => void;
  onCreate: (appearance: FolderAppearance) => Promise<void>;
  onUpdate: (folderId: string, appearance: FolderAppearance) => Promise<void>;
  onDelete: (folderId: string) => Promise<void>;
}) => {
  const theme = useTheme();
  const folderColor = useFolderColor();
  const [dialog, setDialog] = useState<{ kind: 'create' } | { kind: 'edit'; folder: DocumentFolder } | undefined>();

  return (
    <nav aria-label="Папки" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <FolderRow
        label="Все документы"
        icon={IconFolder}
        color={theme.font.color.tertiary}
        isSelected={selectedFolderId === allFoldersId}
        onClick={() => onSelect(allFoldersId)}
      />
      {folders.map((folder) => {
        const name = folder.name?.trim() || 'Без названия';

        return (
          <FolderRow
            key={folder.id}
            label={name}
            icon={FOLDER_ICONS[folder.icon ?? ''] ?? IconFolder}
            color={folderColor(folder.color)}
            isSelected={selectedFolderId === folder.id}
            onClick={() => onSelect(folder.id)}
            actions={[
              {
                key: 'edit',
                label: 'Переименовать и оформить',
                icon: IconPencil,
                onSelect: () => setDialog({ kind: 'edit', folder }),
              },
              {
                key: 'delete',
                label: 'Удалить папку',
                confirmLabel: 'Удалить? Документы останутся',
                icon: IconTrash,
                tone: 'danger',
                onSelect: () => void onDelete(folder.id),
              },
            ]}
          />
        );
      })}
      <div style={{ marginTop: theme.spacing[1] }}>
        <Button variant="ghost" icon={IconPlus} onClick={() => setDialog({ kind: 'create' })}>
          Новая папка
        </Button>
      </div>
      {dialog?.kind === 'create' && (
        <FolderDialog
          title="Новая папка"
          confirmLabel="Создать"
          initial={{ name: '', color: 'BLUE', icon: 'IconFolder' }}
          onClose={() => setDialog(undefined)}
          onSubmit={async (appearance) => {
            await onCreate(appearance);
            setDialog(undefined);
          }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <FolderDialog
          title="Папка"
          confirmLabel="Сохранить"
          initial={{
            name: dialog.folder.name ?? '',
            color: dialog.folder.color ?? 'GRAY',
            icon: dialog.folder.icon ?? 'IconFolder',
          }}
          onClose={() => setDialog(undefined)}
          onSubmit={async (appearance) => {
            await onUpdate(dialog.folder.id, appearance);
            setDialog(undefined);
          }}
        />
      )}
    </nav>
  );
};
