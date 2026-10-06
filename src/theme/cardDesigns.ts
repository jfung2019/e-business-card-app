export interface CardDesignPreset {
  id: string;
  label: string;
  background: string;
  accent: string;
  text: string;
  muted: string;
  /** Wash behind the address band on the dark presets; Sand sets its own. */
  band: string;
}

const PRESET_BAND = 'rgba(255,255,255,0.06)';

export const CARD_DESIGN_PRESETS: CardDesignPreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    background: '#1C2541',
    accent: '#3A86FF',
    text: '#FFFFFF',
    band: PRESET_BAND,
    muted: '#B8C4E0',
  },
  {
    id: 'slate',
    label: 'Slate',
    background: '#2F3E46',
    accent: '#84A98C',
    text: '#F4F7F5',
    band: PRESET_BAND,
    muted: '#CAD2C5',
  },
  {
    id: 'gold',
    label: 'Gold',
    background: '#2A2118',
    accent: '#D4A574',
    text: '#FFF8EE',
    band: PRESET_BAND,
    muted: '#C9B8A4',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    background: '#0B3954',
    accent: '#4CC9F0',
    text: '#F1FAFF',
    band: PRESET_BAND,
    muted: '#A8DADC',
  },
  {
    id: 'sand',
    label: 'Sand',
    background: '#D1C6A5',
    accent: '#6B5B3E',
    text: '#2A2118',
    // The only light preset, so the band tints down rather than up.
    band: 'rgba(0,0,0,0.06)',
    muted: '#4A4236',
  },
  {
    id: 'noir',
    label: 'Noir',
    background: '#111111',
    accent: '#6C757D',
    text: '#F8F9FA',
    band: PRESET_BAND,
    muted: '#ADB5BD',
  },
];

export const DEFAULT_CARD_DESIGN_ID = 'classic';

export function getCardDesign(designId: string): CardDesignPreset {
  return (
    CARD_DESIGN_PRESETS.find(preset => preset.id === designId) ??
    CARD_DESIGN_PRESETS[0]
  );
}
