import React, { useState } from 'react';
import { Eye, Lock, Sparkles, Volume2 } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface SecretCardProps {
  skill: string;
  sideColor?: string;
}

export const SecretCard: React.FC<SecretCardProps> = ({ skill, sideColor = '#4eaab8' }) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const handlePressStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isRevealed) {
      sound.playReveal();
    }
    setIsRevealed(true);
  };

  const handlePressEnd = () => {
    setIsRevealed(false);
  };

  return (
    <div className="w-full max-w-sm mx-auto select-none my-4">
      <div
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full min-h-[220px] rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-xl relative overflow-hidden active:scale-95 touch-none ${
          isRevealed
            ? 'text-white border-4 shadow-2xl scale-[1.02]'
            : 'border-3 border-dashed hover:shadow-2xl'
        }`}
        style={{
          borderColor: sideColor,
          backgroundColor: isRevealed ? sideColor : 'transparent',
          backgroundImage: isRevealed
            ? 'none'
            : `repeating-linear-gradient(45deg, transparent, transparent 12px, ${sideColor}15 12px, ${sideColor}15 24px)`,
        }}
      >
        {isRevealed ? (
          <div className="text-center animate-pop">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-2">
              <Sparkles size={24} className="text-white" />
            </div>
            <div className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
              مهارتك السرّية هي:
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white px-2 py-1 drop-shadow-md">
              {skill}
            </div>
            <div className="mt-4 text-xs font-medium text-white/90 bg-black/20 px-3 py-1.5 rounded-full inline-block">
              ⚠️ اشرح دون ذكر اسم المهارة
            </div>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center gap-3" style={{ color: sideColor }}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-md animate-bounce"
              style={{ backgroundColor: `${sideColor}20` }}
            >
              <Eye size={34} />
            </div>
            <div className="text-2xl font-black">اضغط وامسك للكشف</div>
            <p className="text-xs opacity-75 max-w-[200px]">
              لا ترفع إصبعك حتى تقرأ الكلمة، وخلك حريص محد يشوفها جنبك!
            </p>
          </div>
        )}

        {/* Bottom subtle hint */}
        <div className="absolute bottom-2 text-[11px] opacity-60 flex items-center gap-1">
          <Lock size={12} />
          <span>سرّية تماماً بينك وبين اللعبة</span>
        </div>
      </div>
    </div>
  );
};
