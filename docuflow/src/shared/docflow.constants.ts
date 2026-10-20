// Values shared by the app's server functions and front components. The
// NorDiv fork server uses the same values (smb-docflow, smb-forms), so a
// workspace can move between the fork engine and the app engine.
export const DOCFLOW_SECTION = 'DOCFLOW';
export const CRM_SECTION = 'CRM';

// Key of the start parameters in the payload of a manual run; the payload is
// kept as the run's trigger output, so the parameters stay in the run.
export const DOCFLOW_LAUNCH_PARAMETERS_KEY = 'smbDocflowParameters';

// Input of the "Launch with parameters" step: the whole object of parameters,
// so the step returns them as its output and later steps read them as
// {{<step>.<field>}}.
export const LAUNCH_PARAMETERS_STEP_INPUT = `{{trigger.${DOCFLOW_LAUNCH_PARAMETERS_KEY}}}`;
export const LAUNCH_PARAMETERS_STEP_NAME = 'Параметры запуска';

export const TASK_DONE_STATUS = 'DONE';
export const TASK_TODO_STATUS = 'TODO';

// Keys a form field keeps in its free-form `settings`: the workflow FORM step
// schema drops unknown keys everywhere else.
export const FORM_FIELD_REQUIRED_SETTING = 'smbIsRequired';
export const FORM_FIELD_ROLE_SETTING = 'smbRole';
export const FORM_FIELD_DUE_IN_DAYS_SETTING = 'smbDueInDays';

export const TRIGGER_STEP_ID = 'trigger';

export const DOCUMENT_OBJECT_NAME = 'smbDocument';
export const DOCUMENT_FOLDER_OBJECT_NAME = 'smbDocumentFolder';

export const PAGE_SIZE = 50;
