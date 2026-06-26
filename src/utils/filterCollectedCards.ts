import type { CapturedCard } from '../types/card';

function searchableText(card: CapturedCard): string {
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

export function filterCollectedCards(cards: CapturedCard[], query: string): CapturedCard[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return cards;
  }

  return cards.filter(card => searchableText(card).includes(trimmed));
}
