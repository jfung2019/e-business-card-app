/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, View } from 'react-native';

import { MyCardFace } from '../src/components/MyCardFace';
import type { UserCard } from '../src/types/userCard';

const ADDRESS_CN = '香港九龍觀塘偉業街 33 號 12 樓';
const ADDRESS_EN = '12/F, 33 Wai Yip St, Kwun Tong, Hong Kong';

function makeCard(customFields: Record<string, string>): UserCard {
  return {
    _id: 'card-1',
    owner_user_id: 'user-1',
    core_fields: {
      name: 'Mandes Ko',
      company_name: 'Megaannum AI',
      job_title: 'Product engineer',
      email: 'mandes@megaannum.ai',
    },
    custom_fields: customFields,
    design_id: 'classic',
    design_type: 'preset',
    is_primary: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

async function renderCard(
  customFields: Record<string, string>,
  overrides: Partial<UserCard> = {},
) {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MyCardFace card={{ ...makeCard(customFields), ...overrides }} />,
    );
  });
  return tree!.root;
}

/**
 * The band is the innermost View wrapping the address lines. findAllByType walks
 * parents first, so the last match is the band rather than one of its ancestors.
 */
function bandStyle(root: ReactTestRenderer.ReactTestInstance) {
  const matches = root
    .findAllByType(View)
    .filter(node =>
      node.findAllByType(Text).some(text => text.props.children === ADDRESS_EN),
    );
  const band = matches[matches.length - 1];
  return ([] as { paddingRight?: number }[]).concat(band.props.style).filter(Boolean);
}

function textNodes(root: ReactTestRenderer.ReactTestInstance) {
  return root.findAllByType(Text).map(node => ({
    text: node.props.children,
    numberOfLines: node.props.numberOfLines,
  }));
}

test('gives English the second line, since that is where addresses overflow', async () => {
  const nodes = textNodes(
    await renderCard({ address_cn: ADDRESS_CN, address_en: ADDRESS_EN }),
  );

  const cn = nodes.find(node => node.text === ADDRESS_CN);
  const en = nodes.find(node => node.text === ADDRESS_EN);

  expect(cn).toBeDefined();
  expect(en).toBeDefined();
  expect(cn!.numberOfLines).toBe(1);
  expect(en!.numberOfLines).toBe(2);
  expect(nodes.indexOf(cn!)).toBeLessThan(nodes.indexOf(en!));
});

test('a lone address gets the whole band', async () => {
  const nodes = textNodes(await renderCard({ address_en: ADDRESS_EN }));

  const en = nodes.find(node => node.text === ADDRESS_EN);
  expect(en).toBeDefined();
  expect(en!.numberOfLines).toBe(3);
});

test('folds legacy address_ch / address_zh onto the Chinese line', async () => {
  for (const key of ['address_ch', 'address_zh']) {
    const nodes = textNodes(await renderCard({ [key]: ADDRESS_CN }));
    expect(nodes.some(node => node.text === ADDRESS_CN)).toBe(true);
  }
});

test('no band when the card carries no address', async () => {
  const nodes = textNodes(await renderCard({ wechat_id: 'mandes-ko' }));

  // "Primary" is an overlay on the card rather than a line of its content, so it
  // renders after the face and works over a scan photo too.
  expect(nodes.map(node => node.text)).toEqual([
    'Megaannum AI',
    'Mandes Ko',
    'Product engineer',
    'mandes@megaannum.ai',
    'Primary',
  ]);
});

test('blank address values do not open an empty band', async () => {
  const nodes = textNodes(await renderCard({ address_cn: '   ', address_en: '' }));

  expect(nodes.some(node => typeof node.text === 'string' && node.text.trim() === ''))
    .toBe(false);
  expect(nodes).toHaveLength(5);
});

test('back-view toggle does not sit on top of the address', async () => {
  // The toggle only renders when a back scan exists, and it overlays bottom-right.
  const withBack = await renderCard(
    { address_en: ADDRESS_EN },
    {
      scan_image_front_url: 'https://example.test/front.jpg',
      scan_image_back_url: 'https://example.test/back.jpg',
      wallet_display: 'classic',
    },
  );
  const withoutBack = await renderCard({ address_en: ADDRESS_EN });

  expect(bandStyle(withBack).map(entry => entry.paddingRight)).toContain(56);
  expect(bandStyle(withoutBack).map(entry => entry.paddingRight)).not.toContain(56);
});

test('Chinese truncates from the head, keeping the building and unit', async () => {
  const root = await renderCard({ address_cn: ADDRESS_CN, address_en: ADDRESS_EN });
  const lines = root
    .findAllByType(Text)
    .filter(node => node.props.children === ADDRESS_CN || node.props.children === ADDRESS_EN);

  expect(lines[0].props.ellipsizeMode).toBe('head');
  // English leads with the unit and street, so the default tail truncation is right.
  expect(lines[1].props.ellipsizeMode).toBeUndefined();
});
