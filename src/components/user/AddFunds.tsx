import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, Wallet, MessageSquare, ExternalLink, ShieldCheck, AlertCircle, RefreshCw, History, XCircle, Clock, Copy, Check } from 'lucide-react';
import { DepositRequest, User } from '../../types';
import { rtdb, ref, onValue, set, cleanForFirebase } from '../../lib/firebaseClient';

function ensureArray<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  if (typeof data === 'object') {
    return Object.values(data).filter(Boolean) as T[];
  }
  return [];
}

interface AddFundsProps {
  currentUser?: User | null;
  userBalance: number;
  currency: string;
  onBalanceUpdated: () => void;
}

export const AddFunds: React.FC<AddFundsProps> = ({ currentUser, userBalance, currency, onBalanceUpdated }) => {
  const [amountINR, setAmountINR] = useState<string>('100');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userDeposits, setUserDeposits] = useState<DepositRequest[]>([]);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    whatsappUrl: string;
    message: string;
    formattedText: string;
    autoVerified: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const activeUserId = currentUser?.id || localStorage.getItem('smm_panel_userId') || 'usr-demo';

  // Target UPI URL (Hidden raw string in code, rendered as QR)
  const upiPayString = `upi://pay?pa=9770571091@ybl&pn=SMM%20SHIVAM&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiPayString)}&size=260x260&margin=10&color=000000&bcolor=ffffff`;

  useEffect(() => {
    fetchHistory();

    if (rtdb && activeUserId) {
      const depRef = ref(rtdb, 'smm_store/depositRequests');
      const unsubscribe = onValue(depRef, (snap) => {
        if (snap.exists()) {
          const list = ensureArray<DepositRequest>(snap.val());
          const filtered = list.filter(
            (d) =>
              d.userId === activeUserId ||
              d.username === activeUserId ||
              (currentUser?.username && d.username?.toLowerCase() === currentUser.username.toLowerCase())
          );
          setUserDeposits(filtered);
          setHistoryLoading(false);
        }
      }, (err) => {
        console.warn('AddFunds RTDB listener warning:', err);
      });
      return () => unsubscribe();
    }
  }, [activeUserId, currentUser]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/user/deposits?userId=${encodeURIComponent(activeUserId)}`);
      const data = await res.json();
      if (data.deposits) {
        setUserDeposits(data.deposits);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const copyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountINR);
    if (!num || num < 10) {
      setErrorMsg('Minimum deposit amount is ₹10');
      return;
    }
    if (!utrNumber || utrNumber.trim().length < 4) {
      setErrorMsg('Please enter a valid 12-digit UTR / Transaction Reference Number');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSubmittedData(null);

    try {
      // 1. Send deposit request to backend API
      const res = await fetch('/api/user/deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          amount: num,
          utr: utrNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment details');
      }

      // 2. Direct write/sync to Firebase Realtime Database
      if (rtdb && data.deposit) {
        try {
          const cleanDep = cleanForFirebase(data.deposit);
          await set(ref(rtdb, `smm_store/depositRequests/${data.deposit.id}`), cleanDep);
          await set(ref(rtdb, `depositRequests/${data.deposit.id}`), cleanDep);
        } catch (rtdbErr: any) {
          console.error('RTDB Deposit Write Error:', rtdbErr);
          throw new Error(`Firebase RTDB Write Error: [${rtdbErr.code || 'UNKNOWN_ERROR'}] ${rtdbErr.message || rtdbErr}`);
        }
      }

      setSubmittedData({
        whatsappUrl: data.whatsappUrl,
        message: data.message,
        formattedText: data.formattedText,
        autoVerified: data.autoVerified || false,
      });

      // Clear form
      setUtrNumber('');

      if (data.autoVerified) {
        onBalanceUpdated();
      }

      // Refresh deposit history immediately
      fetchHistory();

      // Automatically attempt opening WhatsApp in a new tab
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.error('Deposit submission error:', err);
      setErrorMsg(err.message || 'Deposit submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-yellow-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500 text-black flex items-center justify-center font-black">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-yellow-400">Add Funds (QR Code UPI Payment)</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Scan the QR Code with any UPI App, submit your UTR reference number, and track your deposit history below.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Left = QR & Form, Right = Summary & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): QR Code Scanner & Submission */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-block bg-yellow-500/10 text-yellow-400 text-[11px] font-black uppercase px-3 py-1 rounded-full border border-yellow-500/20">
                ⚡ Step 1: Scan & Pay via Any UPI App
              </span>
              <p className="text-xs text-zinc-400">
                PhonePe • Paytm • Google Pay • BHIM • Cred • WhatsApp Pay • Any Bank App
              </p>
            </div>

            {/* QR Code Container */}
            <div className="relative group max-w-[280px] mx-auto bg-white p-4 rounded-3xl shadow-xl border-4 border-yellow-500 flex flex-col items-center justify-center text-center">
              <img
                src={qrImageUrl}
                alt="SMM SHIVAM UPI QR Code"
                className="w-56 h-56 object-contain rounded-xl"
              />
              <div className="mt-2 text-black font-extrabold text-xs tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>SMM SHIVAM Official Payment QR</span>
              </div>
            </div>

            {/* Step 2 Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-zinc-900">
              <div className="text-center mb-2">
                <span className="inline-block bg-yellow-500/10 text-yellow-400 text-[11px] font-black uppercase px-3 py-1 rounded-full border border-yellow-500/20">
                  ⚡ Step 2: Submit Payment Details Below
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Amount Paid (₹ INR) <span className="text-yellow-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-yellow-400 font-black text-sm">₹</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    placeholder="Enter amount e.g. 100"
                    value={amountINR}
                    onChange={(e) => setAmountINR(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  12-Digit UTR / Transaction Ref No. <span className="text-yellow-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423910847192"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-yellow-400 focus:outline-none focus:border-yellow-400 font-mono"
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Find the 12-digit UTR/Ref No in your UPI app payment receipt details.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 px-6 rounded-2xl shadow-xl shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer active:scale-95"
              >
                {loading ? (
                  <span>Submitting Details...</span>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 fill-black" />
                    <span>Submit UTR & Redirect to WhatsApp</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Submission Success Box & WhatsApp Direct Button */}
          {submittedData && (
            <div className="p-6 bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 text-emerald-400 font-bold text-base">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <span>{submittedData.message}</span>
              </div>

              {!submittedData.autoVerified && (
                <div className="space-y-3 bg-black/60 p-4 rounded-2xl border border-emerald-500/30">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    If WhatsApp did not open automatically, click the button below to send your payment details to our support team:
                  </p>
                  <a
                    href={submittedData.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <MessageSquare className="w-5 h-5 fill-black" />
                    <span>Open WhatsApp Chat Now (9516862495)</span>
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Wallet Summary & How to Pay */}
        <div className="lg:col-span-5 space-y-6">
          {/* Wallet Summary */}
          <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Wallet className="w-4 h-4 text-yellow-400" />
              Account Balance
            </h3>
            <div className="bg-black p-4 rounded-2xl border border-zinc-800">
              <span className="text-xs text-zinc-400 font-medium">Available Balance</span>
              <div className="text-3xl font-black font-mono text-yellow-400 mt-1">
                {currency === 'INR' ? `₹${userBalance.toFixed(2)}` : `$${(userBalance / 86).toFixed(2)}`}
              </div>
            </div>
            <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
              <p>• Min Deposit: <span className="text-yellow-400 font-bold">₹10</span></p>
              <p>• Processing Time: <span className="text-emerald-400 font-bold">Instant to 2 Minutes</span></p>
              <p>• Support WhatsApp: <span className="text-yellow-400 font-bold">9516862495</span></p>
            </div>
          </div>

          {/* Payment Instructions Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-black uppercase text-zinc-200 tracking-wider">
              📌 Payment Verification Process
            </h4>
            <ol className="text-xs text-zinc-400 space-y-3 font-medium">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span>Scan the QR code using Google Pay, Paytm, PhonePe, or BHIM.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span>Complete payment and note the 12-digit UTR/Transaction ID.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span>Enter Amount & UTR above, then click submit to open WhatsApp.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  4
                </span>
                <span>Our automated team will verify UTR and credit your account balance immediately.</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: USER DEPOSIT HISTORY / PASSBOOK */}
      <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 shadow-2xl space-y-4 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
          <div>
            <h2 className="text-lg font-black text-yellow-400 flex items-center gap-2">
              <History className="w-5 h-5 text-yellow-400" />
              <span>Your Deposit History & Status (आपकी जमा राशि का इतिहास)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Check all your previous deposit requests, UTR references, and real-time approval status.
            </p>
          </div>

          <button
            onClick={fetchHistory}
            className="bg-black border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer w-fit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            <span>Refresh History</span>
          </button>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-black border-b border-zinc-800 text-yellow-400 uppercase font-black tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">UTR / Transaction Ref</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
              {historyLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 font-bold">
                    Loading deposit history...
                  </td>
                </tr>
              ) : userDeposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 font-bold">
                    No deposit records found. Scan the QR code above to add funds to your wallet!
                  </td>
                </tr>
              ) : (
                userDeposits.map((dep) => {
                  const isApproved = dep.status === 'Approved';
                  const isRejected = dep.status === 'Rejected';

                  return (
                    <tr key={dep.id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-yellow-400">{dep.id}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-white text-sm">
                        ₹{dep.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 bg-black px-2.5 py-1 rounded-xl border border-zinc-800 w-fit">
                          <span className="font-extrabold text-zinc-200">{dep.utr}</span>
                          <button
                            onClick={() => copyUtr(dep.utr)}
                            title="Copy UTR"
                            className="p-1 text-zinc-400 hover:text-yellow-400 cursor-pointer"
                          >
                            {copiedUtr === dep.utr ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] px-2.5 py-1 rounded-full font-black uppercase">
                          {dep.paymentMethod || 'QR_UPI'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isApproved ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Completed / Credited
                          </span>
                        ) : isRejected ? (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit uppercase">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            Rejected
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit animate-pulse uppercase">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Pending Verification
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                        {new Date(dep.createdAt).toLocaleString()}
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
