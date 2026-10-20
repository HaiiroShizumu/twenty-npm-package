import { useEffect, useMemo, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, openSidePanelPage } from 'twenty-sdk/front-component';
import { IconExternalLink, IconFolderSymlink, IconPencil, IconRestore, IconTrash } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { createRecord, deleteRecord, getErrorMessage, listRecords, updateRecord } from 'src/front/api';
import { DOCUMENT_TYPE_LABELS, formatDate } from 'src/front/format';
import { useAsync, useDebouncedValue } from 'src/front/hooks/use-async';
import { type DocflowDocument, type DocumentFolder } from 'src/front/types';
import {
  DataTable,
  DocflowRoot,
  Message,
  type TableSort,
  toRestOrderBy,
  Toolbar,
} from 'src/front/ui/components';
import { type FolderAppearance, FolderList } from 'src/front/ui/folders';
import { Button, type MenuAction, PromptDialog, SearchWithFilters } from 'src/front/ui/kit';
import { restAnd, restEq, restIlike, restIn, restIsNotNull, restOr } from 'src/shared/api/rest-filter.util';
import { DOCUMENT_OBJECT_NAME, PAGE_SIZE } from 'src/shared/docflow.constants';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import { DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const LIST_POLL_INTERVAL_MS = 3000;
const LIST_POLL_DURATION_MS = 10 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 300;
const FOLDERS_LIMIT = 500;
const ALL_FOLDERS = '';
const ANY = 'any';

type DocumentFilters = { status: string; origin: string; scope: 'active' | 'deleted' };

const DEFAULT_FILTERS: DocumentFilters = { status: ANY, origin: ANY, scope: 'active' };
const DEFAULT_SORT: TableSort = { key: 'createdAt', direction: 'desc' };

// The sandbox of a front component gets only the name and size of a chosen
// file, never its content, so the file goes in through the standard "File"
// field of the document's own card, opened in the side panel.
const openDocumentCard = async (documentId: string) => {
  logDocflow('documents: open card to attach the file', { documentId });

  try {
    await openSidePanelPage({
      to: AppPath.RecordShowPage,
      params: { objectNameSingular: DOCUMENT_OBJECT_NAME, objectRecordId: documentId },
      pageTitle: 'Документ',
    });
  } catch (error) {
    logDocflowError('documents: side panel did not open', error, { documentId });
    await enqueueSnackbar({
      message: 'Карточка документа не открылась, попробуйте ещё раз',
      variant: 'error',
    });
  }
};

const buildFilter = ({
  folderId,
  filters,
  searchQuery,
}: {
  folderId: string;
  filters: DocumentFilters;
  searchQuery: string;
}) =>
  restAnd(
    folderId !== ALL_FOLDERS ? restEq('folderId', folderId) : undefined,
    // Deleted = in the Twenty trash, restored from the document's own card
    filters.scope === 'deleted' ? restIsNotNull('deletedAt') : undefined,
    filters.status !== ANY ? restEq('status', filters.status) : undefined,
    filters.origin === 'collected'
      ? restIn('origin', ['RECORD', 'PROCESS'])
      : filters.origin === 'UPLOAD'
        ? restEq('origin', 'UPLOAD')
        : undefined,
    searchQuery.trim().length > 0
      ? restOr(
          restIlike('name', searchQuery),
          restIlike('number', searchQuery),
          restIlike('sourceRecordName', searchQuery),
        )
      : undefined,
  );

const DocflowDocuments = () => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [folderId, setFolderId] = useState(ALL_FOLDERS);
  const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<TableSort>(DEFAULT_SORT);
  const [openedDocumentId, setOpenedDocumentId] = useState<string | undefined>();
  const [renamingDocument, setRenamingDocument] = useState<DocflowDocument | undefined>();
  const [watchStartedAt, setWatchStartedAt] = useState<number | undefined>();
  const [pages, setPages] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const { data: folders, reload: reloadFolders } = useAsync(
    async () =>
      (
        await listRecords<DocumentFolder>('smbDocumentFolders', {
          order_by: 'name[AscNullsLast]',
          limit: FOLDERS_LIMIT,
        })
      ).records,
    [],
  );
  const listQuery = useMemo(
    () => ({
      filter: buildFilter({ folderId, filters, searchQuery }),
      order_by: toRestOrderBy(sort),
      limit: PAGE_SIZE * pages,
      depth: 1,
    }),
    [folderId, filters, searchQuery, sort, pages],
  );
  const { data, setData, loading, error, reload } = useAsync(
    () => listRecords<DocflowDocument>('smbDocuments', listQuery),
    [listQuery],
  );
  const documents = data?.records ?? [];
  const activeFilterCount =
    (filters.status !== ANY ? 1 : 0) + (filters.origin !== ANY ? 1 : 0) + (filters.scope !== 'active' ? 1 : 0);

  const changeFilters = (patch: Partial<DocumentFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPages(1);
  };

  // A document opens in its standard card in the side panel; while people
  // edit there, the list re-reads itself quietly to show the changes.
  const openDocument = async (documentId: string) => {
    setOpenedDocumentId(documentId);
    setWatchStartedAt(Date.now());
    await openDocumentCard(documentId);
  };

  useEffect(() => {
    if (watchStartedAt === undefined) {
      return;
    }

    const interval = setInterval(() => {
      void listRecords<DocflowDocument>('smbDocuments', listQuery)
        .then((latest) => {
          const signature = (list: DocflowDocument[]) =>
            list.map(({ id, updatedAt }) => `${id}:${updatedAt ?? ''}`).join();

          if (signature(latest.records) !== signature(data?.records ?? [])) {
            setData(latest);
          }
        })
        .catch(() => undefined);
    }, LIST_POLL_INTERVAL_MS);
    const stop = setTimeout(() => clearInterval(interval), LIST_POLL_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [watchStartedAt, listQuery, data]);

  const notifyError = (actionError: unknown, fallback: string) =>
    enqueueSnackbar({ message: getErrorMessage(actionError, fallback), variant: 'error' });

  // As "Создать" of a standard list: an empty draft in the open folder, filled
  // in its own card in the side panel (the file goes in there too).
  const handleCreateDocument = async () => {
    setIsCreating(true);
    logDocflow('documents: create', { folderId });

    try {
      const document = await createRecord<DocflowDocument>('smbDocuments', {
        name: '',
        status: 'DRAFT',
        origin: 'UPLOAD',
        folderId: folderId === ALL_FOLDERS ? null : folderId,
      });

      if (document === undefined) {
        throw new Error('документ создан, но сервер его не вернул');
      }

      void reload();
      await openDocument(document.id);
    } catch (createError) {
      logDocflowError('documents: create failed', createError);
      await notifyError(createError, 'Не удалось создать документ');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateDocument = async (documentId: string, patch: Record<string, unknown>, done: string) => {
    try {
      await updateRecord('smbDocuments', documentId, patch);
      await enqueueSnackbar({ message: done, variant: 'success' });
      await reload();
    } catch (updateError) {
      logDocflowError('documents: update failed', updateError, { documentId });
      await notifyError(updateError, 'Не удалось изменить документ');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteRecord('smbDocuments', documentId);
      await enqueueSnackbar({ message: 'Документ удалён: он в фильтре «Удалённые»', variant: 'success' });
      await reload();
    } catch (deleteError) {
      logDocflowError('documents: delete failed', deleteError, { documentId });
      await notifyError(deleteError, 'Не удалось удалить документ');
    }
  };

  const handleCreateFolder = async (appearance: FolderAppearance) => {
    try {
      const folder = await createRecord<DocumentFolder>('smbDocumentFolders', {
        ...appearance,
        parentFolderId: folderId === ALL_FOLDERS ? null : folderId,
      });

      await reloadFolders();

      if (folder !== undefined) {
        setFolderId(folder.id);
      }
    } catch (folderError) {
      await notifyError(folderError, 'Не удалось создать папку');
    }
  };

  const handleUpdateFolder = async (id: string, appearance: FolderAppearance) => {
    try {
      await updateRecord('smbDocumentFolders', id, { ...appearance });
      await reloadFolders();
    } catch (folderError) {
      await notifyError(folderError, 'Не удалось изменить папку');
    }
  };

  // The documents stay: they show under "Все документы"
  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteRecord('smbDocumentFolders', id);

      if (folderId === id) {
        setFolderId(ALL_FOLDERS);
      }

      await reloadFolders();
      await enqueueSnackbar({ message: 'Папка удалена, документы остались в «Все документы»', variant: 'success' });
    } catch (folderError) {
      await notifyError(folderError, 'Не удалось удалить папку');
    }
  };

  const documentActions = (documentId: string): MenuAction[] => {
    const document = documents.find(({ id }) => id === documentId);

    if (document === undefined) {
      return [];
    }

    if (filters.scope === 'deleted') {
      return [
        { key: 'restore', label: 'Открыть и восстановить', icon: IconRestore, onSelect: () => void openDocument(documentId) },
      ];
    }

    return [
      { key: 'open', label: 'Открыть карточку', icon: IconExternalLink, onSelect: () => void openDocument(documentId) },
      { key: 'rename', label: 'Переименовать', icon: IconPencil, onSelect: () => setRenamingDocument(document) },
      ...(folders ?? [])
        .filter((folder) => folder.id !== document.folderId)
        .map((folder) => ({
          key: `move-${folder.id}`,
          label: `В папку «${folder.name?.trim() || 'Без названия'}»`,
          icon: IconFolderSymlink,
          onSelect: () =>
            void handleUpdateDocument(documentId, { folderId: folder.id }, `Документ перемещён в «${folder.name ?? ''}»`),
        })),
      ...(typeof document.folderId === 'string' && document.folderId.length > 0
        ? [
            {
              key: 'unfile',
              label: 'Убрать из папки',
              icon: IconFolderSymlink,
              onSelect: () => void handleUpdateDocument(documentId, { folderId: null }, 'Документ убран из папки'),
            },
          ]
        : []),
      {
        key: 'delete',
        label: 'Удалить',
        confirmLabel: 'Точно удалить?',
        icon: IconTrash,
        tone: 'danger' as const,
        onSelect: () => void handleDeleteDocument(documentId),
      },
    ];
  };

  return (
    <DocflowRoot>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', minHeight: 0 }}>
          <div
            style={{
              boxSizing: 'border-box',
              flex: '1 1 200px',
              maxWidth: '240px',
              padding: `${theme.spacing[4]} ${theme.spacing[3]} ${theme.spacing[4]} ${theme.spacing[5]}`,
            }}
          >
            <FolderList
              folders={folders ?? []}
              selectedFolderId={folderId}
              allFoldersId={ALL_FOLDERS}
              onSelect={(id) => {
                setFolderId(id);
                setPages(1);
              }}
              onCreate={handleCreateFolder}
              onUpdate={handleUpdateFolder}
              onDelete={handleDeleteFolder}
            />
          </div>
          <div style={{ display: 'flex', flex: '999 1 420px', flexDirection: 'column', minWidth: 0 }}>
            <Toolbar>
              <SearchWithFilters
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Название, номер, где загружен"
                activeFilterCount={activeFilterCount}
                onResetFilters={() => changeFilters(DEFAULT_FILTERS)}
                filters={[
                  {
                    key: 'status',
                    title: 'Статус',
                    value: filters.status,
                    options: [
                      { value: ANY, label: 'Любой' },
                      { value: 'DRAFT', label: 'Черновики' },
                      { value: 'IN_REVIEW', label: 'На согласовании' },
                      { value: 'APPROVED', label: 'Согласованные' },
                      { value: 'ARCHIVED', label: 'В архиве' },
                    ],
                    onChange: (value) => changeFilters({ status: value }),
                  },
                  {
                    key: 'origin',
                    title: 'Откуда',
                    value: filters.origin,
                    options: [
                      { value: ANY, label: 'Отовсюду' },
                      { value: 'UPLOAD', label: 'Загружены в документы' },
                      { value: 'collected', label: 'Из записей и процессов' },
                    ],
                    onChange: (value) => changeFilters({ origin: value }),
                  },
                  {
                    key: 'scope',
                    title: 'Корзина',
                    value: filters.scope,
                    options: [
                      { value: 'active', label: 'Действующие' },
                      { value: 'deleted', label: 'Удалённые' },
                    ],
                    onChange: (value) => changeFilters({ scope: value as DocumentFilters['scope'] }),
                  },
                ]}
              />
              <div style={{ marginLeft: 'auto' }}>
                <Button variant="solid" size="sm" loading={isCreating} onClick={() => void handleCreateDocument()}>
                  Создать
                </Button>
              </div>
            </Toolbar>
            {error !== undefined && (
              <div style={{ padding: theme.spacing[4] }}>
                <Message tone="danger">{getErrorMessage(error, 'Не удалось загрузить документы')}</Message>
              </div>
            )}
            {loading && documents.length === 0 && <Message>Загрузка…</Message>}
            {!loading && error === undefined && documents.length === 0 && <Message>Документов нет.</Message>}
            {documents.length > 0 && (
              <DataTable
                columns={[
                  { key: 'name', label: 'Название', width: '30%', sortKey: 'name' },
                  { key: 'type', label: 'Тип', width: '14%', sortKey: 'documentType' },
                  { key: 'number', label: 'Номер', width: '12%', sortKey: 'number' },
                  { key: 'source', label: 'Где загружен', width: '24%', sortKey: 'sourceRecordName' },
                  { key: 'createdAt', label: 'Добавлен', sortKey: 'createdAt' },
                ]}
                sort={sort}
                onSortChange={(next) => {
                  setSort(next);
                  setPages(1);
                }}
                selectedRowId={openedDocumentId}
                onRowClick={(documentId) => void openDocument(documentId)}
                rowActions={documentActions}
                rows={documents.map((document) => ({
                  id: document.id,
                  cells: {
                    name: document.name?.trim() || 'Без названия',
                    type: DOCUMENT_TYPE_LABELS[document.documentType ?? ''],
                    number: document.number,
                    source: document.sourceRecordName,
                    createdAt: formatDate(document.createdAt),
                  },
                }))}
              />
            )}
            {data?.pageInfo.hasNextPage === true && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing[3] }}>
                <Button variant="ghost" size="sm" loading={loading} onClick={() => setPages((current) => current + 1)}>
                  Показать ещё
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {renamingDocument !== undefined && (
        <PromptDialog
          title="Переименовать документ"
          label="Название"
          initialValue={renamingDocument.name ?? ''}
          onClose={() => setRenamingDocument(undefined)}
          onSubmit={async (name) => {
            await handleUpdateDocument(renamingDocument.id, { name }, 'Документ переименован');
            setRenamingDocument(undefined);
          }}
        />
      )}
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-documents',
  description: 'Документы компании: загрузка и файлы со всех записей и процессов',
  component: DocflowDocuments,
});
