import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, XCircle, RefreshCw, AlertCircle, Clock, Search, Copy, Check, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { DepositRequest } from '../../types';
import { rtdb, ref, onValue, set } from '../../lib/firebaseClient';

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

export const ManageDeposits: React.FC = () => {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();

    if (rtdb) {
      const depRef = ref(rtdb, 'smm_store/depositRequests');
      const unsubscribe = onValue(depRef, (snap) => {
        if (snap.exists()) {
          const list = ensureArray<DepositRequest>(snap.val());
          setDeposits(list);
          setLoading(false);
        }
      }, (err) => {
        console.warn('ManageDeposits RTDB listener warning:', err);
      });
      return () => unsubscribe();
    }
  }, []);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/deposits');
      const data = await res.json();
      if (data.deposits) {
        setDeposits(data.deposits);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deposit: DepositRequest) => {
    setActionMsg(null);
    setProcessingId(deposit.id);
    try {
      const res = await fetch(`/api/admin/deposits/${deposit.id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (rtdb) {
          try {
            const updatedDep = { ...deposit, status: 'Approved', updatedAt: new Date().toISOString() };
            await set(ref(rtdb, `smm_store/depositRequests/${deposit.id}`), updatedDep);
            await set(ref(rtdb, `depositRequests/${deposit.id}`), updatedDep);
            if (data.user) {
              await set(ref(rtdb, `users/${data.user.id}`), data.user);
              await set(ref(rtdb, `smm_store/users/${data.user.id}`), data.user);
            }
          } catch (rtdbErr: any) {
            console.warn('Optional client RTDB write warning:', rtdbErr?.message || rtdbErr);
          }
        }
        setActionMsg({
          type: 'success',
          text: `Fund Request #${deposit.id} COMPLETED successfully! ₹${deposit.amount} credited to ${deposit.username}.`,
        });
        fetchDeposits();
      } else {
        throw new Error(data.error || 'Failed to approve deposit');
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Error completing deposit request' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (deposit: DepositRequest) => {
    setActionMsg(null);
    setProcessingId(deposit.id);
    try {
      const res = await fetch(`/api/admin/deposits/${deposit.id}/reject`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (rtdb) {
          try {
            const updatedDep = { ...deposit, status: 'Rejected', updatedAt: new Date().toISOString() };
            await set(ref(rtdb, `smm_store/depositRequests/${deposit.id}`), updatedDep);
            await set(ref(rtdb, `depositRequests/${deposit.id}`), updatedDep);
          } catch (rtdbErr: any) {
            console.warn('Optional client RTDB write warning:', rtdbErr?.message || rtdbErr);
          }
        }
        setActionMsg({ type: 'success', text: `Fund Request #${deposit.id} REJECTED.` });
        fetchDeposits();
      } else {
        throw new Error(data.error || 'Failed to reject deposit');
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Error rejecting deposit request' });
    } finally {
      setProcessingId(null);
    }
  };

  const copyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const pendingCount = deposits.filter((d) => d.status.toLowerCase() === 'pending').length;

  const filteredDeposits = deposits.filter((d) => {
    const matchesStatus = filterStatus === 'all' || d.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch =
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.utr.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-yellow-500/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-yellow-400" />
            User Fund Requests & Manual UPI Verification
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review incoming deposit requests, verify 12-digit UTR numbers, and complete or reject requests with 1-click.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-full font-black text-xs flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}</span>
            </span>
          )}

          <button
            onClick={fetchDeposits}
            className="bg-zinc-900 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-4 border rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 border border-yellow-500/20 p-4 rounded-2xl shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-yellow-400" />
          <input
            type="text"
            placeholder="Search by User, Request ID or UTR Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'approved', label: 'Approved / Completed' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All Requests' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === st.id
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'bg-black text-zinc-400 border border-zinc-800 hover:text-yellow-400'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black border-b border-zinc-800 text-yellow-400 uppercase font-black tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Requested Amount</th>
                <th className="py-3.5 px-4">UTR / Transaction Ref</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4 text-center">Action Buttons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-bold">
                    Loading fund requests...
                  </td>
                </tr>
              ) : filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-bold">
                    No {filterStatus !== 'all' ? filterStatus : ''} fund requests found matching "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d, idx) => {
                  const isPending = d.status === 'Pending';
                  const isApproved = d.status === 'Approved';
                  const isRejected = d.status === 'Rejected';
                  const isProcessing = processingId === d.id;

                  return (
                    <tr key={d.id ? `${d.id}-${idx}` : `dep-${idx}`} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-yellow-400">{d.id}</td>
                      <td className="py-3.5 px-4 font-black text-white">{d.username}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-yellow-400 text-sm">
                        ₹{d.amount.toLocaleString('en-IN')}
                      </td>

                      {/* UTR Number with Copy button */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 bg-black px-2.5 py-1 rounded-xl border border-zinc-800 w-fit">
                          <span className="font-extrabold text-white">{d.utr}</span>
                          <button
                            onClick={() => copyUtr(d.utr)}
                            title="Copy UTR Number"
                            className="p-1 text-zinc-400 hover:text-yellow-400 cursor-pointer"
                          >
                            {copiedUtr === d.utr ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] px-2.5 py-1 rounded-full font-black uppercase">
                          {d.paymentMethod || 'QR_UPI'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isApproved ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Completed
                          </span>
                        ) : isRejected ? (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit uppercase">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            Rejected
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit animate-pulse uppercase">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Pending Action
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>

                      {/* Action Buttons (Complete vs Reject) */}
                      <td className="py-3.5 px-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleApprove(d)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3.5 py-1.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 fill-black text-black" />
                              )}
                              <span>{isProcessing ? 'Processing...' : 'Complete'}</span>
                            </button>

                            <button
                              disabled={isProcessing}
                              onClick={() => handleReject(d)}
                              className="bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 text-rose-400 hover:text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
                            {isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        )}
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
