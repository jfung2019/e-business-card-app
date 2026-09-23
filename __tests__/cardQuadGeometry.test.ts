import {
  clampPoint,
  containRect,
  defaultCropQuad,
  isPlausibleCard,
  isValidCropQuad,
  lerpQuad,
  orderQuadCorners,
  quadAspectRatio,
  quadArea,
  quadDrift,
  type CardQuad,
  type QuadPoint,
} from '../src/services/cardScanner/quadGeometry';

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 180;

/** A centred, axis-aligned card at roughly the ISO 1.586 ratio. */
function cardLikeQuad(): CardQuad {
  return [
    { x: 60, y: 45 },
    { x: 260, y: 45 },
    { x: 260, y: 171 },
    { x: 60, y: 171 },
  ] as CardQuad;
}

describe('orderQuadCorners', () => {
  it('orders scrambled corners as top-left, top-right, bottom-right, bottom-left', () => {
    const scrambled: QuadPoint[] = [
      { x: 260, y: 171 },
      { x: 60, y: 45 },
      { x: 60, y: 171 },
      { x: 260, y: 45 },
    ];

    expect(orderQuadCorners(scrambled)).toEqual([
      { x: 60, y: 45 },
      { x: 260, y: 45 },
      { x: 260, y: 171 },
      { x: 60, y: 171 },
    ]);
  });

  it('orders a card rotated near 45 degrees clockwise', () => {
    // A card rotated 40° — two corners sit at nearly the same height, which is
    // what broke the old top-pair/bottom-pair split.
    const angle = (40 * Math.PI) / 180;
    const corners: QuadPoint[] = [
      [-0.3, -0.19],
      [0.3, -0.19],
      [0.3, 0.19],
      [-0.3, 0.19],
    ].map(([dx, dy]) => ({
      x: 0.5 + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: 0.5 + dx * Math.sin(angle) + dy * Math.cos(angle),
    }));
    const scrambled = [corners[2], corners[0], corners[3], corners[1]];

    const ordered = orderQuadCorners(scrambled);
    expect(ordered).not.toBeNull();

    // Positive shoelace sum == clockwise on screen (y down). A counter-clockwise
    // order would warp the card mirror-imaged.
    let signed = 0;
    for (let i = 0; i < 4; i += 1) {
      const a = ordered![i];
      const b = ordered![(i + 1) % 4];
      signed += a.x * b.y - b.x * a.y;
    }
    expect(signed).toBeGreaterThan(0);
    expect(isValidCropQuad(ordered!)).toBe(true);

    // Starts at the corner nearest the top-left.
    const sums = ordered!.map((p) => p.x + p.y);
    expect(sums[0]).toBe(Math.min(...sums));
  });

  it('repairs corners a user dragged past each other', () => {
    // Top-left and top-right swapped.
    const crossed: QuadPoint[] = [
      { x: 0.9, y: 0.1 },
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ];

    expect(orderQuadCorners(crossed)).toEqual([
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ]);
  });

  it('rejects point sets that are not quadrilaterals', () => {
    expect(orderQuadCorners([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }])).toBeNull();
  });
});

describe('quadArea and quadAspectRatio', () => {
  it('computes the shoelace area of a rectangle', () => {
    expect(quadArea(cardLikeQuad())).toBeCloseTo(200 * 126, 5);
  });

  it('reports the long-edge ratio regardless of card rotation', () => {
    const landscape = cardLikeQuad();
    const portrait = [
      { x: 100, y: 20 },
      { x: 226, y: 20 },
      { x: 226, y: 220 },
      { x: 100, y: 220 },
    ] as CardQuad;

    expect(quadAspectRatio(landscape)).toBeCloseTo(200 / 126, 3);
    expect(quadAspectRatio(portrait)).toBeCloseTo(200 / 126, 3);
  });
});

describe('isPlausibleCard', () => {
  it('accepts a card-shaped quad filling a reasonable part of the frame', () => {
    expect(isPlausibleCard(cardLikeQuad(), FRAME_WIDTH, FRAME_HEIGHT)).toBe(true);
  });

  it('accepts a card seen at an angle', () => {
    const skewed = [
      { x: 70, y: 50 },
      { x: 258, y: 38 },
      { x: 265, y: 158 },
      { x: 62, y: 168 },
    ] as CardQuad;

    expect(isPlausibleCard(skewed, FRAME_WIDTH, FRAME_HEIGHT)).toBe(true);
  });

  it('rejects a quad too small to be the card in hand', () => {
    const distant = [
      { x: 10, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 35 },
      { x: 10, y: 35 },
    ] as CardQuad;

    expect(isPlausibleCard(distant, FRAME_WIDTH, FRAME_HEIGHT)).toBe(false);
  });

  it('rejects a near-square quad — a sticky note, not a business card', () => {
    const square = [
      { x: 90, y: 30 },
      { x: 220, y: 30 },
      { x: 220, y: 160 },
      { x: 90, y: 160 },
    ] as CardQuad;

    expect(isPlausibleCard(square, FRAME_WIDTH, FRAME_HEIGHT)).toBe(false);
  });

  it('rejects a long thin quad — a table edge or a pen', () => {
    const sliver = [
      { x: 10, y: 80 },
      { x: 310, y: 80 },
      { x: 310, y: 100 },
      { x: 10, y: 100 },
    ] as CardQuad;

    expect(isPlausibleCard(sliver, FRAME_WIDTH, FRAME_HEIGHT)).toBe(false);
  });

  it('rejects a non-convex quad', () => {
    const arrowhead = [
      { x: 60, y: 45 },
      { x: 260, y: 45 },
      { x: 150, y: 100 },
      { x: 60, y: 171 },
    ] as CardQuad;

    expect(isPlausibleCard(arrowhead, FRAME_WIDTH, FRAME_HEIGHT)).toBe(false);
  });

  it('rejects a quad covering the whole frame — usually the frame border itself', () => {
    const fullFrame = [
      { x: 0, y: 0 },
      { x: FRAME_WIDTH, y: 0 },
      { x: FRAME_WIDTH, y: FRAME_HEIGHT },
      { x: 0, y: FRAME_HEIGHT },
    ] as CardQuad;

    expect(isPlausibleCard(fullFrame, FRAME_WIDTH, FRAME_HEIGHT)).toBe(false);
  });

  it('guards against a zero-sized frame', () => {
    expect(isPlausibleCard(cardLikeQuad(), 0, 0)).toBe(false);
  });
});

describe('quadDrift', () => {
  it('is zero for an unmoved quad', () => {
    expect(quadDrift(cardLikeQuad(), cardLikeQuad())).toBe(0);
  });

  it('averages per-corner movement', () => {
    const moved = cardLikeQuad().map((corner) => ({
      x: corner.x + 3,
      y: corner.y + 4,
    })) as unknown as CardQuad;

    // Each corner moves (3,4) — a distance of 5.
    expect(quadDrift(cardLikeQuad(), moved)).toBeCloseTo(5, 6);
  });
});

describe('lerpQuad', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    const from = cardLikeQuad();
    const to = [
      { x: 70, y: 55 },
      { x: 270, y: 55 },
      { x: 270, y: 181 },
      { x: 70, y: 181 },
    ] as CardQuad;

    expect(lerpQuad(from, to, 0)).toEqual(from);
    expect(lerpQuad(from, to, 1)).toEqual(to);
  });

  it('clamps out-of-range factors', () => {
    const from = cardLikeQuad();
    const to = [
      { x: 70, y: 55 },
      { x: 270, y: 55 },
      { x: 270, y: 181 },
      { x: 70, y: 181 },
    ] as CardQuad;

    expect(lerpQuad(from, to, -1)).toEqual(from);
    expect(lerpQuad(from, to, 5)).toEqual(to);
  });

  it('interpolates halfway', () => {
    const from = cardLikeQuad();
    const to = from.map((corner) => ({ x: corner.x + 10, y: corner.y })) as unknown as CardQuad;

    expect(lerpQuad(from, to, 0.5)[0]).toEqual({ x: 65, y: 45 });
  });
});

describe('isValidCropQuad', () => {
  it('accepts the default crop', () => {
    expect(isValidCropQuad(defaultCropQuad())).toBe(true);
  });

  it('rejects a collapsed crop', () => {
    const collapsed = [
      { x: 0.5, y: 0.5 },
      { x: 0.52, y: 0.5 },
      { x: 0.52, y: 0.52 },
      { x: 0.5, y: 0.52 },
    ] as CardQuad;

    expect(isValidCropQuad(collapsed)).toBe(false);
  });

  it('rejects a self-intersecting (bow-tie) crop', () => {
    const bowTie = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.9, y: 0.1 },
      { x: 0.1, y: 0.9 },
    ] as CardQuad;

    expect(isValidCropQuad(bowTie)).toBe(false);
  });

  it('rejects corners outside the image', () => {
    const outside = [
      { x: -0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ] as CardQuad;

    expect(isValidCropQuad(outside)).toBe(false);
  });
});

describe('clampPoint', () => {
  it('keeps a dragged corner inside the image', () => {
    expect(clampPoint({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
    expect(clampPoint({ x: 0.3, y: 0.7 })).toEqual({ x: 0.3, y: 0.7 });
  });
});

describe('containRect', () => {
  it('letterboxes a 9:16 preview on a taller phone screen', () => {
    // 390x844 is an iPhone 14 viewport; 9:16 content leaves bars top and bottom.
    const rect = containRect(9, 16, 390, 844);

    expect(rect.width).toBeCloseTo(390, 5);
    expect(rect.height).toBeCloseTo(390 * (16 / 9), 5);
    expect(rect.x).toBeCloseTo(0, 5);
    expect(rect.y).toBeCloseTo((844 - 390 * (16 / 9)) / 2, 5);
  });

  it('pillarboxes content wider than its container', () => {
    const rect = containRect(4, 3, 300, 300);

    expect(rect.width).toBeCloseTo(300, 5);
    expect(rect.height).toBeCloseTo(225, 5);
    expect(rect.y).toBeCloseTo(37.5, 5);
  });

  it('returns an empty rect before layout', () => {
    expect(containRect(9, 16, 0, 0)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
