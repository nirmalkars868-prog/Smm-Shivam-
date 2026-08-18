import React, { useState, useEffect } from 'react';
import { Bell, Clock, RefreshCw } from 'lucide-react';
import { SyncLog } from '../../types';

export const SyncLogs: React.FC = () => {
  const [logs, setLogs] = useState<SyncLog[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-500" />
          Service Synchronization Audit Logs
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Complete historical audit log of all provider service imports, price updates, and sync runs.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Log ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Checked</th>
                <th className="py-3.5 px-4 text-emerald-400">New</th>
                <th className="py-3.5 px-4 text-blue-400">Updated</th>
                <th className="py-3.5 px-4 text-amber-400">Inactivated</th>
                <th className="py-3.5 px-4">Summary Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400">{log.id}</td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-bold text-white">{log.providerName}</td>
                  <td className="py-3.5 px-4 text-slate-300">{log.summary.checked}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">+{log.summary.newServices}</td>
                  <td className="py-3.5 px-4 text-blue-400">{log.summary.updatedServices}</td>
                  <td className="py-3.5 px-4 text-amber-400">{log.summary.inactiveServices}</td>
                  <td className="py-3.5 px-4 font-sans text-slate-400 max-w-xs truncate">
                    {log.summary.message}
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
