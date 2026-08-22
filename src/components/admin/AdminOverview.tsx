import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Zap,
  DollarSign,
  TrendingUp,
  Layers,
  Clock,
  RefreshCw,
  Users,
  CheckCircle2,
  PieChart,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Order, User, Service, Provider } from '../../types';
import { rtdb, ref, onValue } from '../../lib/firebaseClient';

function ensureArray<T = any>(data: any): T[] {
  if (!data) return [];
  let arr: T[] = [];
  if (Array.isArray(data)) {
    arr = data.filter(Boolean);
  } else if (typeof data === 'object') {
    arr = Object.values(data).filter(Boolean) as T[];
  }
  const map = new Map<string, T>();
  const withoutId: T[] = [];
  for (const item of arr) {
    if (item && typeof item === 'object' && 'id' in item && (item as any).id) {
      map.set(String((item as any).id), item);
    } else {
      withoutId.push(item);
    }
  }
  return Array.from(map.values()).concat(withoutId);
}

interface AdminOverviewProps {
  currency: string;
}

type TimeframeOption = 'today' | 'yesterday' | '7d' | '30d' | 'all';

// Helper function to check if a date string falls inside the chosen timeframe
function isDateInTimeframe(dateStr: string | undefined, timeframe: TimeframeOption): boolean {
  if (timeframe === 'all') return true;
  if (!dateStr) return false;

  const itemDate = new Date(dateStr);
  if (isNaN(itemDate.getTime())) return false;

  const now = new Date();

  if (timeframe === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return itemDate >= startOfToday;
  }

  if (timeframe === 'yesterday') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    return itemDate >= startOfYesterday && itemDate < startOfToday;
  }

  if (timeframe === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return itemDate >= sevenDaysAgo;
  }

  if (timeframe === '30d') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return itemDate >= thirtyDaysAgo;
  }

  return true;
}

// Hook to animate numbers on load or refresh
function useAnimatedNumber(targetValue: number, duration: number = 800) {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const startRef = useRef<number | null>(null);
  const prevValRef = useRef<number>(0);

  useEffect(() => {
    let animationFrameId: number;
    startRef.current = null;
    const startVal = prevValRef.current;
    const diff = targetValue - startVal;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const nextVal = startVal + diff * easedProgress;
      setCurrentValue(nextVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        prevValRef.current = targetValue;
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  return currentValue;
}

// Stat Card Component with animated ticker
const StatCard: React.FC<{
  title: string;
  rawValue: number;
  currency: string;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  subtext: string;
  icon: any;
  accentColor: 'yellow' | 'emerald' | 'rose' | 'sky' | 'amber';
  badgeText?: string;
}> = ({ title, rawValue, currency, isCurrency = true, prefix = '', suffix = '', subtext, icon: Icon, accentColor, badgeText }) => {
  const animatedVal = useAnimatedNumber(rawValue, 600);

  const formatValue = (val: number) => {
    if (isCurrency) {
      if (currency === 'INR') {
        return `₹${val.toFixed(2)}`;
      }
      return `$${(val / 86).toFixed(2)}`;
    }
    return Math.floor(val).toLocaleString();
  };

  const colorStyles = {
    yellow: {
      border: 'border-yellow-500/30 hover:border-yellow-500/60',
      text: 'text-yellow-400',
      bgIcon: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      glow: 'shadow-yellow-500/5',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      text: 'text-emerald-400',
      bgIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      glow: 'shadow-emerald-500/5',
    },
    rose: {
      border: 'border-rose-500/30 hover:border-rose-500/60',
      text: 'text-rose-400',
      bgIcon: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      glow: 'shadow-rose-500/5',
    },
    sky: {
      border: 'border-sky-500/30 hover:border-sky-500/60',
      text: 'text-sky-400',
      bgIcon: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      glow: 'shadow-sky-500/5',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/60',
      text: 'text-amber-400',
      bgIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      glow: 'shadow-amber-500/5',
    },
  }[accentColor];

  return (
    <div className={`bg-gradient-to-b from-zinc-950 to-zinc-900 border ${colorStyles.border} rounded-3xl p-5 shadow-2xl ${colorStyles.glow} transition-all space-y-3 relative overflow-hidden group`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">{title}</span>
        <div className={`p-2 rounded-xl border ${colorStyles.bgIcon}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <div className={`text-2xl sm:text-3xl font-mono font-black ${colorStyles.text} tracking-tight`}>
          {prefix}{formatValue(animatedVal)}{suffix}
        </div>
        <p className="text-[11px] text-zinc-400 font-medium mt-1">{subtext}</p>
      </div>

      {badgeText && (
        <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-bold">
          <span className="text-zinc-500 uppercase">Period Filter</span>
          <span className={`px-2 py-0.5 rounded-full ${colorStyles.bgIcon} uppercase font-extrabold`}>
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
};

export const AdminOverview: React.FC<AdminOverviewProps> = ({ currency }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('today');

  useEffect(() => {
    fetchData();

    if (rtdb) {
      const storeRef = ref(rtdb, 'smm_store');
      const unsubscribeStore = onValue(storeRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val) {
            if (val.users) setUsers(ensureArray(val.users));
            if (val.orders) setOrders(ensureArray(val.orders));
            if (val.services) setServices(ensureArray(val.services));
            if (val.providers) setProviders(ensureArray(val.providers));
            setLoading(false);
          }
        }
      }, (err) => {
        console.warn('AdminOverview RTDB onValue warning:', err);
      });

      return () => {
        unsubscribeStore();
      };
    }
  }, [refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUsers, resOrders, resServices] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/services'),
      ]);
      const dataUsers = await resUsers.json();
      const dataOrders = await resOrders.json();
      const dataServices = await resServices.json();

      setUsers(dataUsers.users || []);
      setOrders(dataOrders.orders || []);
      setServices(dataServices.services || []);
      setProviders(dataServices.providers || []);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val: number) => {
    if (currency === 'INR') {
      return `₹${val.toFixed(2)}`;
    }
    return `$${(val / 86).toFixed(2)}`;
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Compute Timeframe-Filtered Data
  const filteredUsers = useMemo(() => {
    const deduped: User[] = [];
    const seen = new Set<string>();
    for (const u of users) {
      if (!u) continue;
      const key = u.id ? String(u.id).trim() : (u.email ? String(u.email).toLowerCase().trim() : '');
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      deduped.push(u);
    }
    return deduped.filter((u) => isDateInTimeframe(u.createdAt, timeframe));
  }, [users, timeframe]);

  const filteredOrders = useMemo(() => {
    const deduped: Order[] = [];
    const seen = new Set<string>();
    for (const o of orders) {
      if (!o) continue;
      const key = o.id ? String(o.id).trim() : `ord-${deduped.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(o);
    }
    return deduped.filter((o) => isDateInTimeframe(o.createdAt, timeframe));
  }, [orders, timeframe]);

  // Financial calculations for the selected timeframe
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.sellingPrice || 0), 0);
  }, [filteredOrders]);

  const totalCost = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.providerCost || 0), 0);
  }, [filteredOrders]);

  const totalProfit = useMemo(() => {
    return Math.max(0, totalRevenue - totalCost);
  }, [totalRevenue, totalCost]);

  const costMarkupPercent = useMemo(() => {
    return totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : '20.0';
  }, [totalProfit, totalCost]);

  const revenueMarginPercent = useMemo(() => {
    return totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  }, [totalProfit, totalRevenue]);

  const timeframeLabels: Record<TimeframeOption, string> = {
    today: 'Today (00:00 - Now)',
    yesterday: 'Yesterday',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    all: 'All Time (Lifetime)',
  };

  if (loading && users.length === 0 && orders.length === 0) {
    return (
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-12 text-center space-y-4 shadow-2xl max-w-4xl mx-auto my-8">
        <div className="w-12 h-12 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin mx-auto" />
        <h3 className="text-lg font-black text-yellow-400 uppercase tracking-wider">
          Loading Real-Time Analytics...
        </h3>
        <p className="text-xs text-zinc-400">Syncing registered users, live orders & financial margin data</p>
      </div>
    );
  }

  return (
    <div key={refreshKey} className="space-y-6 max-w-7xl mx-auto">
      {/* Dashboard Top Header Bar */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-2xl sm:text-3xl font-black text-yellow-400 flex items-center gap-2 tracking-tight">
              <span>Admin Overview & Live Analytics</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium">
            Real registered user counts, live order metrics, provider costs & dynamic time filtering.
          </p>
        </div>

        {/* Timeframe & Animated Refresh Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-black border border-zinc-800 rounded-2xl p-1 flex items-center gap-1 text-xs font-bold shadow-inner">
            {(['today', 'yesterday', '7d', '30d', 'all'] as const).map((tf) => {
              const label =
                tf === 'today'
                  ? 'Today'
                  : tf === 'yesterday'
                  ? 'Yesterday'
                  : tf === '7d'
                  ? '7 Days'
                  : tf === '30d'
                  ? '30 Days'
                  : 'All Time';
              return (
                <button
                  key={tf}
                  id={`filter-${tf}-btn`}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-xl uppercase font-black text-[11px] transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-100'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleRefresh}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-yellow-400 font-black px-3.5 py-2.5 rounded-2xl shadow-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95"
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Timeframe Notice Pill Banner */}
      <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold">
          <Calendar className="w-4 h-4 text-yellow-400 shrink-0" />
          <span>
            Selected Period:{' '}
            <strong className="text-white uppercase font-black tracking-wide">
              {timeframeLabels[timeframe]}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono font-bold text-zinc-300">
          <span>
            New Users: <strong className="text-yellow-400">{filteredUsers.length}</strong> (Total All-Time: {users.length})
          </span>
          <span>
            Orders: <strong className="text-yellow-400">{filteredOrders.length}</strong> (Total All-Time: {orders.length})
          </span>
        </div>
      </div>

      {/* KPI Ticker Cards Grid with Animated Live Counters for the selected timeframe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title={timeframe === 'all' ? 'Total Registered Users' : 'Users Registered'}
          rawValue={timeframe === 'all' ? users.length : filteredUsers.length}
          currency={currency}
          isCurrency={false}
          subtext={
            timeframe === 'all'
              ? `${users.length} total panel registered users`
              : `${filteredUsers.length} joined in ${timeframeLabels[timeframe]} (Total: ${users.length})`
          }
          icon={Users}
          accentColor="amber"
          badgeText={timeframe.toUpperCase()}
        />

        <StatCard
          title="Customer Revenue"
          rawValue={totalRevenue}
          currency={currency}
          subtext={`Gross sales in ${timeframeLabels[timeframe]}`}
          icon={DollarSign}
          accentColor="yellow"
          badgeText={timeframe.toUpperCase()}
        />

        <StatCard
          title="Provider API Cost"
          rawValue={totalCost}
          currency={currency}
          subtext={`Net API cost paid for ${filteredOrders.length} orders`}
          icon={Clock}
          accentColor="rose"
          badgeText={timeframe.toUpperCase()}
        />

        <StatCard
          title="Net Admin Profit"
          rawValue={totalProfit}
          currency={currency}
          subtext={`Profit Margin: +${costMarkupPercent}% (Rev Share: ${revenueMarginPercent}%)`}
          icon={TrendingUp}
          accentColor="emerald"
          badgeText={`PROFIT: +${costMarkupPercent}%`}
        />

        <StatCard
          title="Orders Processed"
          rawValue={filteredOrders.length}
          currency={currency}
          isCurrency={false}
          subtext={`${filteredOrders.length} orders in ${timeframeLabels[timeframe]} (Total: ${orders.length})`}
          icon={Layers}
          accentColor="sky"
          badgeText={timeframe.toUpperCase()}
        />
      </div>

      {/* Visual Revenue vs. Cost vs. Profit Breakdown Bar */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2 text-yellow-400 font-black text-sm uppercase">
            <PieChart className="w-4 h-4 text-yellow-400" />
            <span>Financial Distribution for {timeframeLabels[timeframe]}</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            Margin Markup: +{costMarkupPercent}%
          </span>
        </div>

        {/* Visual Progress Bar Stack */}
        <div className="space-y-2">
          <div className="h-5 w-full bg-black rounded-full overflow-hidden flex border border-zinc-800 p-0.5">
            <div
              style={{ width: `${totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 50}%` }}
              className="bg-rose-500 h-full rounded-l-full transition-all duration-700 flex items-center justify-center text-[9px] font-black text-white"
            >
              Cost
            </div>
            <div
              style={{ width: `${totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 50}%` }}
              className="bg-emerald-500 h-full rounded-r-full transition-all duration-700 flex items-center justify-center text-[9px] font-black text-black"
            >
              Profit
            </div>
          </div>
          <div className="flex justify-between text-xs text-zinc-400 font-bold px-1">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Provider Cost: {fmt(totalCost)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Net Profit: +{fmt(totalProfit)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Orders Table Breakdown for selected timeframe */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            <span>Orders Log for {timeframeLabels[timeframe]}</span>
          </h3>
          <span className="text-xs font-bold text-zinc-400">
            Showing {Math.min(filteredOrders.length, 15)} of {filteredOrders.length} orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black border-b border-zinc-800 font-black text-yellow-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Qty</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Provider Cost</th>
                <th className="py-3.5 px-4 text-emerald-400">Profit</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500 font-bold">
                    <Sparkles className="w-6 h-6 text-yellow-500/30 mx-auto mb-1.5" />
                    No orders placed in this period ({timeframeLabels[timeframe]}).
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(0, 15).map((ord, idx) => {
                  const dateStr = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';
                  return (
                    <tr key={ord.id ? `${ord.id}-${idx}` : `ord-${idx}`} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-yellow-400">{ord.id}</td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px] whitespace-nowrap">{dateStr}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{ord.userName}</td>
                      <td className="py-3.5 px-4 text-zinc-300 font-medium max-w-xs truncate">{ord.serviceName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-400">{ord.quantity.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-white">{fmt(ord.sellingPrice)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-400">{fmt(ord.providerCost)}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-400">+{fmt(ord.profit)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
