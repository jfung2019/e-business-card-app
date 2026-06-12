export interface CardDesignPreset {
  id: string;
  label: string;
  background: string;
  accent: string;
  text: string;
  muted: string;
}

export const CARD_DESIGN_PRESETS: CardDesignPreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    background: '#1C2541',
    accent: '#3A86FF',
    text: '#FFFFFF',
    muted: '#B8C4E0',
  },
  {
    id: 'slate',
    label: 'Slate',
    background: '#2F3E46',
    accent: '#84A98C',
    text: '#F4F7F5',
    muted: '#CAD2C5',
  },
  {
    id: 'gold',
    label: 'Gold',
    background: '#2A2118',
    accent: '#D4A574',
    text: '#FFF8EE',
    muted: '#C9B8A4',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    background: '#0B3954',
    accent: '#4CC9F0',
    text: '#F1FAFF',
    muted: '#A8DADC',
  },
  {
    id: 'rose',
    label: 'Rose',
    background: '#4A1942',
    accent: '#FF6B9D',
    text: '#FFF0F6',
    muted: '#E8B4D0',
  },
  {
    id: 'noir',
    label: 'Noir',
    background: '#111111',
    accent: '#6C757D',
    text: '#F8F9FA',
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
