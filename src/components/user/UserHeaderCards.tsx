import React from 'react';
import { BadgeCheck, CreditCard } from 'lucide-react';

interface UserHeaderCardsProps {
  username?: string;
  balance?: number;
  currency?: string;
  exchangeRateINR?: number;
}

export const UserHeaderCards: React.FC<UserHeaderCardsProps> = ({
  username = 'digital_shivam__08',
  balance = 0.0242,
  currency = 'INR',
  exchangeRateINR = 86,
}) => {
  // Format balance string according to currency
  const formattedBalance =
    currency === 'INR'
      ? `₹${balance.toFixed(2)}`
      : `$${(balance / exchangeRateINR).toFixed(2)}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* User Welcome Card */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-yellow-500/20 rounded-3xl p-5 shadow-xl flex items-center gap-4 group hover:border-yellow-500/40 transition-all">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
          <BadgeCheck className="w-8 h-8 text-yellow-400 fill-yellow-500/10" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
            {username}
          </h3>
          <p className="text-xs text-zinc-400 font-bold mt-0.5">Welcome to panel!</p>
        </div>
      </div>

      {/* Account Balance Card */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-yellow-500/20 rounded-3xl p-5 shadow-xl flex items-center gap-4 group hover:border-yellow-500/40 transition-all">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
          <CreditCard className="w-8 h-8 text-yellow-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xl sm:text-2xl font-mono font-black text-white truncate tracking-tight">
            {formattedBalance}
          </h3>
          <p className="text-xs text-zinc-400 font-bold mt-0.5">Account balance</p>
        </div>
      </div>
    </div>
  );
};
