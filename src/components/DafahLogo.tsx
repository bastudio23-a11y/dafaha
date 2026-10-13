import React from 'react';

interface DafahLogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon' | 'horizontal';
}

export const DafahLogo: React.FC<DafahLogoProps> = ({
  size = 48,
  className = '',
  variant = 'icon',
}) => {
  // If variant is 'icon' - renders the stylized aerodynamic 'D' symbol with pixel blocks
  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none ${className}`}
      >
        {/* Background / glow if needed */}
        {/* Outer track: top bar, 180° rounded turn, bottom bar */}
        <path
          d="M 38 12 H 62 C 80 12 94 26 94 44 C 94 62 80 76 62 76 H 38"
          stroke="#122b64"
          strokeWidth="7"
          strokeLinecap="square"
          fill="none"
        />

        {/* Inner parallel track */}
        <path
          d="M 22 22 H 62 C 74 22 84 32 84 44 C 84 56 74 66 62 66 H 38"
          stroke="#122b64"
          strokeWidth="7"
          strokeLinecap="square"
          fill="none"
        />

        {/* Pixel blocks on inner track return */}
        <rect x="22" y="58.5" width="7" height="7" fill="#48bce6" rx="0.5" />
        <rect x="30" y="58.5" width="7" height="7" fill="#48bce6" rx="0.5" />

        {/* Pixel blocks on outer track return */}
        <rect x="3" y="68.5" width="7" height="7" fill="#48bce6" rx="0.5" />
        <rect x="11.5" y="68.5" width="7" height="7" fill="#48bce6" rx="0.5" />
      </svg>
    );
  }

  // Horizontal variant (Emblem + دُفعة | Dafah)
  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`}>
        <DafahLogo size={size} variant="icon" />
        <div className="flex flex-col text-right leading-tight">
          <span className="font-black text-[#122b64] dark:text-[#9fd8e2] text-lg font-['Tajawal'] tracking-wide">
            دُفـعـة
          </span>
          <span className="font-serif text-[11px] text-[#122b64] dark:text-slate-300 tracking-wider font-bold -mt-0.5">
            Dafah
          </span>
        </div>
      </div>
    );
  }

  // Full vertical logo (Symbol + دُفعة + Dafah)
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Symbol */}
      <svg
        width={size * 1.1}
        height={size}
        viewBox="0 0 100 85"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-1"
      >
        {/* Outer track */}
        <path
          d="M 38 10 H 62 C 81 10 95 24 95 43 C 95 62 81 76 62 76 H 38"
          stroke="#122b64"
          strokeWidth="7.5"
          strokeLinecap="square"
          fill="none"
          className="stroke-[#122b64] dark:stroke-[#9fd8e2]"
        />

        {/* Inner parallel track */}
        <path
          d="M 22 21 H 62 C 74 21 84 31 84 43 C 84 55 74 65 62 65 H 38"
          stroke="#122b64"
          strokeWidth="7.5"
          strokeLinecap="square"
          fill="none"
          className="stroke-[#122b64] dark:stroke-[#9fd8e2]"
        />

        {/* Pixel blocks on inner track return */}
        <rect x="22" y="57" width="7" height="7.5" fill="#48bce6" rx="0.5" />
        <rect x="30" y="57" width="7" height="7.5" fill="#48bce6" rx="0.5" />

        {/* Pixel blocks on outer track return */}
        <rect x="2" y="68" width="7" height="7.5" fill="#48bce6" rx="0.5" />
        <rect x="10.5" y="68" width="7" height="7.5" fill="#48bce6" rx="0.5" />
      </svg>

      {/* Arabic Word "دُفعة" */}
      <div className="text-2xl sm:text-3xl font-black text-[#122b64] dark:text-white font-['Tajawal'] tracking-tight">
        دُفــعـة
      </div>

      {/* English Word "Dafah" */}
      <div className="text-sm sm:text-base font-serif font-bold text-[#122b64] dark:text-[#9fd8e2] tracking-wider mt-0.5">
        Dafah
      </div>
    </div>
  );
};
