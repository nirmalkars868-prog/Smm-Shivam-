import React, { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { User } from '../../types';

interface ReferAndEarnProps {
  currentUser: User;
}

export const ReferAndEarn: React.FC<ReferAndEarnProps> = ({ currentUser }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'withdraw' | 'commissions' | 'withdrawals'>('users');

  // Copy states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Withdrawal form fields
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [upiName, setUpiName] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState<string>('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/referral?userId=${currentUser.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
        if (json.upiId) setUpiId(json.upiId);
        if (json.upiName) setUpiName(json.upiName);
      }
    } catch (err) {
      console.error('Error fetching referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [currentUser.id]);

  const referralCode = data?.referralCode || currentUser.referralCode || 'REFCODE';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Join SMM SHIVAM Panel',
          text: `Use my referral code ${referralCode} to sign up on SMM SHIVAM Panel and boost your social media!`,
          url: referralLink,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid positive withdrawal amount');
      return;
    }

    const minWithdrawal = data?.settings?.minimumWithdrawalINR || 100;
    if (amt < minWithdrawal) {
      setWithdrawError(`Minimum withdrawal amount is ₹${minWithdrawal}`);
      return;
    }

    if (amt > (data?.referralBalance || 0)) {
      setWithdrawError(`Withdrawal amount (₹${amt}) exceeds available referral balance (₹${data?.referralBalance})`);
      return;
    }

    if (!upiId.trim() || !upiId.includes('@')) {
      setWithdrawError('Please enter a valid UPI ID (e.g. username@upi or mobile@ybl)');
      return;
    }

    if (!upiName.trim()) {
      setWithdrawError('Please enter the UPI Account Holder Name');
      return;
    }

    setSubmittingWithdraw(true);

    try {
      const res = await fetch('/api/user/referral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: amt,
          upiId: upiId.trim(),
          upiName: upiName.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setWithdrawSuccess(`Success! ₹${amt} withdrawal request submitted for review.`);
        setWithdrawAmount('');
        fetchReferralData();
      } else {
        setWithdrawError(json.error || 'Failed to submit withdrawal request.');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'Server error occurred.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-yellow-400">Loading Referral Dashboard...</p>
      </div>
    );
  }

  const referralBalance = data?.referralBalance || 0;
  const totalEarnings = data?.totalReferralEarnings || 0;
  const totalWithdrawn = data?.totalReferralWithdrawn || 0;
  const totalReferredUsers = data?.totalReferredUsersCount || 0;
  const level1Earnings = data?.level1Earnings || 0;
  const level2Earnings = data?.level2Earnings || 0;
  const minDepositReq = data?.settings?.minimumDepositINR || 100;
  const minWithdrawalReq = data?.settings?.minimumWithdrawalINR || 100;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/40 border border-yellow-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black uppercase px-3 py-1 rounded-full mb-3">
              <Gift className="w-3.5 h-3.5" />
              <span>2-Level Referral Commission Program</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Refer & Earn <span className="text-yellow-400">Passive Income</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl">
              Invite your friends using your referral code. As soon as your referred user completes the{' '}
              <span className="text-yellow-400 font-bold">₹{minDepositReq} deposit criteria</span>, you instantly receive{' '}
              <span className="text-yellow-400 font-bold">25% Level 1 referral commission</span> credited directly to your balance!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black/60 border border-yellow-500/40 backdrop-blur-md rounded-2xl p-4 text-center min-w-[140px]">
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Available Balance</div>
              <div className="text-2xl font-black text-yellow-400 mt-1">₹{referralBalance.toFixed(2)}</div>
              <button
                onClick={() => setActiveTab('withdraw')}
                className="mt-2 text-[10px] font-black uppercase text-black bg-yellow-400 hover:bg-yellow-300 px-3 py-1 rounded-lg w-full transition-colors cursor-pointer"
              >
                Withdraw Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* THREE MANDATORY TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: TOTAL REFER EARNING */}
        <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-yellow-400/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              TOTAL REFER EARNING
            </span>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-yellow-400 mt-3 tracking-tight">
            ₹{totalEarnings.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900 text-[11px] text-zinc-400">
            <span>Level 1: <strong className="text-yellow-400">₹{level1Earnings.toFixed(2)}</strong></span>
            <span>Level 2: <strong className="text-yellow-400">₹{level2Earnings.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Stat 2: WITHDRAWAL AMOUNT */}
        <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-yellow-400/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              WITHDRAWAL AMOUNT
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-3 tracking-tight">
            ₹{totalWithdrawn.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900 text-[11px] text-zinc-400">
            <span>Available: <strong className="text-emerald-400">₹{referralBalance.toFixed(2)}</strong></span>
            <span>Min Request: <strong className="text-zinc-300">₹{minWithdrawalReq}</strong></span>
          </div>
        </div>

        {/* Stat 3: TOTAL REFER USER */}
        <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-yellow-400/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              TOTAL REFER USER
            </span>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-yellow-400 mt-3 tracking-tight">
            {totalReferredUsers}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900 text-[11px] text-zinc-400">
            <span>Direct Referred Users</span>
            <span className="text-emerald-400 font-bold">2-Level Chain Active</span>
          </div>
        </div>
      </div>

      {/* REFERRAL LINK & CODE BOX */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Your Unique Referral Credentials</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unique Referral Code */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-4">
            <label className="block text-[11px] font-extrabold text-zinc-400 uppercase mb-2">
              Your Unique Referral Code
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-900 border border-yellow-500/40 rounded-xl px-4 py-3 text-lg font-black text-yellow-400 tracking-widest uppercase">
                {referralCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-4 py-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-lg shadow-yellow-500/20"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'COPIED!' : 'COPY CODE'}</span>
              </button>
            </div>
          </div>

          {/* Unique Referral Link */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-4">
            <label className="block text-[11px] font-extrabold text-zinc-400 uppercase mb-2">
              Your Personal Referral Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-xs font-mono text-zinc-300 focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="bg-zinc-800 hover:bg-zinc-700 text-yellow-400 font-bold text-xs px-3 py-3 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0 border border-yellow-500/30"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'COPIED' : 'COPY'}</span>
              </button>
              <button
                onClick={handleShare}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs px-3 py-3 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>SHARE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informational Rule Notice */}
        <div className="mt-4 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-zinc-300 flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-yellow-400">
              ⚡ How Referral Commission & Activation Works:
            </p>
            <p>
              1. Referred users must enter your code at signup.
            </p>
            <p>
              2. Referral earnings activate when the referred user completes at least{' '}
              <strong className="text-yellow-400">₹{minDepositReq} in cumulative approved deposits</strong>.
            </p>
            <p>
              3. You earn <strong className="text-yellow-400">25% profit commission on Level 1</strong> orders and{' '}
              <strong className="text-yellow-400">5% profit commission on Level 2</strong> orders whenever they are marked Completed.
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Referred Users ({data?.referredUsers?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Withdraw Earnings</span>
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'commissions'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Commission History</span>
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Withdrawal History</span>
          </button>
        </div>

        {/* TAB 1: REFERRED USERS LIST */}
        {activeTab === 'users' && (
          <div>
            {data?.referredUsers?.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-yellow-400" />
                <p className="font-bold text-zinc-400">No users referred yet.</p>
                <p className="text-xs mt-1">Share your referral link to start earning lifetime passive income!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Signup Date</th>
                      <th className="p-3">Cumulative Deposit</th>
                      <th className="p-3">Eligibility Status</th>
                      <th className="p-3 text-center">Orders</th>
                      <th className="p-3 text-right">Commission Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {data?.referredUsers?.map((u: any) => (
                      <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-3 font-bold text-yellow-400">
                          {u.username}
                          <div className="text-[10px] font-normal text-zinc-500">{u.email}</div>
                        </td>
                        <td className="p-3 text-zinc-400">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3 font-bold text-white">₹{u.totalDepositINR.toFixed(2)}</td>
                        <td className="p-3">
                          {u.referralEligible ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              Active (₹100 Met)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              <Clock className="w-3 h-3" />
                              Pending ₹{u.remainingForEligibilityINR} More Deposit
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-zinc-300">{u.ordersCount}</td>
                        <td className="p-3 text-right font-black text-emerald-400">
                          ₹{u.commissionEarnedINR.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WITHDRAWAL REQUEST FORM */}
        {activeTab === 'withdraw' && (
          <div className="max-w-xl mx-auto py-2">
            <div className="bg-black border border-yellow-500/30 rounded-3xl p-6 sm:p-8 relative">
              <h3 className="text-base font-black text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-yellow-400" />
                <span>Withdraw Referral Balance</span>
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Transfer your referral earnings directly to your bank account via UPI. Minimum withdrawal amount is{' '}
                <strong className="text-yellow-400">₹{minWithdrawalReq}</strong>.
              </p>

              {withdrawError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {withdrawSuccess && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{withdrawSuccess}</span>
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
                {/* Available Balance Box */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
                      Available Balance
                    </span>
                    <span className="text-2xl font-black text-yellow-400">₹{referralBalance.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(referralBalance.toString())}
                    className="text-[10px] font-black uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-xl hover:bg-yellow-400 hover:text-black transition-colors"
                  >
                    Use Max
                  </button>
                </div>

                {/* Amount Field */}
                <div>
                  <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                    Withdrawal Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={minWithdrawalReq}
                    step="1"
                    placeholder={`e.g. ${minWithdrawalReq}`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 px-4 text-yellow-400 font-bold text-sm focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Minimum withdrawal: ₹{minWithdrawalReq}</p>
                </div>

                {/* UPI ID */}
                <div>
                  <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                    UPI ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@ybl or user@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 px-4 text-yellow-400 font-bold text-sm focus:outline-none"
                  />
                </div>

                {/* Account Holder Name */}
                <div>
                  <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                    UPI Account Holder Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={upiName}
                    onChange={(e) => setUpiName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 px-4 text-yellow-400 font-bold text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingWithdraw || referralBalance < minWithdrawalReq}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm rounded-xl cursor-pointer shadow-lg shadow-yellow-500/20 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {submittingWithdraw
                      ? 'Submitting Request...'
                      : referralBalance < minWithdrawalReq
                      ? `Minimum Balance ₹${minWithdrawalReq} Required`
                      : 'SUBMIT WITHDRAWAL REQUEST'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSION HISTORY */}
        {activeTab === 'commissions' && (
          <div>
            {data?.commissionHistory?.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30 text-yellow-400" />
                <p className="font-bold text-zinc-400">No commission history recorded yet.</p>
                <p className="text-xs mt-1">
                  Commissions are credited automatically when referred users complete orders!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Source User</th>
                      <th className="p-3">Level</th>
                      <th className="p-3">Profit (₹)</th>
                      <th className="p-3">Comm %</th>
                      <th className="p-3 text-right">Commission Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {data?.commissionHistory?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-3 text-zinc-400">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 font-mono font-bold text-yellow-400">{c.orderId}</td>
                        <td className="p-3 font-bold text-white">{c.sourceUsername}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              c.level === 1
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            Level {c.level}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-zinc-300">₹{c.orderProfitINR.toFixed(2)}</td>
                        <td className="p-3 font-extrabold text-yellow-400">{c.commissionPercentage}%</td>
                        <td className="p-3 text-right font-black text-emerald-400">
                          +₹{c.commissionAmountINR.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WITHDRAWAL HISTORY */}
        {activeTab === 'withdrawals' && (
          <div>
            {data?.withdrawalHistory?.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30 text-yellow-400" />
                <p className="font-bold text-zinc-400">No withdrawal requests found.</p>
                <p className="text-xs mt-1">Submit a withdrawal request when your balance reaches ₹{minWithdrawalReq}!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Request ID</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">UPI Details</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {data?.withdrawalHistory?.map((w: any) => (
                      <tr key={w.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-yellow-400">{w.id}</td>
                        <td className="p-3 text-zinc-400">
                          {new Date(w.requestedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3 font-black text-yellow-400 text-sm">₹{w.amount.toFixed(2)}</td>
                        <td className="p-3 text-zinc-300 font-bold">
                          {w.upiId}
                          <div className="text-[10px] text-zinc-500 font-normal">{w.upiName}</div>
                        </td>
                        <td className="p-3">
                          {w.status === 'Approved' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {w.status === 'Pending' && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                              <Clock className="w-3 h-3" />
                              Pending Review
                            </span>
                          )}
                          {w.status === 'Rejected' && (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                              <XCircle className="w-3 h-3" />
                              Rejected (Refunded)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400 italic text-[11px]">{w.adminNote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
