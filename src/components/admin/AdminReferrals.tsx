import React, { useState, useEffect } from 'react';
import {
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  CreditCard,
  Settings,
  Users,
  AlertCircle,
  Check,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export const AdminReferrals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'settings' | 'stats'>('withdrawals');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    enabled: true,
    level1Percentage: 25,
    level2Percentage: 5,
    minimumDepositINR: 100,
    minimumWithdrawalINR: 100,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, withRes, settingsRes] = await Promise.all([
        fetch('/api/admin/referral/stats'),
        fetch('/api/admin/referral/withdrawals'),
        fetch('/api/admin/referral/settings'),
      ]);

      const [statsJson, withJson, settingsJson] = await Promise.all([
        statsRes.json(),
        withRes.json(),
        settingsRes.json(),
      ]);

      if (statsJson.stats) setStats(statsJson.stats);
      if (withJson.withdrawals) setWithdrawals(withJson.withdrawals);
      if (settingsJson.settings) setSettings(settingsJson.settings);
    } catch (err) {
      console.error('Error fetching admin referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/admin/referral/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedbackMsg({ type: 'success', text: 'Referral settings updated successfully!' });
        if (json.settings) setSettings(json.settings);
      } else {
        setFeedbackMsg({ type: 'error', text: json.error || 'Failed to update settings.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Server error occurred.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setActionLoading(id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/admin/referral/withdrawals/${id}/approve`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedbackMsg({ type: 'success', text: `Withdrawal ${id} approved successfully!` });
        fetchData();
      } else {
        setFeedbackMsg({ type: 'error', text: json.error || 'Failed to approve withdrawal.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Server error occurred.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!rejectingId) return;
    setActionLoading(rejectingId);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/admin/referral/withdrawals/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: rejectNote }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Withdrawal ${rejectingId} rejected and funds safely returned to user's referral balance.`,
        });
        setRejectingId(null);
        setRejectNote('');
        fetchData();
      } else {
        setFeedbackMsg({ type: 'error', text: json.error || 'Failed to reject withdrawal.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Server error occurred.' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-yellow-400">Loading Admin Referral Portal...</p>
      </div>
    );
  }

  const pendingCount = withdrawals.filter((w) => w.status === 'Pending').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/40 border border-yellow-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black uppercase px-3 py-1 rounded-full mb-3">
              <Gift className="w-3.5 h-3.5" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Referral & <span className="text-yellow-400">Withdrawal Portal</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Manage 2-Level Referral commissions, review withdrawal requests, and configure rules.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border border-yellow-500/30 p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
            Referred Users
          </span>
          <span className="text-2xl font-black text-yellow-400 mt-1 block">
            {stats?.totalReferralUsers || 0}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Joined via referrals</span>
        </div>

        <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
            Total Commissions Generated
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            ₹{stats?.totalReferralEarnings?.toFixed(2) || '0.00'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">L1 + L2 Profits Credited</span>
        </div>

        <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
            Total Commission Paid
          </span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            ₹{stats?.totalReferralCommissionPaid?.toFixed(2) || '0.00'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Approved Withdrawals</span>
        </div>

        <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
            Pending Withdrawals
          </span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">
            {stats?.pendingWithdrawalsCount || 0}{' '}
            <span className="text-xs font-normal text-zinc-400">(₹{stats?.pendingWithdrawalAmount || 0})</span>
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Requires Admin Action</span>
        </div>
      </div>

      {/* FEEDBACK MSG */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* MAIN CONTENT CARD & TABS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Withdrawal Requests ({pendingCount} Pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Referral System Settings</span>
          </button>
        </div>

        {/* TAB 1: WITHDRAWAL REQUESTS TABLE */}
        {activeTab === 'withdrawals' && (
          <div>
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30 text-yellow-400" />
                <p className="font-bold text-zinc-400">No withdrawal requests found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">UPI Details</th>
                      <th className="p-3">Requested At</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {withdrawals.map((w: any, idx: number) => (
                      <tr key={w.id ? `${w.id}-${idx}` : `w-${idx}`} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-yellow-400">{w.id}</td>
                        <td className="p-3 font-bold text-white">{w.username}</td>
                        <td className="p-3 font-black text-yellow-400 text-sm">₹{w.amount.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="font-bold text-zinc-200">{w.upiId}</div>
                          <div className="text-[10px] text-zinc-500 font-normal">{w.upiName}</div>
                        </td>
                        <td className="p-3 text-zinc-400">
                          {new Date(w.requestedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3">
                          {w.status === 'Approved' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {w.status === 'Pending' && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">
                              <Clock className="w-3 h-3" />
                              Pending Action
                            </span>
                          )}
                          {w.status === 'Rejected' && (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                              <XCircle className="w-3 h-3" />
                              Rejected (Refunded)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {w.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveWithdrawal(w.id)}
                                disabled={actionLoading === w.id}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                              >
                                APPROVE
                              </button>
                              <button
                                onClick={() => setRejectingId(w.id)}
                                disabled={actionLoading === w.id}
                                className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/40 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                REJECT
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 italic">No action needed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REFERRAL SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto py-4">
            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
              <div className="bg-black border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span>Referral Engine Configuration</span>
                </h3>

                {/* Enable / Disable Toggle */}
                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div>
                    <label className="font-extrabold text-white block">Referral System Status</label>
                    <span className="text-[11px] text-zinc-400">
                      Enable or disable referral commissions platform-wide.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-5 h-5 accent-yellow-400 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Level 1 Percentage */}
                  <div>
                    <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                      Level 1 Commission (% of Profit)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={settings.level1Percentage}
                      onChange={(e) =>
                        setSettings({ ...settings, level1Percentage: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 px-4 text-yellow-400 font-bold text-sm focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Direct referrer commission (Default: 25%)</p>
                  </div>

                  {/* Level 2 Percentage */}
                  <div>
                    <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                      Level 2 Commission (% of Profit)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={settings.level2Percentage}
                      onChange={(e) =>
                        setSettings({ ...settings, level2Percentage: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 px-4 text-yellow-400 font-bold text-sm focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Second-level referrer commission (Default: 5%)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Minimum Deposit Required */}
                  <div>
                    <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                      Minimum Deposit for Activation (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={settings.minimumDepositINR}
                      onChange={(e) =>
                        setSettings({ ...settings, minimumDepositINR: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 px-4 text-yellow-400 font-bold text-sm focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Cumulative deposit required before referral earns (Default: ₹100)
                    </p>
                  </div>

                  {/* Minimum Withdrawal Amount */}
                  <div>
                    <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                      Minimum Withdrawal Threshold (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={settings.minimumWithdrawalINR}
                      onChange={(e) =>
                        setSettings({ ...settings, minimumWithdrawalINR: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 px-4 text-yellow-400 font-bold text-sm focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Minimum referral balance required to withdraw (Default: ₹100)
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm rounded-xl cursor-pointer shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving Settings...' : 'SAVE REFERRAL SETTINGS'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 relative shadow-2xl">
            <h3 className="text-base font-black text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span>Reject Withdrawal {rejectingId}</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Rejecting this request will automatically return the withdrawal amount back to the user's available referral balance.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Admin Rejection Note (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Incorrect UPI ID or account holder name mismatch"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full bg-black border border-zinc-800 focus:border-rose-400 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectNote('');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectWithdrawal}
                disabled={actionLoading === rejectingId}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
