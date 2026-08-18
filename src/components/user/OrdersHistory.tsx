import React, { useState } from 'react';
import { Order } from '../../types';
import { History, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

interface OrdersHistoryProps {
  orders: Order[];
  currency: string;
}

export const OrdersHistory: React.FC<OrdersHistoryProps> = ({ orders, currency }) => {
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [refillingId, setRefillingId] = useState<string | null>(null);

  const statuses = ['All', 'Pending', 'In Progress', 'Processing', 'Completed', 'Partial', 'Canceled'];

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      o.link.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleRefill = async (orderId: string) => {
    setRefillingId(orderId);
    try {
      await fetch(`/api/orders/${orderId}/refill`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      setRefillingId(null);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Processing':
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Canceled':
      case 'Partial':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-blue-500" />
            Orders History
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track real-time delivery status, remains, and request automated refills.
          </p>
        </div>
      </div>

      {/* Status Tabs and Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                filterStatus === st
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative md:w-64 ml-auto">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search order ID or link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Link</th>
                <th className="py-3.5 px-4">Qty</th>
                <th className="py-3.5 px-4">Charge</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Refill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => {
                  const priceDisp =
                    currency === 'INR'
                      ? `₹${ord.sellingPrice.toFixed(2)}`
                      : `$${(ord.sellingPrice / 86).toFixed(4)}`;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-300 font-bold">
                        {ord.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(ord.createdAt).toLocaleDateString()}{' '}
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-200 font-semibold truncate">{ord.serviceName}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <a
                          href={ord.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 truncate font-mono text-[11px]"
                        >
                          <span className="truncate">{ord.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{ord.quantity.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{priceDisp}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(ord.status)}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRefill(ord.id)}
                          disabled={ord.refillStatus === 'Requested' || refillingId === ord.id}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 ml-auto disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${refillingId === ord.id ? 'animate-spin' : ''}`} />
                          <span>{ord.refillStatus === 'Requested' ? 'Requested' : 'Refill'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 italic">
                    No orders found in history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
