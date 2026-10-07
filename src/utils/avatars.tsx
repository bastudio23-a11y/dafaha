import React from 'react';

export const AVATAR_COLORS = [
  '#4eaab8',
  '#2fa3bf',
  '#0b0f2a',
  '#9fd8e2',
  '#f2c14e',
  '#f4a6a6',
  '#8fd1b0',
  '#b9a3e3',
];

interface AvatarProps {
  index: number;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ index, size = 48, className = '' }) => {
  const k = Math.abs(index || 0) % 8;
  const bg = AVATAR_COLORS[k];

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle select-none transition-transform ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className="rounded-full shadow-sm drop-shadow-sm"
      >
        {/* Background circle */}
        <circle cx="32" cy="32" r="32" fill={bg} />

        {/* Cute face skin tone */}
        <circle cx="32" cy="38" r="18" fill="#ffe0c2" />

        {/* Eyes */}
        <circle cx="26" cy="38" r="2.2" fill="#0b0f2a" />
        <circle cx="38" cy="38" r="2.2" fill="#0b0f2a" />

        {/* Cheerful smile */}
        <path
          d="M26 45 Q32 50 38 45"
          fill="none"
          stroke="#0b0f2a"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Accessory based on avatar index */}
        {k === 0 && (
          // Cool sunglasses
          <>
            <path d="M13 33 a19 17 0 0 1 38 0 z" fill="#0b0f2a" />
            <path d="M46 33 h12" stroke="#0b0f2a" strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {k === 1 && (
          // Round glasses
          <>
            <circle cx="25" cy="36" r="5.5" fill="none" stroke="#0b0f2a" strokeWidth="2.2" />
            <circle cx="39" cy="36" r="5.5" fill="none" stroke="#0b0f2a" strokeWidth="2.2" />
            <path d="M30.5 36 h3" stroke="#0b0f2a" strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
        {k === 2 && (
          // Golden crown
          <path d="M20 22 L24 13 L32 19 L40 13 L44 22 Z" fill="#f2c14e" stroke="#d99b1c" strokeWidth="1" />
        )}
        {k === 3 && (
          // DJ headphones
          <>
            <path
              d="M14 38 A18 18 0 0 1 50 38"
              fill="none"
              stroke="#0b0f2a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect x="10" y="34" width="7" height="13" rx="3.5" fill="#0b0f2a" />
            <rect x="47" y="34" width="7" height="13" rx="3.5" fill="#0b0f2a" />
          </>
        )}
        {k === 4 && (
          // Cool hair tuft / beret
          <path
            d="M13 37 C13 22 22 18 32 18 S51 22 51 37 C45 28 39 27 32 27 S19 28 13 37 Z"
            fill="#5b3a29"
          />
        )}
        {k === 5 && (
          // Chic bow
          <>
            <path d="M32 19 L22 13 V25 Z" fill="#e5484d" />
            <path d="M32 19 L42 13 V25 Z" fill="#e5484d" />
            <circle cx="32" cy="19" r="3" fill="#e5484d" />
          </>
        )}
        {k === 6 && (
          // Red cap with white brim
          <>
            <path d="M13 33 a19 17 0 0 1 38 0 z" fill="#e5484d" />
            <rect x="12" y="31" width="40" height="5" rx="2.5" fill="#ffffff" />
            <circle cx="32" cy="14" r="3.5" fill="#ffffff" />
          </>
        )}
        {k === 7 && (
          // Golden star champion badge
          <path
            d="M32 8 L34.8 14 L41.4 14.8 L36.5 19.3 L37.8 25.8 L32 22.5 L26.2 25.8 L27.5 19.3 L22.6 14.8 L29.2 14 Z"
            fill="#f2c14e"
            stroke="#d99b1c"
            strokeWidth="0.8"
          />
        )}
      </svg>
    </span>
  );
};
