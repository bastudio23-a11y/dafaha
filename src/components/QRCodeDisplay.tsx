import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface QRCodeDisplayProps {
  url: string;
  title: string;
  color?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url, title, color = '#4eaab8' }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0b0f2a',
        light: '#ffffff',
      },
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.error('QR code error', err));
  }, [url]);

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      sound.playClick();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="bg-white dark:bg-[#151a40] rounded-2xl p-4 shadow-lg border-2 flex flex-col items-center text-center transition-all hover:-translate-y-1"
      style={{ borderColor: color }}
    >
      <h3 className="font-bold text-lg mb-2 text-[#0b0f2a] dark:text-white flex items-center gap-2">
        {title}
      </h3>

      <div className="bg-white p-3 rounded-xl shadow-inner border border-slate-200">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={title}
            className="w-36 h-36 object-contain rounded-lg"
          />
        ) : (
          <div className="w-36 h-36 flex items-center justify-center text-sm text-slate-400">
            جاري التوليد...
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 w-full">
        <button
          onClick={copyUrl}
          className="flex-1 py-2 px-3 text-sm rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-white shadow-sm active:scale-95"
          style={{ background: color }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
        </button>
      </div>
    </div>
  );
};
