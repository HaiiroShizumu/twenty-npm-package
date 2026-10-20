import { useState } from 'react';
import { Button } from 'src/front/ui/button';
import { useTheme } from 'twenty-ui/theme';

import { callMessenger, getErrorMessage } from 'src/front/api';
import { getWorkspaceMemberName } from 'src/front/hooks/use-workspace-members';
import { type WorkspaceMember } from 'src/front/types';
import { Message } from 'src/front/ui/components';
import { type ConversationResponse } from 'src/shared/api/messenger-api.type';
import { type ConversationView } from 'src/shared/conversation.type';
import { CONVERSATION_NAME_MAX_LENGTH } from 'src/shared/messenger.constants';

type NewConversationFormProps = {
  members: WorkspaceMember[];
  viewerId: string | undefined;
  onCreated: (conversation: ConversationView) => void;
  onCancel: () => void;
};

type Mode = 'DIRECT' | 'GROUP';

// Действия и поиск сверху, список коллег прокручивается под ними: личная
// беседа открывается нажатием на коллегу, групповой нужны название и галочки.
export const NewConversationForm = ({
  members,
  viewerId,
  onCreated,
  onCancel,
}: NewConversationFormProps) => {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('DIRECT');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const query = search.trim().toLocaleLowerCase('ru');
  const colleagues = members
    .filter((member) => member.id !== viewerId)
    .filter((member) =>
      query.length === 0
        ? true
        : getWorkspaceMemberName(member)
            .toLocaleLowerCase('ru')
            .includes(query),
    );

  const inputStyle = {
    background: theme.background.transparent.lighter,
    border: `1px solid ${theme.border.color.medium}`,
    borderRadius: theme.border.radius.sm,
    boxSizing: 'border-box' as const,
    color: theme.font.color.primary,
    font: 'inherit',
    minHeight: theme.spacing[8],
    padding: `0 ${theme.spacing[2]}`,
    width: '100%',
  };

  const create = async (request: () => Promise<ConversationResponse>) => {
    setIsSaving(true);
    setError(undefined);

    try {
      onCreated((await request()).conversation);
    } catch (createError) {
      setError(getErrorMessage(createError, 'Беседа не создана'));
    } finally {
      setIsSaving(false);
    }
  };

  const openDirect = (workspaceMemberId: string) =>
    create(() =>
      callMessenger<ConversationResponse>({
        action: 'openDirect',
        workspaceMemberId,
      }),
    );

  const createGroup = () =>
    create(() =>
      callMessenger<ConversationResponse>({
        action: 'createGroup',
        name,
        workspaceMemberIds: selectedIds,
      }),
    );

  const toggle = (memberId: string) =>
    setSelectedIds((current) =>
      current.includes(memberId)
        ? current.filter((selectedId) => selectedId !== memberId)
        : [...current, memberId],
    );

  return (
    <section className="nd-messenger-conversation" aria-label="Новая беседа">
      <div
        style={{
          borderBottom: `1px solid ${theme.border.color.light}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
          padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            gap: theme.spacing[1],
          }}
        >
          <Button
            variant={mode === 'DIRECT' ? 'solid' : 'ghost'}
            size="sm"
            onClick={() => setMode('DIRECT')}
          >
            Личная
          </Button>
          <Button
            variant={mode === 'GROUP' ? 'solid' : 'ghost'}
            size="sm"
            onClick={() => setMode('GROUP')}
          >
            Групповая
          </Button>
          <span style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Отмена
          </Button>
        </div>
        {mode === 'GROUP' && (
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            <input
              aria-label="Название беседы"
              placeholder="Название беседы"
              value={name}
              maxLength={CONVERSATION_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
            />
            <Button
              variant="solid"
              size="sm"
              disabled={
                isSaving || selectedIds.length === 0 || name.trim().length === 0
              }
              onClick={() => void createGroup()}
            >
              {selectedIds.length === 0
                ? 'Создать'
                : `Создать (${selectedIds.length})`}
            </Button>
          </div>
        )}
        <input
          type="search"
          aria-label="Найти коллегу"
          placeholder="Найти коллегу"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={inputStyle}
        />
        {error !== undefined && <Message tone="danger">{error}</Message>}
      </div>
      <ul
        style={{
          flex: 1,
          listStyle: 'none',
          margin: 0,
          overflowY: 'auto',
          padding: 0,
        }}
      >
        {colleagues.length === 0 && <Message>Никого не нашли.</Message>}
        {colleagues.map((member) => {
          const isSelected = selectedIds.includes(member.id);

          return (
            <li key={member.id}>
              <button
                type="button"
                className="nd-messenger-item"
                disabled={isSaving}
                aria-pressed={mode === 'GROUP' ? isSelected : undefined}
                onClick={() =>
                  mode === 'DIRECT'
                    ? void openDirect(member.id)
                    : toggle(member.id)
                }
                style={{
                  alignItems: 'center',
                  background:
                    isSelected && mode === 'GROUP'
                      ? theme.background.transparent.light
                      : 'transparent',
                  borderBottom: `1px solid ${theme.border.color.light}`,
                  flexDirection: 'row',
                  gap: theme.spacing[2],
                }}
              >
                {mode === 'GROUP' && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    tabIndex={-1}
                  />
                )}
                {getWorkspaceMemberName(member)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
