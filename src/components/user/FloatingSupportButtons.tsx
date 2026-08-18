import React from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { AdminSettings } from '../../types';

interface FloatingSupportButtonsProps {
  settings?: AdminSettings;
}

export const FloatingSupportButtons: React.FC<FloatingSupportButtonsProps> = ({ settings }) => {
  const chatUrl = settings?.whatsappChatUrl || `https://wa.me/91${settings?.whatsappNumber || '9516862495'}`;
  const telegramUrl = settings?.telegramUrl || 'https://t.me/smm_shivam_official';

  return (
    <>
      {/* Floating Bottom Left WhatsApp Button */}
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp Support"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full shadow-2xl shadow-emerald-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white/20 cursor-pointer animate-bounce"
      >
        <MessageSquare className="w-7 h-7 fill-black text-black" />
      </a>

      {/* Floating Bottom Right Telegram Button */}
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Telegram Support"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-sky-500 hover:bg-sky-400 text-black rounded-full shadow-2xl shadow-sky-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white/20 cursor-pointer"
      >
        <Send className="w-7 h-7 fill-black text-black" />
      </a>
    </>
  );
};
