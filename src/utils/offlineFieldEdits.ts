import type { CoreFields } from '../types/card';

const CORE_FIELD_KEYS: Array<keyof CoreFields> = [
  'name',
  'company_name',
  'job_title',
  'email',
  'phone',
  'website',
];

export function buildEditedFieldKeys(
  previousCore: CoreFields,
  nextCore: CoreFields,
  previousCustom: Record<string, string>,
  nextCustom: Record<string, string>,
  existingEdited: string[] = [],
): string[] {
  const edited = new Set(existingEdited);

  for (const key of CORE_FIELD_KEYS) {
    const previousValue = previousCore[key]?.trim() ?? '';
    const nextValue = nextCore[key]?.trim() ?? '';
    if (previousValue !== nextValue) {
      edited.add(`core.${key}`);
    }
  }

  const customKeys = new Set([...Object.keys(previousCustom), ...Object.keys(nextCustom)]);
  for (const key of customKeys) {
    const previousValue = previousCustom[key]?.trim() ?? '';
    const nextValue = nextCustom[key]?.trim() ?? '';
    if (previousValue !== nextValue) {
      edited.add(`custom.${key}`);
    }
  }

  return [...edited];
}
