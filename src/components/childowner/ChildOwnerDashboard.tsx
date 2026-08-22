import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sliders,
  DollarSign,
  Palette,
  QrCode,
  MessageCircle,
  Code2,
  TrendingUp,
  ShoppingBag,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  ExternalLink,
  Shield,
  Zap,
  HelpCircle,
  ChevronRight,
  Eye,
  Key,
  CreditCard,
  Percent,
  Wallet,
} from 'lucide-react';
import { ChildPanel, ChildPanelBranding, ChildPanelPricing, ChildPanelPayment, ChildPanelContact, ChildPanelApi, User } from '../../types';

interface ChildOwnerDashboardProps {
  childPanelId?: string;
  currentUser?: User | null;
  currency?: string;
  onSwitchToLivePreview?: (slug: string) => void;
}

export const ChildOwnerDashboard: React.FC<ChildOwnerDashboardProps> = ({
  childPanelId,
  currentUser,
  currency = 'INR',
  onSwitchToLivePreview,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'branding' | 'pricing' | 'payment' | 'contact' | 'api' | 'orders' | 'customers' | 'deposits'
  >('overview');

  const [panelData, setPanelData] = useState<ChildPanel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Analytics & Lists
  const [stats, setStats] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<string>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Form states for sections
  const [brandingForm, setBrandingForm] = useState<ChildPanelBranding>({
    panelName: '',
    logoUrl: '',
    faviconUrl: '',
    theme: 'cyberpunk-neon',
    accentColor: '#38bdf8',
    loginTitle: '',
    footerText: '',
  });

  const [pricingForm, setPricingForm] = useState<ChildPanelPricing>({
    defaultMarginPercent: 25,
    minAllowedMarginPercent: 5,
    maxAllowedMarginPercent: 200,
    serviceCustomPrices: {},
  });

  const [paymentForm, setPaymentForm] = useState<ChildPanelPayment>({
    upiId: '',
    upiName: '',
    qrCodeUrl: '',
    minDepositINR: 10,
    depositInstructions: '',
  });

  const [contactForm, setContactForm] = useState<ChildPanelContact>({
    whatsappNumber: '',
    supportWhatsapp: '',
    telegramUrl: '',
    supportEmail: '',
    customNotice: '',
  });

  const [apiForm, setApiForm] = useState<ChildPanelApi>({
    providerMode: 'main_admin',
    customApiUrl: '',
    customApiKey: '',
    autoForwardOrders: true,
  });

  const [apiTesting, setApiTesting] = useState<boolean>(false);
  const [apiTestResult, setApiTestResult] = useState<any>(null);

  const fetchPanelInfo = async () => {
    try {
      setLoading(true);
      const queryId = childPanelId || currentUser?.childPanelId || currentUser?.id || 'child-default';
      const res = await fetch(`/api/child-owner/me?childPanelId=${queryId}`);
      const data = await res.json();

      if (data.childPanel) {
        const p: ChildPanel = data.childPanel;
        setPanelData(p);

        if (p.branding) setBrandingForm({ ...p.branding });
        if (p.pricing) setPricingForm({ ...p.pricing });
        if (p.payment) setPaymentForm({ ...p.payment });
        if (p.contact) setContactForm({ ...p.contact });
        if (p.apiSettings) setApiForm({ ...p.apiSettings });
      }

      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.warn('Failed to load child panel dashboard info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (tf: string) => {
    setTimeframe(tf);
    if (!panelData) return;
    try {
      const res = await fetch(`/api/child-owner/stats?childPanelId=${panelData.id}&timeframe=${tf}`);
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch (e) {}
  };

  const fetchTabLists = async () => {
    if (!panelData) return;
    try {
      if (activeTab === 'orders') {
        const res = await fetch(`/api/child-owner/orders?childPanelId=${panelData.id}`);
        const data = await res.json();
        if (data.orders) setOrders(data.orders);
      } else if (activeTab === 'customers') {
        const res = await fetch(`/api/child-owner/users?childPanelId=${panelData.id}`);
        const data = await res.json();
        if (data.users) setUsers(data.users);
      } else if (activeTab === 'deposits') {
        const res = await fetch(`/api/child-owner/deposits?childPanelId=${panelData.id}`);
        const data = await res.json();
        if (data.deposits) setDeposits(data.deposits);
      } else if (activeTab === 'pricing') {
        const res = await fetch(`/api/services?panel=${panelData.id}`);
        const data = await res.json();
        if (data.services) setServices(data.services);
      }
    } catch (e) {
      console.warn('Failed to fetch tab data:', e);
    }
  };

  useEffect(() => {
    fetchPanelInfo();
  }, [childPanelId, currentUser]);

  useEffect(() => {
    if (panelData) {
      fetchTabLists();
    }
  }, [activeTab, panelData]);

  // Save Handlers
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelData) return;
    try {
      setSaving(true);
      const res = await fetch('/api/child-owner/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childPanelId: panelData.id, branding: brandingForm }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: 'White-Label branding saved! Your Child Panel is completely customized. Main Admin remains 100% untouched.',
        });
        fetchPanelInfo();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to save' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Save error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelData) return;
    try {
      setSaving(true);
      const res = await fetch('/api/child-owner/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childPanelId: panelData.id, pricing: pricingForm }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'Pricing margin rates updated successfully!' });
        fetchPanelInfo();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to save' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Save error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelData) return;
    try {
      setSaving(true);
      const res = await fetch('/api/child-owner/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childPanelId: panelData.id, payment: paymentForm }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'UPI and QR Payment details updated!' });
        fetchPanelInfo();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to save' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Save error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelData) return;
    try {
      setSaving(true);
      const res = await fetch('/api/child-owner/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childPanelId: panelData.id, contact: contactForm }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'Contact & WhatsApp info saved!' });
        fetchPanelInfo();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to save' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Save error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelData) return;
    try {
      setSaving(true);
      const res = await fetch('/api/child-owner/api', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childPanelId: panelData.id, apiSettings: apiForm }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'API Configuration updated!' });
        fetchPanelInfo();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to save' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Save error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestCustomApi = async () => {
    if (!apiForm.customApiUrl || !apiForm.customApiKey) {
      setActionNotice({ type: 'error', message: 'Please enter both Custom API URL and API Key first' });
      return;
    }
    try {
      setApiTesting(true);
      setApiTestResult(null);
      const res = await fetch('/api/panel/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: apiForm.customApiUrl, apiKey: apiForm.customApiKey }),
      });
      const data = await res.json();
      setApiTestResult(data);
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: `API Connected Successfully! Balance: ${data.currency || '$'}${data.balance}`,
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'API Connection test failed' });
      }
    } catch (err: any) {
      setApiTestResult({ success: false, error: err.message });
      setActionNotice({ type: 'error', message: err.message || 'Connection failed' });
    } finally {
      setApiTesting(false);
    }
  };

  const handleApproveDeposit = async (depositId: string) => {
    if (!panelData) return;
    try {
      const res = await fetch(`/api/child-owner/deposits/${depositId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childPanelId: panelData.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        fetchTabLists();
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Approve failed' });
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    if (!panelData) return;
    try {
      const res = await fetch(`/api/child-owner/deposits/${depositId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childPanelId: panelData.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        fetchTabLists();
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Reject failed' });
    }
  };

  if (loading && !panelData) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-zinc-400">Loading White-Label Portal...</p>
      </div>
    );
  }

  const effectivePanelName = brandingForm.panelName || panelData?.name || 'Child Panel';
  const effectiveTheme = brandingForm.theme || 'cyberpunk-neon';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alert Notifications */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Child Panel Owner Header Banner */}
      <div className="p-5 rounded-3xl bg-zinc-950 border border-yellow-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 border shadow-lg"
            style={{
              backgroundColor: `${brandingForm.accentColor || '#38bdf8'}20`,
              borderColor: `${brandingForm.accentColor || '#38bdf8'}60`,
              color: brandingForm.accentColor || '#38bdf8',
            }}
          >
            {brandingForm.logoUrl ? (
              <img src={brandingForm.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              effectivePanelName.substring(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white truncate">{effectivePanelName}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-mono font-black border border-yellow-500/30">
                WHITE-LABEL OWNER PORTAL
              </span>
            </div>
            <div className="text-xs text-zinc-400 flex items-center gap-2 mt-1 font-mono">
              <span className="text-sky-400">🌐 {panelData?.subdomain}</span>
              {panelData?.customDomain && <span className="text-emerald-400">• {panelData.customDomain}</span>}
            </div>
          </div>
        </div>

        {/* Balance & Preview Action */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-black">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Reseller Balance</div>
              <div className="text-base font-black text-yellow-400 font-mono">
                ₹{(panelData?.walletBalance || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (onSwitchToLivePreview && panelData) {
                onSwitchToLivePreview(panelData.slug);
              } else if (panelData) {
                window.open(`/?panel=${panelData.slug}`, '_blank');
              }
            }}
            className="px-4 py-3 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-black font-black text-xs rounded-2xl shadow-lg shadow-sky-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span>LIVE PREVIEW</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800 text-xs font-bold scrollbar-none">
        {[
          { id: 'overview', label: 'Overview & Stats', icon: TrendingUp },
          { id: 'branding', label: 'White-Label Branding', icon: Palette, badge: 'ISOLATED' },
          { id: 'pricing', label: 'Profit Margins (Pricing)', icon: Percent },
          { id: 'payment', label: 'Payment & QR UPI', icon: QrCode },
          { id: 'contact', label: 'WhatsApp & Support', icon: MessageCircle },
          { id: 'api', label: 'API Configuration', icon: Code2 },
          { id: 'orders', label: 'Customer Orders', icon: ShoppingBag },
          { id: 'customers', label: 'Registered Users', icon: Users },
          { id: 'deposits', label: 'Deposit Requests', icon: CreditCard, badge: 'UPI' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-yellow-400 text-black font-black shadow-lg shadow-yellow-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                    isActive ? 'bg-black text-yellow-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Timeframe selector */}
          <div className="flex items-center justify-between gap-2 p-1.5 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs font-bold max-w-xl">
            {['today', 'yesterday', '7days', '30days', 'all'].map((tf) => (
              <button
                key={tf}
                onClick={() => fetchStats(tf)}
                className={`flex-1 py-1.5 rounded-xl uppercase text-[10px] tracking-wider transition-all ${
                  timeframe === tf ? 'bg-yellow-400 text-black font-black shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tf === '7days' ? 'Last 7 Days' : tf === '30days' ? 'Last 30 Days' : tf}
              </button>
            ))}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Orders Count</span>
                <ShoppingBag className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono mt-2">{stats?.totalOrders ?? 0}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Placed on your panel</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Gross Customer Sales</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400 font-mono mt-2">
                ₹{Number(stats?.totalSales ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Customer payments</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Your Net Reseller Profit</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-2">
                ₹{Number(stats?.totalChildProfit ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold mt-1">100% Retained by you</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Registered Customers</span>
                <Users className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-black text-yellow-400 font-mono mt-2">{panelData?.totalUsersCount ?? 0}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Active users</div>
            </div>
          </div>

          {/* Quick Tips Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/30 text-sky-300 text-xs space-y-1">
            <div className="font-black text-sm text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>How Your White-Label Child Panel Operates</span>
            </div>
            <p className="text-[11px] text-zinc-300">
              1. Customize your panel's <strong>Branding & Logo</strong>. Your customers will see your name, your logo, and your theme.
              <br />
              2. Add your <strong>UPI QR & WhatsApp Number</strong>. Customer deposits will reach you directly.
              <br />
              3. Set your <strong>Profit Margin %</strong> in Pricing tab to automatically earn profit on every order placed!
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDING & WHITE-LABEL */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="space-y-6 max-w-3xl">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3">
            <Shield className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-black text-sm text-white">100% White-Label Isolation Guarantee</div>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                Any changes made to Panel Name, Logo, Favicon, Theme, or Colors here ONLY apply to your Child Panel. The Main Admin Panel is completely isolated and will never change.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-300 block mb-1">White-Label Panel Name *</label>
                <input
                  type="text"
                  required
                  value={brandingForm.panelName}
                  onChange={(e) => setBrandingForm({ ...brandingForm, panelName: e.target.value })}
                  placeholder="e.g. ABC Digital SMM"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400 text-sm font-bold"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Theme Palette</label>
                <select
                  value={brandingForm.theme}
                  onChange={(e) => setBrandingForm({ ...brandingForm, theme: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-yellow-400"
                >
                  <option value="cyberpunk-neon">Cyberpunk Neon</option>
                  <option value="emerald-luxury">Emerald Luxury</option>
                  <option value="royal-purple">Royal Purple</option>
                  <option value="sunset-amber">Sunset Amber</option>
                  <option value="ice-sapphire">Ice Sapphire</option>
                  <option value="clean-light">Clean Slate</option>
                  <option value="default-dark">Default Dark</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Custom Logo URL</label>
                <input
                  type="url"
                  value={brandingForm.logoUrl}
                  onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Custom Favicon URL</label>
                <input
                  type="url"
                  value={brandingForm.faviconUrl}
                  onChange={(e) => setBrandingForm({ ...brandingForm, faviconUrl: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Accent Highlight Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandingForm.accentColor || '#38bdf8'}
                    onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                    className="w-10 h-9 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandingForm.accentColor || '#38bdf8'}
                    onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Login Page Sub-Heading</label>
                <input
                  type="text"
                  value={brandingForm.loginTitle}
                  onChange={(e) => setBrandingForm({ ...brandingForm, loginTitle: e.target.value })}
                  placeholder="e.g. Best SMM Services Provider in India"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-300 block mb-1">Custom Footer Copyright Text</label>
              <input
                type="text"
                value={brandingForm.footerText}
                onChange={(e) => setBrandingForm({ ...brandingForm, footerText: e.target.value })}
                placeholder="e.g. © 2026 ABC Digital SMM. All rights reserved."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-yellow-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'SAVING...' : 'SAVE BRANDING'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: PRICING & PROFIT MARGINS */}
      {activeTab === 'pricing' && (
        <form onSubmit={handleSavePricing} className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-black text-white">Global Profit Margin Rate</h3>
                <p className="text-xs text-zinc-400">
                  Markup automatically added on top of Main Provider price for all services
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={pricingForm.defaultMarginPercent}
                  onChange={(e) => setPricingForm({ ...pricingForm, defaultMarginPercent: Number(e.target.value) })}
                  className="w-24 bg-zinc-900 border border-yellow-500/40 rounded-xl px-3 py-2 text-yellow-400 font-mono text-base font-bold text-center"
                />
                <span className="text-base font-black text-yellow-400">%</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              Example: If a service costs ₹100 from the provider, with a {pricingForm.defaultMarginPercent}% margin, your customer will pay ₹{100 + (100 * (pricingForm.defaultMarginPercent || 25)) / 100} and you earn ₹{(100 * (pricingForm.defaultMarginPercent || 25)) / 100} pure profit!
            </p>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'UPDATING...' : 'UPDATE MARGINS'}</span>
              </button>
            </div>
          </div>

          {/* Service Price Catalog Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white">Live Selling Prices with Your Margin</h4>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Service Name</th>
                      <th className="px-4 py-3">Base Cost</th>
                      <th className="px-4 py-3">Your Selling Price</th>
                      <th className="px-4 py-3">Your Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 font-medium">
                    {services.map((srv: any) => (
                      <tr key={srv.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-2.5 font-mono text-zinc-400">{srv.id}</td>
                        <td className="px-4 py-2.5 font-bold text-white max-w-sm truncate">{srv.name}</td>
                        <td className="px-4 py-2.5 font-mono text-zinc-400">₹{srv.originalRateINR || srv.rate}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-yellow-400">₹{srv.sellingRate}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">
                          +₹{srv.childOwnerProfitRate || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: PAYMENT & QR UPI */}
      {activeTab === 'payment' && (
        <form onSubmit={handleSavePayment} className="space-y-6 max-w-2xl">
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 text-xs font-semibold">
            <div className="pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white">Your Personal UPI Payment Gateway</h3>
              <p className="text-xs text-zinc-400">
                Customer deposit payments will be sent directly to your UPI account
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-300 block mb-1">Your UPI ID *</label>
                <input
                  type="text"
                  required
                  value={paymentForm.upiId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, upiId: e.target.value })}
                  placeholder="e.g. your_business@okaxis"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">UPI Merchant / Payee Name</label>
                <input
                  type="text"
                  value={paymentForm.upiName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, upiName: e.target.value })}
                  placeholder="e.g. ABC Digital Services"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Custom QR Code Image URL</label>
                <input
                  type="url"
                  value={paymentForm.qrCodeUrl}
                  onChange={(e) => setPaymentForm({ ...paymentForm, qrCodeUrl: e.target.value })}
                  placeholder="https://example.com/my-qr.png"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Minimum Deposit Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={paymentForm.minDepositINR}
                  onChange={(e) => setPaymentForm({ ...paymentForm, minDepositINR: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-yellow-400 font-mono font-bold focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Deposit Instructions for Customers</label>
                <textarea
                  rows={3}
                  value={paymentForm.depositInstructions}
                  onChange={(e) => setPaymentForm({ ...paymentForm, depositInstructions: e.target.value })}
                  placeholder="Scan QR with PhonePe, Paytm, or GPay. Enter UTR and click submit for instant balance credit."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'SAVING...' : 'SAVE UPI DETAILS'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: WHATSAPP & SUPPORT */}
      {activeTab === 'contact' && (
        <form onSubmit={handleSaveContact} className="space-y-6 max-w-2xl">
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 text-xs font-semibold">
            <div className="pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white">Your WhatsApp & Customer Support Channels</h3>
              <p className="text-xs text-zinc-400">
                Customer support clicks, payment receipts, and floating buttons will redirect to your numbers
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-300 block mb-1">Primary WhatsApp Number *</label>
                <input
                  type="text"
                  required
                  value={contactForm.whatsappNumber}
                  onChange={(e) => setContactForm({ ...contactForm, whatsappNumber: e.target.value })}
                  placeholder="e.g. 919876543210"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Support WhatsApp (for Payment UTR slips)</label>
                <input
                  type="text"
                  value={contactForm.supportWhatsapp}
                  onChange={(e) => setContactForm({ ...contactForm, supportWhatsapp: e.target.value })}
                  placeholder="e.g. 919876543210"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Telegram Support / Channel URL</label>
                <input
                  type="url"
                  value={contactForm.telegramUrl}
                  onChange={(e) => setContactForm({ ...contactForm, telegramUrl: e.target.value })}
                  placeholder="https://t.me/your_channel"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sky-400 font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Announcement Notice for Your Customers</label>
                <textarea
                  rows={3}
                  value={contactForm.customNotice}
                  onChange={(e) => setContactForm({ ...contactForm, customNotice: e.target.value })}
                  placeholder="🔥 Welcome to ABC Digital SMM! Fast 24/7 delivery on all Instagram & YouTube services."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'SAVING...' : 'SAVE CONTACT DETAILS'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 6: API CONFIGURATION (Option A / Option B) */}
      {activeTab === 'api' && (
        <form onSubmit={handleSaveApi} className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 text-xs font-semibold">
            <div className="pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white">SMM Order API Routing Mode</h3>
              <p className="text-xs text-zinc-400">
                Choose how orders placed on your Child Panel are fulfilled
              </p>
            </div>

            {/* Mode Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setApiForm({ ...apiForm, providerMode: 'main_admin' })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  apiForm.providerMode === 'main_admin'
                    ? 'bg-yellow-500/10 border-yellow-500 text-white shadow-lg'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-yellow-400">Option A: Main Admin Proxy</span>
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[9px] font-mono">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-2">
                  Zero setup needed! Orders placed by your customers are automatically proxied through the Main Admin platform and you earn instant profit margins.
                </p>
              </div>

              <div
                onClick={() => setApiForm({ ...apiForm, providerMode: 'custom_provider' })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  apiForm.providerMode === 'custom_provider'
                    ? 'bg-sky-500/10 border-sky-500 text-white shadow-lg'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-sky-400">Option B: Own SMM Provider</span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[9px] font-mono">
                    ADVANCED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-2">
                  Connect your own third-party SMM provider API key. Orders will be placed directly to your provider.
                </p>
              </div>
            </div>

            {/* Custom API Credentials if Option B */}
            {apiForm.providerMode === 'custom_provider' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-sky-500/30 space-y-3">
                <div className="text-xs font-black text-sky-400 uppercase tracking-wide">
                  Custom SMM Provider API Credentials
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Provider API URL *</label>
                  <input
                    type="url"
                    value={apiForm.customApiUrl}
                    onChange={(e) => setApiForm({ ...apiForm, customApiUrl: e.target.value })}
                    placeholder="https://provider-domain.com/api/v2"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Provider API Key *</label>
                  <input
                    type="text"
                    value={apiForm.customApiKey}
                    onChange={(e) => setApiForm({ ...apiForm, customApiKey: e.target.value })}
                    placeholder="Enter your secret provider API Key"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestCustomApi}
                    disabled={apiTesting}
                    className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${apiTesting ? 'animate-spin' : ''}`} />
                    <span>{apiTesting ? 'TESTING...' : 'TEST API CONNECTION'}</span>
                  </button>

                  {apiTestResult && (
                    <span className={`text-xs font-bold ${apiTestResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {apiTestResult.success ? `Connected! Balance: ${apiTestResult.balance}` : apiTestResult.error}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'SAVING...' : 'SAVE API SETTINGS'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 7: CUSTOMER ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Orders Placed by Your Customers ({orders.length})</h3>
            <button
              onClick={fetchTabLists}
              className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Link</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Selling Price</th>
                    <th className="px-4 py-3">Your Profit</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-medium">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                        No orders recorded on your child panel yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-2.5 font-mono font-bold text-yellow-400">{ord.id}</td>
                        <td className="px-4 py-2.5 font-bold text-white">{ord.userName || ord.userId}</td>
                        <td className="px-4 py-2.5 truncate max-w-xs text-zinc-300">{ord.serviceName}</td>
                        <td className="px-4 py-2.5 font-mono text-zinc-400 truncate max-w-xs">{ord.link}</td>
                        <td className="px-4 py-2.5 font-mono text-zinc-300">{ord.quantity}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-yellow-400">₹{ord.sellingPrice}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">+₹{ord.childOwnerProfit || 0}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-zinc-800 text-zinc-300">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Registered Customers ({users.length})</h3>
            <button onClick={fetchTabLists} className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {users.length === 0 ? (
              <div className="col-span-3 text-center text-zinc-500 py-12">
                No users have signed up on your child panel yet.
              </div>
            ) : (
              users.map((u: any) => (
                <div key={u.id} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{u.username}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{u.email}</div>
                    {u.whatsappNo && <div className="text-[10px] text-emerald-400 font-mono">WA: +{u.whatsappNo}</div>}
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-yellow-400 font-black text-base">₹{(u.balance || 0).toFixed(2)}</div>
                    <div className="text-[9px] text-zinc-500">Balance</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 9: DEPOSITS */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Customer UPI Deposit Requests ({deposits.length})</h3>
            <button onClick={fetchTabLists} className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Amount (₹)</th>
                    <th className="px-4 py-3">UTR / Ref No</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-medium">
                  {deposits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                        No deposit requests found.
                      </td>
                    </tr>
                  ) : (
                    deposits.map((dep: any) => (
                      <tr key={dep.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-2.5 font-bold text-white">{dep.username}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-yellow-400 text-sm">₹{dep.amount}</td>
                        <td className="px-4 py-2.5 font-mono text-sky-400">{dep.utr}</td>
                        <td className="px-4 py-2.5 text-zinc-400 font-mono text-[10px]">
                          {new Date(dep.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              dep.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : dep.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}
                          >
                            {dep.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {dep.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveDeposit(dep.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(dep.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 font-bold text-[10px]"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
