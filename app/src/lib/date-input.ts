const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Normalizes free-form date typing into ÅÅÅÅ-MM-DD by keeping digits only and
 * inserting the dashes, so the field works from a plain numeric keyboard.
 */
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function isCompleteDate(value: string): boolean {
  const match = datePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Empty is fine (the field is optional); anything typed must be a real date. */
export function dateInputError(value: string, label: string): string | undefined {
  if (!value) return undefined;
  return isCompleteDate(value)
    ? undefined
    : `${label} måste vara ett fullständigt datum (ÅÅÅÅ-MM-DD).`;
}
