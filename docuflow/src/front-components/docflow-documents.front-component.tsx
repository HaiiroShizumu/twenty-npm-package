import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, navigate, openSidePanelPage } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { Tag } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';

import { createRecord, getErrorMessage, getRecord, listRecords } from 'src/front/api';
import {
  DOCUMENT_ORIGIN_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  formatDate,
  formatMemberName,
} from 'src/front/format';
import { useAsync, useDebouncedValue } from 'src/front/hooks/use-async';
import { type DocflowDocument, type DocumentFolder } from 'src/front/types';
import {
  DataTable,
  Details,
  DocflowRoot,
  Message,
  SelectField,
  SplitView,
  TextAreaField,
  TextField,
  Toolbar,
} from 'src/front/ui/components';
import { getObjectSummaries } from 'src/shared/api/object-summaries';
import { restAnd, restEq, restIlike, restIn, restOr } from 'src/shared/api/rest-filter.util';
import { DOCUMENT_OBJECT_NAME, PAGE_SIZE } from 'src/shared/docflow.constants';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import { DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

type DocumentFilter = 'all' | 'collected' | 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED';
type Panel = { kind: 'closed' } | { kind: 'upload' } | { kind: 'document'; documentId: string };

const SEARCH_DEBOUNCE_MS = 300;
const FOLDERS_LIMIT = 500;
const COMPANY_OPTIONS_LIMIT = 8;
const ALL_FOLDERS = '';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
      message: 'Карточка документа не открылась: откройте её кнопкой «Прикрепить файл»',
      variant: 'error',
    });
  }
};

const buildFilter = ({
  folderId,
  documentFilter,
  searchQuery,
}: {
  folderId: string;
  documentFilter: DocumentFilter;
  searchQuery: string;
}) =>
  restAnd(
    folderId !== ALL_FOLDERS ? restEq('folderId', folderId) : undefined,
    documentFilter === 'collected'
      ? restIn('origin', ['RECORD', 'PROCESS'])
      : documentFilter !== 'all'
        ? restEq('status', documentFilter)
        : undefined,
    searchQuery.trim().length > 0
      ? restOr(
          restIlike('name', searchQuery),
          restIlike('number', searchQuery),
          restIlike('sourceRecordName', searchQuery),
        )
      : undefined,
  );

const CompanyPicker = ({
  value,
  onChange,
}: {
  value: { id: string; name: string } | null;
  onChange: (company: { id: string; name: string } | null) => void;
}) => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const { data } = useAsync(
    async () =>
      searchQuery.trim().length === 0
        ? []
        : (
            await listRecords<{ id: string; name?: string | null }>('companies', {
              filter: restIlike('name', searchQuery),
              limit: COMPANY_OPTIONS_LIMIT,
            })
          ).records,
    [searchQuery],
  );

  if (value !== null) {
    return (
      <div style={{ alignItems: 'center', display: 'flex', gap: theme.spacing[2], justifyContent: 'space-between' }}>
        <span>Контрагент: {value.name}</span>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Убрать
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
      <TextField label="Контрагент" placeholder="Начните вводить название" value={searchInput} onChange={setSearchInput} />
      {(data ?? []).map((company) => (
        <Button
          key={company.id}
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange({ id: company.id, name: company.name?.trim() || 'Без названия' });
            setSearchInput('');
          }}
        >
          {company.name?.trim() || 'Без названия'}
        </Button>
      ))}
    </div>
  );
};

const DocumentUploadForm = ({
  folderId,
  onUploaded,
  onCancel,
}: {
  folderId: string;
  onUploaded: (documentId: string) => void;
  onCancel: () => void;
}) => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('OTHER');
  const [status, setStatus] = useState('DRAFT');
  const [number, setNumber] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [description, setDescription] = useState('');
  const [counterparty, setCounterparty] = useState<{ id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleCreate = async () => {
    if (name.trim().length === 0) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(undefined);
    logDocflow('documents: create', { name: name.trim(), documentType, status, folderId });

    try {
      const document = await createRecord<DocflowDocument>('smbDocuments', {
        name: name.trim(),
        documentType,
        status,
        number: number.trim() || null,
        documentDate: DATE_PATTERN.test(documentDate) ? documentDate : null,
        validUntil: DATE_PATTERN.test(validUntil) ? validUntil : null,
        description: description.trim() || null,
        counterpartyId: counterparty?.id ?? null,
        folderId: folderId === ALL_FOLDERS ? null : folderId,
        origin: 'UPLOAD',
      });

      if (document === undefined) {
        throw new Error('документ создан, но сервер его не вернул');
      }

      logDocflow('documents: created', { documentId: document.id });
      await enqueueSnackbar({ message: 'Документ создан: прикрепите файл в поле «Файл»', variant: 'success' });
      onUploaded(document.id);
      await openDocumentCard(document.id);
    } catch (error) {
      logDocflowError('documents: create failed', error);
      setErrorMessage(getErrorMessage(error, 'Не удалось создать документ'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
      <TextField label="Название" value={name} onChange={setName} />
      <SelectField
        label="Тип"
        value={documentType}
        options={Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        onChange={setDocumentType}
      />
      <SelectField
        label="Статус"
        value={status}
        options={Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        onChange={setStatus}
      />
      <TextField label="Номер" value={number} onChange={setNumber} />
      <TextField label="Дата документа" type="date" value={documentDate} onChange={setDocumentDate} />
      <TextField label="Действует до" type="date" value={validUntil} onChange={setValidUntil} />
      <CompanyPicker value={counterparty} onChange={setCounterparty} />
      <TextAreaField label="Описание" value={description} onChange={setDescription} />
      <Message tone="hint">Файл прикрепляется в карточке документа: она откроется справа после создания.</Message>
      {errorMessage !== undefined && <Message tone="danger">{errorMessage}</Message>}
      <div style={{ display: 'flex', gap: theme.spacing[2] }}>
        <Button
          variant="solid"
          size="sm"
          loading={isSaving}
          disabled={name.trim().length === 0}
          onClick={() => void handleCreate()}
        >
          Создать и прикрепить файл
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
};

const DocumentCard = ({ documentId }: { documentId: string }) => {
  const theme = useTheme();
  const { data: document, loading, error, reload } = useAsync(
    () => getRecord<DocflowDocument>('smbDocuments', documentId),
    [documentId],
  );
  const { data: objectSummaries } = useAsync(() => getObjectSummaries(), []);

  if (document === undefined) {
    return loading ? (
      <Message>Загрузка…</Message>
    ) : (
      <Message tone="danger">{getErrorMessage(error, 'Документ не найден или нет доступа.')}</Message>
    );
  }

  const file = document.file?.[0];
  const sourceSummary =
    typeof document.sourceObjectName === 'string'
      ? objectSummaries?.get(document.sourceObjectName)
      : undefined;
  const linkStyle = { color: theme.color.blue, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
      <strong style={{ fontSize: theme.font.size.lg }}>{document.name?.trim() || 'Без названия'}</strong>
      <Details
        rows={[
          { label: 'Тип', value: DOCUMENT_TYPE_LABELS[document.documentType ?? ''] },
          { label: 'Номер', value: document.number },
          { label: 'Дата', value: formatDate(document.documentDate) },
          { label: 'Действует до', value: formatDate(document.validUntil) },
          { label: 'Контрагент', value: document.counterparty?.name },
          {
            label: 'Статус',
            value: document.status && <Tag color="gray">{DOCUMENT_STATUS_LABELS[document.status] ?? document.status}</Tag>,
          },
          { label: 'Автор', value: formatMemberName(document.author ?? undefined) },
          { label: 'Добавлен', value: formatDate(document.createdAt) },
          { label: 'Источник', value: DOCUMENT_ORIGIN_LABELS[document.origin ?? ''] },
          {
            label: 'Где загружен',
            value: sourceSummary !== undefined && typeof document.sourceRecordId === 'string' && (
              <span
                role="link"
                tabIndex={0}
                style={linkStyle}
                onClick={() =>
                  void navigate(AppPath.RecordShowPage, {
                    objectNameSingular: sourceSummary.nameSingular,
                    objectRecordId: document.sourceRecordId as string,
                  })
                }
              >
                {document.sourceRecordName ?? sourceSummary.labelSingular}
              </span>
            ),
          },
          {
            label: 'Процесс',
            value: typeof document.workflowRunId === 'string' && (
              <span
                role="link"
                tabIndex={0}
                style={linkStyle}
                onClick={() =>
                  void navigate(AppPath.RecordShowPage, {
                    objectNameSingular: 'workflowRun',
                    objectRecordId: document.workflowRunId as string,
                  })
                }
              >
                Открыть запуск
              </span>
            ),
          },
        ]}
      />
      {typeof document.description === 'string' && document.description.length > 0 && (
        <div style={{ whiteSpace: 'pre-wrap' }}>{document.description}</div>
      )}
      {file?.url !== undefined ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.label} style={linkStyle}>
          Скачать {file.label}
        </a>
      ) : (
        <Message tone="hint">Файл не прикреплён.</Message>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        <Button variant="outline" size="sm" onClick={() => void openDocumentCard(documentId)}>
          {file === undefined ? 'Прикрепить файл' : 'Открыть карточку'}
        </Button>
        <Button variant="ghost" size="sm" loading={loading} onClick={() => void reload()}>
          Обновить
        </Button>
      </div>
    </div>
  );
};

const DocflowDocuments = () => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [folderId, setFolderId] = useState(ALL_FOLDERS);
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>('all');
  const [panel, setPanel] = useState<Panel>({ kind: 'closed' });
  const [pages, setPages] = useState(1);
  const [newFolderName, setNewFolderName] = useState('');

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
  const { data, loading, error, reload } = useAsync(
    () =>
      listRecords<DocflowDocument>('smbDocuments', {
        filter: buildFilter({ folderId, documentFilter, searchQuery }),
        order_by: 'createdAt[DescNullsLast]',
        limit: PAGE_SIZE * pages,
        depth: 1,
      }),
    [folderId, documentFilter, searchQuery, pages],
  );
  const documents = data?.records ?? [];

  const handleCreateFolder = async () => {
    const folderName = newFolderName.trim();

    if (folderName.length === 0) {
      return;
    }

    try {
      await createRecord('smbDocumentFolders', {
        name: folderName,
        parentFolderId: folderId === ALL_FOLDERS ? null : folderId,
      });
      setNewFolderName('');
      await reloadFolders();
    } catch (folderError) {
      await enqueueSnackbar({ message: getErrorMessage(folderError, 'Не удалось создать папку'), variant: 'error' });
    }
  };

  return (
    <DocflowRoot>
      <SplitView
        panelTitle={panel.kind === 'upload' ? 'Новый документ' : 'Документ'}
        onClosePanel={() => setPanel({ kind: 'closed' })}
        panel={
          panel.kind === 'upload' ? (
            <DocumentUploadForm
              folderId={folderId}
              onCancel={() => setPanel({ kind: 'closed' })}
              onUploaded={(documentId) => {
                setPanel({ kind: 'document', documentId });
                void reload();
              }}
            />
          ) : panel.kind === 'document' ? (
            <DocumentCard key={panel.documentId} documentId={panel.documentId} />
          ) : undefined
        }
      >
        <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', minHeight: 0 }}>
          <nav
            aria-label="Папки"
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flex: '1 1 200px',
              flexDirection: 'column',
              gap: theme.spacing[1],
              maxWidth: '240px',
              padding: theme.spacing[2],
            }}
          >
            {[{ id: ALL_FOLDERS, name: 'Все документы' }, ...(folders ?? [])].map((folder) => (
              <Button
                key={folder.id}
                variant={folder.id === folderId ? 'solid' : 'ghost'}
                size="sm"
                fullWidth
                onClick={() => {
                  setFolderId(folder.id);
                  setPages(1);
                }}
              >
                {folder.name?.trim() || 'Без названия'}
              </Button>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1], marginTop: theme.spacing[3] }}>
              <TextField placeholder="Новая папка" value={newFolderName} onChange={setNewFolderName} />
              <Button variant="outline" size="sm" disabled={newFolderName.trim().length === 0} onClick={() => void handleCreateFolder()}>
                Создать папку
              </Button>
            </div>
          </nav>
          <div style={{ display: 'flex', flex: '999 1 420px', flexDirection: 'column', minWidth: 0 }}>
            <Toolbar>
              <div style={{ flex: '0 1 240px' }}>
                <TextField
                  type="search"
                  variant="bare"
                  placeholder="Название или номер"
                  value={searchInput}
                  onChange={setSearchInput}
                />
              </div>
              <SelectField<DocumentFilter>
                variant="bare"
                value={documentFilter}
                options={[
                  { value: 'all', label: 'Все документы' },
                  { value: 'collected', label: 'Из записей и процессов' },
                  { value: 'DRAFT', label: 'Черновики' },
                  { value: 'IN_REVIEW', label: 'На согласовании' },
                  { value: 'APPROVED', label: 'Согласованные' },
                  { value: 'ARCHIVED', label: 'В архиве' },
                ]}
                onChange={(value) => {
                  setDocumentFilter(value);
                  setPages(1);
                }}
              />
              <div style={{ marginLeft: 'auto' }}>
                <Button variant="solid" size="sm" onClick={() => setPanel({ kind: 'upload' })}>
                  Добавить документ
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
                  { key: 'name', label: 'Название', width: '34%' },
                  { key: 'type', label: 'Тип', width: '14%' },
                  { key: 'number', label: 'Номер', width: '12%' },
                  { key: 'source', label: 'Где загружен', width: '24%' },
                  { key: 'createdAt', label: 'Добавлен' },
                ]}
                selectedRowId={panel.kind === 'document' ? panel.documentId : undefined}
                onRowClick={(documentId) => setPanel({ kind: 'document', documentId })}
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
      </SplitView>
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-documents',
  description: 'Документы компании: загрузка и файлы со всех записей и процессов',
  component: DocflowDocuments,
});
