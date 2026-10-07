import React, { useState } from 'react';
import { Lock, KeyRound, X, Check, Delete } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');

  if (!isOpen) return null;

  const getStoredPin = (): string => {
    try {
      return localStorage.getItem('host_admin_pin') || '12345';
    } catch {
      return '12345';
    }
  };

  const handleDigit = (digit: string) => {
    sound.playClick();
    setError(false);
    if (isChangingPin) {
      if (newPin.length < 5) {
        setNewPin((prev) => prev + digit);
      }
    } else {
      if (pin.length < 5) {
        const next = pin + digit;
        setPin(next);
        const stored = getStoredPin();
        if (next === '12345' || next === stored) {
          verifyPin(next);
        } else if (next.length === 5) {
          verifyPin(next);
        }
      }
    }
  };

  const handleDelete = () => {
    sound.playClick();
    if (isChangingPin) {
      setNewPin((prev) => prev.slice(0, -1));
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
    setError(false);
  };

  const verifyPin = (entered: string) => {
    const correctPin = getStoredPin();
    if (entered === correctPin || entered === '12345') {
      sound.playVictory();
      try {
        sessionStorage.setItem('host_pin_verified', 'true');
      } catch {
        // ignore
      }
      onSuccess();
    } else {
      sound.playBuzzer();
      setError(true);
      setTimeout(() => {
        setPin('');
      }, 700);
    }
  };

  const handleSaveNewPin = () => {
    if (newPin.length >= 4) {
      sound.playVictory();
      try {
        localStorage.setItem('host_admin_pin', newPin);
        sessionStorage.setItem('host_pin_verified', 'true');
      } catch {
        // ignore
      }
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade select-none">
      <div className="bg-[#121629] text-white rounded-3xl w-full max-w-sm shadow-2xl border-2 border-slate-700/80 overflow-hidden text-center p-6">
        {/* Header close button */}
        <div className="flex justify-end -mt-2 -mr-2 mb-2">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-3xl mx-auto mb-3 bg-gradient-to-tr from-[#4eaab8] to-[#2fa3bf] text-white flex items-center justify-center shadow-lg shadow-[#4eaab8]/25">
          <Lock size={30} />
        </div>

        <h3 className="text-xl font-black mb-6">
          {isChangingPin ? 'تعيين رمز سري جديد' : 'شاشة الأدمن محمية برقم سري'}
        </h3>

        {/* PIN Indicators (5 dots for 12345) */}
        <div className={`flex justify-center gap-3 mb-6 ${error ? 'animate-bounce text-red-500' : ''}`}>
          {[0, 1, 2, 3, 4].map((idx) => {
            const currentStr = isChangingPin ? newPin : pin;
            const filled = currentStr.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-red-500 scale-110'
                    : filled
                    ? 'bg-[#4eaab8] scale-125 shadow-md shadow-[#4eaab8]/50'
                    : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-400 mb-4 animate-shake">
            الرمز السري غير صحيح! حاول مجدداً
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="w-16 h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xl font-bold transition-all flex items-center justify-center border border-slate-700 shadow-sm"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={() => {
              sound.playClick();
              setIsChangingPin(!isChangingPin);
              setPin('');
              setNewPin('');
              setError(false);
            }}
            title="تغيير الرمز"
            className="w-16 h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-400 font-bold flex items-center justify-center"
          >
            <KeyRound size={18} />
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="w-16 h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xl font-bold transition-all flex items-center justify-center border border-slate-700 shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 active:scale-95 text-slate-400 flex items-center justify-center"
          >
            <Delete size={20} />
          </button>
        </div>

        {isChangingPin && (
          <button
            onClick={handleSaveNewPin}
            disabled={newPin.length !== 5}
            className="w-full py-2.5 px-4 rounded-xl bg-[#4eaab8] disabled:opacity-40 text-white font-bold text-sm shadow-md"
          >
            حفظ الرمز السري الجديد
          </button>
        )}
      </div>
    </div>
  );
};
