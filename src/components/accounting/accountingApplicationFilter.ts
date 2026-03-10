export const EXCLUDED_APPLICATION_CODES = ['LEV', 'ATT', 'DLY'];
export const EXCLUDED_NAME_KEYWORDS = ['人件費', '工数', '勤怠', '休暇'];

export const isAccountingTargetApplication = (app: any) => {
  const code = app.application_code?.code?.trim() || '';
  if (EXCLUDED_APPLICATION_CODES.includes(code)) return false;

  const name = app.application_code?.name?.trim() || '';
  if (!name) return true;

  return !EXCLUDED_NAME_KEYWORDS.some(keyword => name.includes(keyword));
};
