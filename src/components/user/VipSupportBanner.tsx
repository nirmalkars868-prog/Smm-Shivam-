import React from 'react';
import { MessageSquare, Radio, Send, Youtube, Sparkles } from 'lucide-react';
import { AdminSettings } from '../../types';

interface VipSupportBannerProps {
  settings?: AdminSettings;
}

export const VipSupportBanner: React.FC<VipSupportBannerProps> = ({ settings }) => {
  const chatUrl = settings?.whatsappChatUrl || `https://wa.me/91${settings?.whatsappNumber || '9516862495'}`;
  const channelUrl = settings?.whatsappChannelUrl || 'https://whatsapp.com/channel/smm_shivam_official';
  const telegramUrl = settings?.telegramUrl || 'https://t.me/smm_shivam_official';
  const youtubeUrl = settings?.youtubeUrl || 'https://youtube.com/@smmshivam';
  const youtubeText = settings?.youtubeSubscribersText || '154K Subscribe';

  return (
    <div className="w-full bg-gradient-to-b from-zinc-950 via-zinc-900/90 to-zinc-950 border border-yellow-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-yellow-500/10 space-y-4 text-center relative overflow-hidden">
      {/* Subtle glow background */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-32 bg-yellow-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header Title */}
      <div className="space-y-1 relative z-10">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2 tracking-tight">
          <MessageSquare className="w-6 h-6 text-emerald-400 fill-emerald-400" />
          <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            VIP 24/7 Support
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-lg mx-auto">
          Need priority support? Contact us instantly or follow our official channels.
        </p>
      </div>

      {/* Social Action Buttons Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto pt-1 relative z-10">
        {/* Chat */}
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-4 h-4 fill-black text-black" />
          <span>Chat</span>
        </a>

        {/* WA Channel */}
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer hover:scale-105 active:scale-95"
        >
          <Radio className="w-4 h-4 text-white" />
          <span>WA Channel</span>
        </a>

        {/* Telegram */}
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-sky-500 hover:bg-sky-400 text-black font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer hover:scale-105 active:scale-95"
        >
          <Send className="w-4 h-4 fill-black text-black" />
          <span>Telegram</span>
        </a>

        {/* YouTube */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-3 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer hover:scale-105 active:scale-95"
        >
          <Youtube className="w-4 h-4 text-white fill-white" />
          <span className="truncate">{youtubeText}</span>
        </a>
      </div>

      {/* Subtext info lines */}
      <div className="pt-2 text-[11px] sm:text-xs text-zinc-400 space-y-1 font-medium border-t border-zinc-800/80 relative z-10">
        <p className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>🔥</span>
          <span>Join our</span>
          <strong className="text-emerald-400 font-bold">WhatsApp Channel</strong>
          <span>&</span>
          <strong className="text-sky-400 font-bold">Telegram</strong>
          <span>for instant offers.</span>
        </p>
        <p className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>❤️</span>
          <span>Subscribe to our</span>
          <strong className="text-red-400 font-bold">YouTube Channel ({youtubeText})</strong>
          <span>for tutorials, updates & announcements.</span>
        </p>
      </div>
    </div>
  );
};
