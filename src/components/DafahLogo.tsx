import React from 'react';

interface DafahLogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon' | 'horizontal';
  showBackground?: boolean;
}

/**
 * Golden Owl Emblem Component (شعار البومة الذهبية)
 * Faithfully matches the royal geometric gold owl crest.
 */
export const DafahLogo: React.FC<DafahLogoProps> = ({
  size = 48,
  className = '',
  variant = 'icon',
  showBackground = false,
}) => {
  // Common SVG Owl Symbol
  const renderOwlSvg = (svgSize: number) => (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 select-none overflow-visible"
    >
      <defs>
        {/* Luxurious Gold Metallic Gradient */}
        <linearGradient id="owlGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7dc88" />
          <stop offset="35%" stopColor="#d4af37" />
          <stop offset="70%" stopColor="#b88b20" />
          <stop offset="100%" stopColor="#dfba4e" />
        </linearGradient>

        {/* Soft Golden Glow Filter */}
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#d4af37" floodOpacity="0.3" />
        </filter>
      </defs>

      <g filter="url(#goldGlow)">
        {/* 1. Outer Background Circle */}
        <circle
          cx="50"
          cy="48"
          r="36"
          stroke="url(#owlGoldGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* 2. Head Circle (Circular Face Boundary) */}
        <circle
          cx="50"
          cy="48"
          r="19"
          stroke="url(#owlGoldGrad)"
          strokeWidth="3.2"
        />

        {/* 3. Outer Wings / Horns (Swooping crescent from ears down to bottom point) */}
        {/* Left Wing / Ear */}
        <path
          d="M 27 34 C 20 46 22 62 50 78 C 36 65 31 50 27 34 Z"
          stroke="url(#owlGoldGrad)"
          strokeWidth="3.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right Wing / Ear */}
        <path
          d="M 73 34 C 80 46 78 62 50 78 C 64 65 69 50 73 34 Z"
          stroke="url(#owlGoldGrad)"
          strokeWidth="3.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />

        {/* 4. Fierce Brow Lines sweeping across the eyes down to beak point */}
        <path
          d="M 27 34 C 33 44 42 52 50 53 C 58 52 67 44 73 34"
          stroke="url(#owlGoldGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* 5. Left Eye (Circular Eye Ring + Inner Iris) */}
        <circle
          cx="43"
          cy="50.5"
          r="6.2"
          stroke="url(#owlGoldGrad)"
          strokeWidth="2.8"
        />
        <circle
          cx="43"
          cy="50.5"
          r="2.8"
          fill="url(#owlGoldGrad)"
        />

        {/* 6. Right Eye (Circular Eye Ring + Inner Iris) */}
        <circle
          cx="57"
          cy="50.5"
          r="6.2"
          stroke="url(#owlGoldGrad)"
          strokeWidth="2.8"
        />
        <circle
          cx="57"
          cy="50.5"
          r="2.8"
          fill="url(#owlGoldGrad)"
        />

        {/* 7. Beak & Downward Bib (V-shaped point down to bottom tip) */}
        <path
          d="M 43 51 L 50 78 L 57 51"
          stroke="url(#owlGoldGrad)"
          strokeWidth="3.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );

  // Icon Variant
  if (variant === 'icon') {
    if (showBackground) {
      return (
        <div
          className={`flex items-center justify-center rounded-2xl bg-[#1b1730] dark:bg-[#120f24] shadow-md border border-amber-500/20 ${className}`}
          style={{ width: size, height: size }}
        >
          {renderOwlSvg(size * 0.78)}
        </div>
      );
    }
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderOwlSvg(size)}
      </div>
    );
  }

  // Horizontal Variant (Emblem + Title)
  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-[#1b1730] dark:bg-[#120f24] flex items-center justify-center shadow-md border border-amber-500/30 shrink-0">
          {renderOwlSvg(28)}
        </div>
        <div className="flex flex-col text-right leading-tight">
          <span className="font-black text-[#d4af37] text-lg font-['Tajawal'] tracking-wide drop-shadow-sm">
            تحدي المهارة
          </span>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-300/80 tracking-wider font-bold">
            دُفـعـة · Dafah
          </span>
        </div>
      </div>
    );
  }

  // Full Vertical Variant (Badge with Gold Owl + Gold Calligraphy)
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Owl Emblem with Navy/Purple Card Background */}
      <div className="relative mb-2">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-b from-[#241f40] to-[#151228] p-3 flex items-center justify-center shadow-2xl border-2 border-amber-500/30 shadow-amber-500/10">
          {renderOwlSvg(size || 72)}
        </div>
      </div>

      {/* Title */}
      <div className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#f7dc88] via-[#d4af37] to-[#aa7f1e] bg-clip-text text-transparent font-['Tajawal'] tracking-tight drop-shadow-sm">
        دُفــعـة
      </div>
      <div className="text-xs sm:text-sm font-serif font-bold text-amber-600/80 dark:text-amber-300/80 tracking-widest uppercase mt-0.5">
        Dafah
      </div>
    </div>
  );
};
