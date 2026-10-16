import type { CoreFields } from '../types/card';

/** Trim values from a card edit form without dropping optional core fields. */
export function normalizeCoreFields(fields: CoreFields): CoreFields {
  return {
    name: fields.name.trim(),
    first_name: fields.first_name?.trim() || null,
    last_name: fields.last_name?.trim() || null,
    name_cn: fields.name_cn?.trim() || null,
    company_name: fields.company_name?.trim() || null,
    job_title: fields.job_title?.trim() || null,
    email: fields.email?.trim() || null,
    phone: fields.phone?.trim() || null,
    website: fields.website?.trim() || null,
  };
}
