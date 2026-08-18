import React, { useState, useEffect } from 'react';
import { History, Search, CheckCircle2, Clock } from 'lucide-react';
import { Order } from '../../types';

interface ManageOrdersProps {
  currency: string;
}

export const ManageOrders: React.FC<ManageOrdersProps> = ({ currency }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const fmt = (val: number) => {
    if (currency === 'INR') return `₹${val.toFixed(2)}`;
    return `$${(val / 86).toFixed(2)}`;
  };

  const filtered = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.userName.toLowerCase().includes(search.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-blue-500" />
          Manage Customer Orders & Profit Margins
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          View all customer orders with customer charge, provider cost, and net profit.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by order ID, username, or service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Qty</th>
                <th className="py-3.5 px-4">Charge</th>
                <th className="py-3.5 px-4">Provider Cost</th>
                <th className="py-3.5 px-4 text-emerald-400">Profit</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-300">{ord.id}</td>
                  <td className="py-3.5 px-4 text-slate-400">{ord.userName}</td>
                  <td className="py-3.5 px-4 text-white font-semibold max-w-xs truncate">{ord.serviceName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{ord.quantity.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{fmt(ord.sellingPrice)}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{fmt(ord.providerCost)}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">+{fmt(ord.profit)}</td>
                  <td className="py-3.5 px-4">
                    <select
                      value={ord.status}
                      onChange={(e) => updateStatus(ord.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Partial">Partial</option>
                      <option value="Canceled">Canceled</option>
                    </select>
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
