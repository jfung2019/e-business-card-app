import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TabIconName =
  | 'card'
  | 'contacts'
  | 'camera'
  | 'keyboard'
  | 'sliders'
  | 'phone'
  | 'mail'
  | 'globe'
  | 'whatsapp'
  | 'wechat'
  | 'download'
  | 'pencil';

interface TabIconProps {
  name: TabIconName;
  size?: number;
  color: string;
}

/**
 * Tab bar glyphs. Stroke-only on a 24pt grid so they stay legible at 24 and at
 * the 26 used by the raised scan button.
 */
export function TabIcon({ name, size = 24, color }: TabIconProps): React.JSX.Element {
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'card' ? (
        <>
          <Rect x={2.5} y={5} width={19} height={14} rx={3} {...common} />
          <Path d="M2.5 10h19" {...common} />
        </>
      ) : null}

      {name === 'contacts' ? (
        <>
          <Circle cx={9} cy={8} r={3.2} {...common} />
          <Path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5" {...common} />
          <Path d="M17 8.5a3 3 0 0 1 0 5" {...common} />
          <Path d="M18.5 19c0-2.2-.7-3.6-1.8-4.5 2.7.3 4.3 1.9 4.3 4.5" {...common} />
        </>
      ) : null}

      {name === 'camera' ? (
        <>
          <Path
            d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"
            {...common}
            strokeWidth={1.7}
          />
          <Circle cx={12} cy={13} r={3.5} {...common} strokeWidth={1.7} />
        </>
      ) : null}

      {name === 'keyboard' ? (
        <>
          <Rect x={2.5} y={6.5} width={19} height={11} rx={2.5} {...common} />
          <Path
            d="M6 10.5h.01M9.5 10.5h.01M13 10.5h.01M16.5 10.5h.01M8 14h8"
            {...common}
            strokeWidth={2}
          />
        </>
      ) : null}

      {name === 'phone' ? (
        <Path
          d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4 5.2 2 2 0 0 1 6 3z"
          {...common}
        />
      ) : null}

      {name === 'mail' ? (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2.5} {...common} />
          <Path d="M4 7.5l8 6 8-6" {...common} />
        </>
      ) : null}

      {name === 'globe' ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Path d="M3.5 12h17" {...common} />
          <Path
            d="M12 3.5c2.5 2.5 3.8 5.4 3.8 8.5S14.5 18 12 20.5C9.5 18 8.2 15.1 8.2 12S9.5 6 12 3.5z"
            {...common}
          />
        </>
      ) : null}

      {name === 'whatsapp' ? (
        <>
          <Path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L4 20.5l1.5-4.4A8.5 8.5 0 1 1 21 11.5z" {...common} />
          <Path
            d="M9.2 9.1c.4-.1.8 0 1 .4l.6 1c.2.3.1.7-.1 1l-.4.4a5 5 0 0 0 2.3 2.3l.4-.4c.3-.3.7-.3 1-.1l1 .6c.4.2.5.6.4 1a2 2 0 0 1-2.2 1.2 7.5 7.5 0 0 1-5.2-5.2 2 2 0 0 1 1.2-2.2z"
            {...common}
          />
        </>
      ) : null}

      {name === 'wechat' ? (
        <>
          <Path
            d="M9.2 3.5c3.8 0 6.9 2.5 6.9 5.6S13 14.7 9.2 14.7a8.6 8.6 0 0 1-2-.24L4.2 15.7l.8-2.4a5.4 5.4 0 0 1-2.7-4.2c0-3.1 3.1-5.6 6.9-5.6z"
            {...common}
          />
          <Path
            d="M16.2 9.5c3 0 5.4 2 5.4 4.5a4.3 4.3 0 0 1-2.2 3.5l.7 2-2.5-1a7 7 0 0 1-1.4.15c-3 0-5.4-2-5.4-4.5"
            {...common}
          />
        </>
      ) : null}

      {name === 'download' ? (
        <>
          <Path d="M12 4v11" {...common} />
          <Path d="M8 11l4 4 4-4" {...common} />
          <Path d="M5 19h14" {...common} />
        </>
      ) : null}

      {name === 'pencil' ? (
        <>
          <Path d="M4 20h4l10-10-4-4L4 16v4z" {...common} />
          <Path d="M13.5 6.5l4 4" {...common} />
        </>
      ) : null}

      {name === 'sliders' ? (
        <>
          <Path d="M4 7h9M18.5 7H20M4 17h5.5M15 17h5" {...common} />
          <Circle cx={15.5} cy={7} r={2.2} {...common} />
          <Circle cx={12} cy={17} r={2.2} {...common} />
        </>
      ) : null}
    </Svg>
  );
}
