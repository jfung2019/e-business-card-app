/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, View } from 'react-native';

import { ThemeProvider } from '../src/context/ThemeContext';
import { WalletCard } from '../src/components/WalletCard';
import { WALLET_CARD_PALETTES } from '../src/theme/wallet';
import type { CapturedCard } from '../src/types/card';

const ADDRESS_CN = '香港九龍觀塘偉業街 33 號 12 樓';
const ADDRESS_EN = '12/F, 33 Wai Yip St, Kwun Tong, Hong Kong';

function makeCard(
  customFields: Record<string, string>,
  overrides: Partial<CapturedCard> = {},
): CapturedCard {
  return {
    _id: 'card-1',
    owner_user_id: 'user-1',
    scanned_at: '2026-01-01T00:00:00Z',
    core_fields: {
      name: 'Mandes Ko',
      company_name: 'Megaannum AI',
      phone: '+852 5555 0172',
    },
    custom_fields: customFields,
    ...overrides,
  };
}

async function renderCard(card: CapturedCard) {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <WalletCard card={card} paletteIndex={0} onPress={() => {}} />
      </ThemeProvider>,
    );
  });
  return tree!.root;
}

function addressNodes(root: ReactTestRenderer.ReactTestInstance) {
  return root
    .findAllByType(Text)
    .filter(node => node.props.children === ADDRESS_CN || node.props.children === ADDRESS_EN);
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
  return band ? ([] as object[]).concat(band.props.style).filter(Boolean) : null;
}

test('renders both addresses on a collected card, English taking two lines', async () => {
  const nodes = addressNodes(
    await renderCard(makeCard({ address_cn: ADDRESS_CN, address_en: ADDRESS_EN })),
  );

  expect(nodes.map(node => node.props.children)).toEqual([ADDRESS_CN, ADDRESS_EN]);
  expect(nodes.map(node => node.props.numberOfLines)).toEqual([1, 2]);
  // Chinese runs country to unit, so its tail is the part worth keeping.
  expect(nodes[0].props.ellipsizeMode).toBe('head');
});

test('a lone address gets the whole band', async () => {
  const nodes = addressNodes(await renderCard(makeCard({ address_zh: ADDRESS_CN })));

  expect(nodes).toHaveLength(1);
  expect(nodes[0].props.numberOfLines).toBe(3);
});

test('band takes its tint from the card palette', async () => {
  const style = bandStyle(await renderCard(makeCard({ address_en: ADDRESS_EN })));

  expect(style).not.toBeNull();
  expect(style).toContainEqual({ backgroundColor: WALLET_CARD_PALETTES[0].band });
});

test('scanned card insets the band so the face toggles do not cover it', async () => {
  const withScan = makeCard(
    { address_en: ADDRESS_EN },
    { scan_image_front_url: 'https://example.test/front.jpg' },
  );
  const withoutScan = makeCard({ address_en: ADDRESS_EN });

  const scannedPadding = bandStyle(await renderCard(withScan))!.map(
    (entry: { paddingRight?: number }) => entry.paddingRight,
  );
  const plainPadding = bandStyle(await renderCard(withoutScan))!.map(
    (entry: { paddingRight?: number }) => entry.paddingRight,
  );

  expect(scannedPadding).toContain(96);
  expect(plainPadding).not.toContain(96);
});

test('no band when the card carries no address', async () => {
  expect(addressNodes(await renderCard(makeCard({ WhatsApp: '+85255550172' })))).toHaveLength(0);
});
