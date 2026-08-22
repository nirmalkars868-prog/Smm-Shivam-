import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sparkles,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  Zap,
  TrendingUp,
  HelpCircle,
  Layers,
  ArrowRight,
  AlertCircle,
  QrCode,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { AdminSettings, ChildPanelPurchaseRequest, User } from '../../types';

interface BuyChildPanelProps {
  currentUser: User | null;
  settings?: AdminSettings;
  currency?: string;
  onOpenPortal?: () => void;
  onNavigateToPanel?: (slug: string) => void;
}

export const BuyChildPanel: React.FC<BuyChildPanelProps> = ({
  currentUser,
  settings,
  currency = 'INR',
  onOpenPortal,
  onNavigateToPanel,
}) => {
  const [panelName, setPanelName] = useState('');
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [whatsappNo, setWhatsappNo] = useState(currentUser?.whatsappNo || '');
  const [utr, setUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [requests, setRequests] = useState<ChildPanelPurchaseRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [userEmailInput, setUserEmailInput] = useState(currentUser?.email || '');
  const [lastSubmittedWhatsAppUrl, setLastSubmittedWhatsAppUrl] = useState<string | null>(null);

  const priceINR = settings?.childPanelPriceINR || 499;
  const upiId = settings?.upiId || '9770571091@ybl';
  const siteName = settings?.siteName || 'SMM SHIVAM';
  const adminWhatsapp = (settings?.whatsappNumber || '9516862495').replace(/\D/g, '');

  // Generate UPI payment URI & QR Code
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    siteName
  )}&am=${priceINR}&cu=INR&tn=${encodeURIComponent('Child Panel Purchase')}`;
  
  // Use admin's custom QR code image if set, else fallback to generated QR
  const qrCodeUrl =
    settings?.qrCodeUrl ||
    settings?.paymentQrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiPayUrl)}&margin=8`;

  // Fetch past purchase requests for this user
  const fetchMyRequests = async () => {
    if (!currentUser?.id && !currentUser?.email) {
      setLoadingRequests(false);
      return;
    }
    try {
      const q = currentUser?.id || currentUser?.email || '';
      const res = await fetch(`/api/child-panel-requests?userId=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.warn('Failed to load purchase requests:', e);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      if (!whatsappNo && currentUser.whatsappNo) {
        setWhatsappNo(currentUser.whatsappNo);
      }
      if (!userEmailInput && currentUser.email) {
        setUserEmailInput(currentUser.email);
      }
    }
    fetchMyRequests();
  }, [currentUser]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLastSubmittedWhatsAppUrl(null);

    if (!currentUser) {
      setErrorMsg('Please log in first to submit a Child Panel purchase request.');
      return;
    }

    if (!panelName.trim()) {
      setErrorMsg('Please enter your desired Child Panel Name.');
      return;
    }

    if (!slug.trim()) {
      setErrorMsg('Please choose a valid alphanumeric panel slug.');
      return;
    }

    if (!whatsappNo.trim()) {
      setErrorMsg('Please enter your WhatsApp Number.');
      return;
    }

    if (!utr.trim()) {
      setErrorMsg('Please enter the 12-digit UPI UTR / Transaction Reference Number.');
      return;
    }

    try {
      setSubmitting(true);
      const cleanWa = whatsappNo.trim().replace(/\D/g, '');
      const finalEmail = (userEmailInput || currentUser.email || '').trim();

      const payload = {
        userId: currentUser.id,
        username: currentUser.username,
        userEmail: finalEmail,
        whatsappNo: cleanWa,
        requestedPanelName: panelName.trim(),
        requestedSlug: slug.trim(),
        requestedDomain: customDomain.trim(),
        amount: priceINR,
        utr: utr.trim(),
      };

      const res = await fetch('/api/child-panel-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to submit purchase request.');
      } else {
        // Construct pre-filled WhatsApp message for Admin Support
        const waText =
          `*⚡ ${siteName.toUpperCase()} - BUY CHILD PANEL REQUEST ⚡*\n` +
          `----------------------------------------\n` +
          `👤 *Username:* ${currentUser.username}\n` +
          `📧 *Email:* ${finalEmail}\n` +
          `📱 *WhatsApp:* +${cleanWa}\n` +
          `🔑 *Reg Password:* ${currentUser.password || 'Saved in Admin'}\n` +
          `🏷️ *Panel Name:* ${panelName.trim()}\n` +
          `🌐 *Slug / URL:* /panel/${slug.trim()}\n` +
          (customDomain.trim() ? `🌐 *Custom Domain:* ${customDomain.trim()}\n` : '') +
          `💰 *Amount Paid:* ₹${priceINR}\n` +
          `📌 *UTR / Ref No:* ${utr.trim()}\n` +
          `🕒 *Date:* ${new Date().toLocaleString()}\n` +
          `----------------------------------------\n` +
          `Hello Admin, I have submitted ₹${priceINR} payment for my Child Panel. Please verify and approve. Thanks!`;

        const waUrl = data.whatsappUrl || `https://wa.me/91${adminWhatsapp}?text=${encodeURIComponent(waText)}`;
        setLastSubmittedWhatsAppUrl(waUrl);

        setSuccessMsg(
          '🎉 Purchase request submitted successfully! Redirecting you to Admin WhatsApp Support for instant payment verification...'
        );

        // Open Admin WhatsApp immediately in new tab / app
        try {
          window.open(waUrl, '_blank');
        } catch (openErr) {
          console.warn('Popup blocked, user can click WhatsApp button:', openErr);
        }

        setPanelName('');
        setSlug('');
        setCustomDomain('');
        setUtr('');
        fetchMyRequests();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const isChildOwner =
    currentUser?.role === 'child_owner' ||
    (currentUser?.childPanelId && currentUser.childPanelId.length > 0) ||
    requests.some((r) => r.status === 'Approved');

  const approvedRequest = requests.find((r) => r.status === 'Approved');
  const activeSlug = approvedRequest?.requestedSlug || currentUser?.childPanelId?.replace(/^cp-/, '').replace(/-\d+$/, '') || 'my-panel';

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-yellow-500/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Start Your SMM Business
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Buy White-Label Child Panel
            </h1>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Launch your own branded SMM panel in minutes! Connect your own UPI payment QR, set custom profit margins,
              and start accepting orders from your own customers directly.
            </p>
          </div>

          <div className="bg-black/60 border border-yellow-500/40 rounded-xl p-4 text-center min-w-[200px] shadow-xl backdrop-blur-md">
            <span className="text-xs text-zinc-400 font-medium block">One-Time Activation</span>
            <div className="text-3xl font-black text-yellow-400 mt-1">₹{priceINR}</div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3" /> Lifetime Reseller Access
            </span>
          </div>
        </div>
      </div>

      {/* Active Child Owner Notice Banner */}
      {isChildOwner && (
        <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🎉 Child Panel Payment Approved!
                </h3>
                <p className="text-sm text-zinc-300">
                  Your Child Panel request has been approved. Admin will share and configure your panel directly with you on WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a
                href={`https://wa.me/91${adminWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg transition-all"
              >
                <Smartphone className="w-4 h-4" />
                Chat with Admin on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Purchase Form + Payment Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Order & Panel Details Form */}
        <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-yellow-400" />
              1. Child Panel Setup Details
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enter your desired panel name and subdomain slug. Your existing account will be converted to Child Owner upon approval.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3.5 flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-3.5 flex items-start gap-3 text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Desired Child Panel Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                placeholder="e.g. Royal Digital SMM Panel"
                required
                className="w-full bg-black/60 border border-zinc-700 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Panel Slug / URL Identifier <span className="text-red-400">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs text-zinc-500 font-mono">/panel/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="royalsmm"
                  required
                  className="w-full bg-black/60 border border-zinc-700 focus:border-yellow-500 rounded-xl pl-20 pr-4 py-2.5 text-sm font-mono text-yellow-400 placeholder-zinc-600 outline-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Your panel will be instantly accessible at:{' '}
                <span className="text-zinc-300 font-mono">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/panel/{slug || 'your-slug'}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Custom Domain <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="e.g. www.royalsmm.com"
                className="w-full bg-black/60 border border-zinc-700 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                If you have a domain, enter it here. You can also link it later in your dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Your Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={userEmailInput}
                  onChange={(e) => setUserEmailInput(e.target.value)}
                  placeholder="e.g. user@example.com"
                  required
                  className="w-full bg-black/60 border border-zinc-700 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Your WhatsApp Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={whatsappNo}
                  onChange={(e) => setWhatsappNo(e.target.value)}
                  placeholder="e.g. 9516862495"
                  required
                  className="w-full bg-black/60 border border-zinc-700 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Payment UTR / Ref Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit UPI UTR / Transaction Reference Number"
                required
                className="w-full bg-black/60 border border-zinc-700 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-zinc-500 outline-none transition-colors"
              />
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-sm shadow-lg hover:shadow-yellow-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Submitting & Opening WhatsApp...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    Submit & Send Payment Proof on WhatsApp (₹{priceINR})
                  </>
                )}
              </button>

              {lastSubmittedWhatsAppUrl && (
                <a
                  href={lastSubmittedWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all animate-bounce"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open WhatsApp Support with Payment Details</span>
                </a>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Payment QR & Instructions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-yellow-400" />
                2. Scan & Pay ₹{priceINR}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pay using any UPI app (GPay, PhonePe, Paytm) to Main Admin.
              </p>
            </div>

            {/* QR Code Card */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-4 border-yellow-500/40 shadow-inner">
              <img
                src={qrCodeUrl}
                alt="UPI Payment QR Code"
                className="w-48 h-48 object-contain rounded-lg"
              />
              <span className="text-[11px] text-zinc-700 font-bold mt-2">
                Scan via GPay / PhonePe / Paytm / BHIM
              </span>
            </div>

            {/* UPI ID Row */}
            <div className="bg-black/50 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="space-y-0.5 overflow-hidden">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Admin UPI ID</span>
                <p className="text-xs font-mono font-bold text-yellow-400 truncate">{upiId}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Step-by-step checklist */}
            <div className="space-y-2.5 text-xs text-zinc-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <span>Scan QR code and complete payment of <b>₹{priceINR}</b>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <span>Copy the 12-digit UTR from your payment confirmation screen.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <span>Paste UTR in the form on the left and submit. Admin will approve within 5-15 mins!</span>
              </div>
            </div>
          </div>

          {/* Child Panel Benefits Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              What You Get With Child Panel
            </h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Keep your same account, wallet balance, and user data.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Custom Logo, Theme, Favicon & WhatsApp Support numbers.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Collect 100% of user deposit payments directly to your UPI.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Automated API order forwarding to Main Provider.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* User's Purchase Requests History */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Your Child Panel Purchase Requests
          </h3>
          <button
            type="button"
            onClick={fetchMyRequests}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Refresh Status
          </button>
        </div>

        {loadingRequests ? (
          <div className="text-center py-6 text-xs text-zinc-500">Loading purchase requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500 bg-black/30 rounded-xl border border-zinc-800/60">
            No purchase requests submitted yet. Fill out the form above to get your white-label panel!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-400 border-b border-zinc-800 bg-black/40 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Panel Name</th>
                  <th className="py-2.5 px-3">Slug / Domain</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">UTR / Ref</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono text-zinc-400">{r.id}</td>
                    <td className="py-3 px-3 font-semibold text-white">{r.requestedPanelName}</td>
                    <td className="py-3 px-3 font-mono text-yellow-400">/panel/{r.requestedSlug}</td>
                    <td className="py-3 px-3 font-bold text-white">₹{r.amount}</td>
                    <td className="py-3 px-3 font-mono text-zinc-400">{r.utr}</td>
                    <td className="py-3 px-3">
                      {r.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      ) : r.status === 'Rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[11px] font-semibold animate-pulse">
                          <Clock className="w-3 h-3" /> Pending Admin Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-zinc-500 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.status === 'Approved' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToPanel) onNavigateToPanel(r.requestedSlug);
                            else window.location.href = `/panel/${r.requestedSlug}`;
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Open Panel
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
