import React from 'react';
import { Bell, Sparkles, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

export const Updates: React.FC = () => {
  const updatesList = [
    {
      id: '1',
      date: '08 Aug 2026',
      service: 'Instagram Real Followers [30 Days Refill]',
      type: 'rate_decrease',
      oldRate: '$0.65',
      newRate: '$0.54',
      note: 'Rate reduced due to SMMDIP provider rate optimization.',
    },
    {
      id: '2',
      date: '07 Aug 2026',
      service: 'YouTube High Retention Views',
      type: 'speed_up',
      note: 'Speed increased to 100K/day. Monetization safe.',
    },
    {
      id: '3',
      date: '05 Aug 2026',
      service: 'TikTok Viral Video Likes',
      type: 'new_service',
      note: 'New instant delivery service added under TikTok Services category.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-500" />
          Service Updates & Feed
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Real-time updates on service rate changes, speed improvements, and new provider additions.
        </p>
      </div>

      <div className="space-y-3">
        {updatesList.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">{item.date}</span>
                {item.type === 'rate_decrease' && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Price Drop
                  </span>
                )}
                {item.type === 'new_service' && (
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> New Service
                  </span>
                )}
                {item.type === 'speed_up' && (
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Speed Boost
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white">{item.service}</h4>
              <p className="text-xs text-slate-400">{item.note}</p>
            </div>

            {item.oldRate && item.newRate && (
              <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-right sm:text-left shrink-0">
                <span className="text-[10px] text-slate-500 block">Rate / 1K</span>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="line-through text-slate-500">{item.oldRate}</span>
                  <span className="text-emerald-400 font-bold">{item.newRate}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
