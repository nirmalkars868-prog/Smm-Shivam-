import React, { useEffect, useState, useRef } from 'react';
import {
  Zap,
  DollarSign,
  TrendingUp,
  Layers,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Users,
  Activity,
  CheckCircle2,
  PieChart,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { Order } from '../../types';
import { rtdb, ref, onValue } from '../../lib/firebaseClient';

function ensureArray<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  if (typeof data === 'object') {
    return Object.values(data).filter(Boolean) as T[];
  }
  return [];
}

interface AdminOverviewProps {
  currency: string;
}

// Hook to animate numbers on load or refresh
function useAnimatedNumber(targetValue: number, duration: number = 1200) {
  const [currentValue, setCurrentValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      // Easing function: easeOutExpo
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrentValue(easedProgress * targetValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
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
  const animatedVal = useAnimatedNumber(rawValue, 1400);

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
      bar: 'bg-yellow-400',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      text: 'text-emerald-400',
      bgIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      glow: 'shadow-emerald-500/5',
      bar: 'bg-emerald-400',
    },
    rose: {
      border: 'border-rose-500/30 hover:border-rose-500/60',
      text: 'text-rose-400',
      bgIcon: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      glow: 'shadow-rose-500/5',
      bar: 'bg-rose-400',
    },
    sky: {
      border: 'border-sky-500/30 hover:border-sky-500/60',
      text: 'text-sky-400',
      bgIcon: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      glow: 'shadow-sky-500/5',
      bar: 'bg-sky-400',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/60',
      text: 'text-amber-400',
      bgIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      glow: 'shadow-amber-500/5',
      bar: 'bg-amber-400',
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
          <span className="text-zinc-500 uppercase">Performance</span>
          <span className={`px-2 py-0.5 rounded-full ${colorStyles.bgIcon} uppercase font-extrabold`}>
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
};

export const AdminOverview: React.FC<AdminOverviewProps> = ({ currency }) => {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('all');

  useEffect(() => {
    fetchStats();

    if (rtdb) {
      const storeRef = ref(rtdb, 'smm_store');
      const unsubscribeStore = onValue(storeRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val) {
            const usersList = ensureArray(val.users);
            const ordersList = ensureArray(val.orders);
            const servicesList = ensureArray(val.services);
            const providersList = ensureArray(val.providers);

            const totalOrders = ordersList.length;
            const totalRevenue = ordersList.reduce((sum: number, o: any) => sum + (o.sellingPrice || 0), 0);
            const totalCost = ordersList.reduce((sum: number, o: any) => sum + (o.providerCost || 0), 0);
            const totalProfit = totalRevenue - totalCost;
            const activeServices = servicesList.filter((s: any) => s.status === 'active').length;
            const totalServices = servicesList.length;
            const settingsObj = val.settings || {};
            const configuredProfitMargin = settingsObj.defaultProfitMarginPercentage || 60;
            const costMarkupPercentage = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : configuredProfitMargin;

            setStats({
              totalOrders,
              totalRevenue: Number(totalRevenue.toFixed(2)),
              totalCost: Number(totalCost.toFixed(2)),
              totalProfit: Number(totalProfit.toFixed(2)),
              activeServices,
              totalServices,
              configuredProfitMargin,
              costMarkupPercentage,
              totalUsers: usersList.length,
              activeProviders: providersList.filter((p: any) => p.status === 'active').length,
            });
            setOrders(ordersList);
            setLoading(false);
          }
        }
      }, (err) => {
        console.warn('AdminOverview RTDB onValue warning:', err);
      });

      const usersRef = ref(rtdb, 'users');
      const unsubscribeUsers = onValue(usersRef, (usersSnap) => {
        if (usersSnap.exists()) {
          const uVal = usersSnap.val();
          if (uVal) {
            const rootUsers = ensureArray(uVal);
            setStats((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                totalUsers: Math.max(prev.totalUsers || 0, rootUsers.length),
              };
            });
          }
        }
      });

      return () => {
        unsubscribeStore();
        unsubscribeUsers();
      };
    }
  }, [refreshKey]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [resStats, resOrders] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/orders'),
      ]);
      const dataStats = await resStats.json();
      const dataOrders = await resOrders.json();

      if (dataStats && dataStats.stats) {
        setStats(dataStats.stats);
      } else {
        setStats({
          totalOrders: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          activeServices: 0,
          totalServices: 0,
          configuredProfitMargin: 60,
          costMarkupPercentage: 60,
          totalUsers: 0,
          activeProviders: 0,
        });
      }
      setOrders((dataOrders && dataOrders.orders) || []);
    } catch (e) {
      console.error('Error fetching admin stats:', e);
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        activeServices: 0,
        totalServices: 0,
        configuredProfitMargin: 60,
        costMarkupPercentage: 60,
        totalUsers: 0,
        activeProviders: 0,
      });
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

  if (loading || !stats) {
    return (
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-12 text-center space-y-4 shadow-2xl max-w-4xl mx-auto my-8">
        <div className="w-12 h-12 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin mx-auto" />
        <h3 className="text-lg font-black text-yellow-400 uppercase tracking-wider">
          Initializing Divine Profit Engine...
        </h3>
        <p className="text-xs text-zinc-400">Syncing live provider margins, orders & sales analytics</p>
      </div>
    );
  }

  const revenue = stats.totalRevenue || 0;
  const cost = stats.totalCost || 0;
  const profit = stats.totalProfit || 0;
  const configuredMargin = stats.configuredProfitMargin || 60;
  const costMarkupPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : configuredMargin.toString();
  const revenueMarginPercent = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';

  return (
    <div key={refreshKey} className="space-y-6 max-w-7xl mx-auto">
      {/* Dashboard Top Header Bar */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-2xl sm:text-3xl font-black text-yellow-400 flex items-center gap-2 tracking-tight">
              <span>Admin Overview & Financial Analytics</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium">
            Live profit calculation, automated provider cost breakdown, and real-time ticker statistics.
          </p>
        </div>

        {/* Timeframe & Animated Refresh Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-black border border-zinc-800 rounded-2xl p-1 flex items-center gap-1 text-xs font-bold">
            {(['today', '7d', '30d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-xl uppercase transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-yellow-500 text-black font-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-4 py-2.5 rounded-2xl shadow-xl shadow-yellow-500/20 transition-all flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-black animate-spin" style={{ animationDuration: '3s' }} />
            <span>Recount Analytics</span>
          </button>
        </div>
      </div>

      {/* KPI Ticker Cards Grid with Animated Live Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Registered Users"
          rawValue={stats.totalUsers || 0}
          currency={currency}
          isCurrency={false}
          subtext="Total registered panel users"
          icon={Users}
          accentColor="amber"
          badgeText="TOTAL USERS"
        />

        <StatCard
          title="Total Customer Revenue"
          rawValue={revenue}
          currency={currency}
          subtext="Gross sales across all user orders"
          icon={DollarSign}
          accentColor="yellow"
          badgeText="GROSS SALES"
        />

        <StatCard
          title="Provider API Cost"
          rawValue={cost}
          currency={currency}
          subtext="Net cost paid to connected SMM providers"
          icon={Clock}
          accentColor="rose"
          badgeText="NET OUTFLOW"
        />

        <StatCard
          title="Net Admin Profit"
          rawValue={profit}
          currency={currency}
          subtext={`Configured Margin: +${costMarkupPercent}% (Rev Share: ${revenueMarginPercent}%)`}
          icon={TrendingUp}
          accentColor="emerald"
          badgeText={`MARGIN: +${costMarkupPercent}%`}
        />

        <StatCard
          title="Total Orders Processed"
          rawValue={stats.totalOrders || 0}
          currency={currency}
          isCurrency={false}
          subtext={`${stats.activeServices || 0} active imported services`}
          icon={Layers}
          accentColor="sky"
          badgeText="LIVE ORDERS"
        />
      </div>

      {/* Visual Revenue vs. Cost vs. Profit Breakdown Bar */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2 text-yellow-400 font-black text-sm uppercase">
            <PieChart className="w-4 h-4 text-yellow-400" />
            <span>Revenue vs Provider Cost vs Net Profit Distribution</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            Admin Profit Margin: +{costMarkupPercent}% Markup
          </span>
        </div>

        {/* Visual Progress Bar Stack */}
        <div className="space-y-2">
          <div className="h-5 w-full bg-black rounded-full overflow-hidden flex border border-zinc-800 p-0.5">
            <div
              style={{ width: `${revenue > 0 ? (cost / revenue) * 100 : 50}%` }}
              className="bg-rose-500 h-full rounded-l-full transition-all duration-1000 flex items-center justify-center text-[9px] font-black text-white"
            >
              Cost
            </div>
            <div
              style={{ width: `${revenue > 0 ? (profit / revenue) * 100 : 50}%` }}
              className="bg-emerald-500 h-full rounded-r-full transition-all duration-1000 flex items-center justify-center text-[9px] font-black text-black"
            >
              Profit
            </div>
          </div>
          <div className="flex justify-between text-xs text-zinc-400 font-bold px-1">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Provider Cost: {fmt(cost)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Net Profit: +{fmt(profit)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Orders Table Breakdown */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            <span>Recent Orders Profit & Cost Execution Log</span>
          </h3>
          <span className="text-xs font-bold text-zinc-400">Showing last 10 transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black border-b border-zinc-800 font-black text-yellow-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Qty</th>
                <th className="py-3.5 px-4">Customer Price</th>
                <th className="py-3.5 px-4">Provider Cost</th>
                <th className="py-3.5 px-4 text-emerald-400">Profit Margin</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
              {orders.slice(0, 10).map((ord) => (
                <tr key={ord.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-black text-yellow-400">{ord.id}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
