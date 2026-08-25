import type { CoreFields } from '../types/card';

interface FilterableCard {
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
}

function searchableText(card: FilterableCard): string {
  const { core_fields, custom_fields } = card;
  const parts = [
    core_fields.name,
    core_fields.company_name,
    core_fields.job_title,
    core_fields.email,
    core_fields.phone,
    core_fields.website,
    ...Object.values(custom_fields),
  ];
  return parts
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .toLowerCase();
}

export function filterCardsByQuery<T extends FilterableCard>(cards: T[], query: string): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return cards;
  }

  return cards.filter(card => searchableText(card).includes(trimmed));
}
