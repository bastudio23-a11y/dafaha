import React, { useState } from 'react';
import { AlertTriangle, Mail, Copy, Check, X, Send } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: string;
  roomInfo?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  roomInfo,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');

  if (!isOpen) return null;

  const targetEmail = 'Bassamas101@gmail.com';

  const prepareMailtoUrl = () => {
    const subject = encodeURIComponent('بلاغ مشكلة - تحدّي المهارة');
    const bodyText = `مرحبًا، واجهت مشكلة في لعبة تحدّي المهارة:

وصف المشكلة:
${description || '[اكتب وصف المشكلة هنا]'}

متى ظهرت المشكلة؟
${new Date().toLocaleString('ar-SA')}

مكان المشكلة داخل اللعبة:
${currentRole ? `الدور الحالي: ${currentRole}` : 'شاشة البداية'}

كود الغرفة / الحالة:
${roomInfo || 'الغرفة الرئيسية'}

رابط الصفحة:
${window.location.href}

الجهاز / المتصفح:
${navigator.userAgent}
`;

    return `mailto:${targetEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  };

  const handleCopyEmail = () => {
    sound.playClick();
    navigator.clipboard.writeText(targetEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade select-none">
      <div className="bg-[#121629] text-white rounded-3xl w-full max-w-lg shadow-2xl border border-amber-500/30 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">الإبلاغ عن مشكلة</h2>
              <p className="text-xs text-slate-400">
                فريق الدعم سيتعامل مع بلاغك فوراً
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 text-right">
          {/* Target Email display */}
          <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Mail size={16} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">البريد المعتمد للبلاغات:</span>
                <span className="text-sm font-bold text-amber-300 font-mono select-text">
                  {targetEmail}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyEmail}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all active:scale-95 border border-slate-700"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>

          {/* Issue description input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              اكتب تفاصيل المشكلة التي واجهتك (اختياري):
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: واجهت خطأ أثناء التصويت أو مشكلة في عرض الشاشة..."
              className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm focus:border-amber-400 outline-none resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            <a
              href={prepareMailtoUrl()}
              onClick={() => sound.playClick()}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Send size={18} />
              <span>إرسال البلاغ عبر البريد الإلكتروني</span>
            </a>

            <p className="text-[11px] text-slate-400 text-center pt-1">
              سيتم إرفاق بيانات الصفحة وتفاصيل الجهاز تلقائياً للمساعدة في حل المشكلة سريعاً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
