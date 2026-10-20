import { normalizeCoreFields } from '../src/utils/normalizeCoreFields';

describe('normalizeCoreFields', () => {
  test('preserves and trims all name fields when editing a collected card', () => {
    expect(
      normalizeCoreFields({
        name: '  Andy Chan  ',
        first_name: '  Andy ',
        last_name: ' Chan  ',
        name_cn: '  陳大文  ',
        company_name: null,
      }),
    ).toEqual({
      name: 'Andy Chan',
      first_name: 'Andy',
      last_name: 'Chan',
      name_cn: '陳大文',
      company_name: null,
      job_title: null,
      email: null,
      phone: null,
      website: null,
    });
  });

  test('turns cleared optional fields into null', () => {
    expect(
      normalizeCoreFields({
        name: 'Andy Chan',
        first_name: ' ',
        last_name: '',
        name_cn: '  ',
      }),
    ).toMatchObject({
      first_name: null,
      last_name: null,
      name_cn: null,
    });
  });
});
