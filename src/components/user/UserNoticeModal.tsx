import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  DollarSign,
  Bell,
} from 'lucide-react';
import { AdminSettings } from '../../types';

interface UserNoticeModalProps {
  settings?: AdminSettings;
  onNavigateTab?: (tab: string) => void;
}

export const UserNoticeModal: React.FC<UserNoticeModalProps> = ({ settings, onNavigateTab }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (settings?.popupNoticeEnabled && settings?.popupNoticeText) {
      // Check if user dismissed this specific notice in this session or today
      const noticeKey = `dismissed_notice_${encodeURIComponent((settings.popupNoticeTitle || '') + (settings.popupNoticeText || ''))}`;
      const isDismissed = sessionStorage.getItem(noticeKey);

      if (!isDismissed) {
        // Show after a brief gentle delay on page/dashboard entry
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [settings?.popupNoticeEnabled, settings?.popupNoticeText, settings?.popupNoticeTitle]);

  if (!isOpen || !settings?.popupNoticeEnabled || !settings?.popupNoticeText) {
    return null;
  }

  const handleClose = () => {
    const noticeKey = `dismissed_notice_${encodeURIComponent((settings.popupNoticeTitle || '') + (settings.popupNoticeText || ''))}`;
    sessionStorage.setItem(noticeKey, 'true');
    setIsOpen(false);
  };

  const noticeType = settings.popupNoticeType || 'offer';

  const getStyleProps = () => {
    switch (noticeType) {
      case 'offer':
        return {
          border: 'border-yellow-500/60',
          glow: 'shadow-yellow-500/20',
          badgeBg: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black',
          badgeText: 'HOT SPECIAL OFFER',
          icon: <Flame className="w-6 h-6 text-yellow-400 animate-bounce" />,
          btnBg: 'bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black',
        };
      case 'warning':
        return {
          border: 'border-amber-500/60',
          glow: 'shadow-amber-500/20',
          badgeBg: 'bg-amber-500 text-black',
          badgeText: 'IMPORTANT NOTICE',
          icon: <AlertCircle className="w-6 h-6 text-amber-400 animate-pulse" />,
          btnBg: 'bg-amber-500 hover:bg-amber-400 text-black',
        };
      case 'alert':
        return {
          border: 'border-rose-500/60',
          glow: 'shadow-rose-500/20',
          badgeBg: 'bg-rose-500 text-white',
          badgeText: 'URGENT UPDATE',
          icon: <AlertCircle className="w-6 h-6 text-rose-400 animate-pulse" />,
          btnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
        };
      case 'info':
      default:
        return {
          border: 'border-cyan-500/60',
          glow: 'shadow-cyan-500/20',
          badgeBg: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black',
          badgeText: 'OFFICIAL ANNOUNCEMENT',
          icon: <Info className="w-6 h-6 text-cyan-400" />,
          btnBg: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black',
        };
    }
  };

  const style = getStyleProps();

  const handleActionClick = () => {
    handleClose();
    const link = settings.popupNoticeButtonLink || '';
    if (link.startsWith('#')) {
      const tabName = link.replace('#', '');
      if (onNavigateTab && tabName) {
        onNavigateTab(tabName);
      }
    } else if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
    } else if (onNavigateTab) {
      onNavigateTab('add-funds');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className={`bg-zinc-950 border ${style.border} rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl ${style.glow} relative overflow-hidden transform animate-in zoom-in-95 duration-300`}
      >
        {/* Decorative corner light */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button Top Right */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Close Announcement"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5 relative z-10">
          {/* Badge & Icon */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
              {style.icon}
            </div>
            <div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${style.badgeBg}`}>
                {style.badgeText}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1 leading-snug">
                {settings.popupNoticeTitle || 'Special Announcement'}
              </h3>
            </div>
          </div>

          {/* Special Notice Message Content */}
          <div className="bg-black/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 text-zinc-200 text-xs sm:text-sm font-medium leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap shadow-inner">
            {settings.popupNoticeText}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {settings.popupNoticeButtonText && (
              <button
                onClick={handleActionClick}
                className={`w-full sm:flex-1 py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider ${style.btnBg} transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95`}
              >
                <span>{settings.popupNoticeButtonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleClose}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
