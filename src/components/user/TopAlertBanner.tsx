import React, { useState } from 'react';
import { Sparkles, Megaphone, X, ArrowRight, Flame } from 'lucide-react';
import { AdminSettings } from '../../types';

interface TopAlertBannerProps {
  settings?: AdminSettings;
  onNavigateTab?: (tab: string) => void;
}

export const TopAlertBanner: React.FC<TopAlertBannerProps> = ({ settings, onNavigateTab }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !settings?.topAlertBarEnabled || !settings?.topAlertBarText) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-b border-yellow-500/30 text-yellow-300 px-4 py-2 text-xs font-semibold relative overflow-hidden backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex-shrink-0 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Megaphone className="w-3 h-3" />
            <span>Notice</span>
          </span>
          <p className="truncate text-zinc-200 text-xs font-medium">
            {settings.topAlertBarText}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-yellow-500/20 rounded-lg text-zinc-400 hover:text-yellow-400 transition-colors cursor-pointer"
            title="Dismiss Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
