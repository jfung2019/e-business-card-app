import type { CoreFields } from '../types/card';

export interface QueueFieldEdits {
  editedFields: string[];
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
}

export function buildQueueFieldEditsPatch(
  created: { core_fields: CoreFields; custom_fields: Record<string, string> },
  item: QueueFieldEdits,
): { core_fields?: CoreFields; custom_fields?: Record<string, string> } {
  const edited = new Set(item.editedFields);
  if (edited.size === 0) {
    return {};
  }

  const patch: { core_fields?: CoreFields; custom_fields?: Record<string, string> } = {};
  let core: CoreFields | undefined;

  for (const key of edited) {
    if (!key.startsWith('core.')) {
      continue;
    }
    const field = key.slice(5) as keyof CoreFields;
    if (!core) {
      core = { ...created.core_fields };
    }
    core[field] = item.core_fields[field] ?? null;
  }
  if (core) {
    patch.core_fields = core;
  }

  let custom: Record<string, string> | undefined;
  for (const key of edited) {
    if (!key.startsWith('custom.')) {
      continue;
    }
    const field = key.slice(7);
    if (!custom) {
      custom = { ...created.custom_fields };
    }
    const value = item.custom_fields[field]?.trim();
    if (value) {
      custom[field] = value;
    } else {
      delete custom[field];
    }
  }
  if (custom) {
    patch.custom_fields = custom;
  }

  return patch;
}
